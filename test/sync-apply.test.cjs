"use strict";

// applyPlan 整合測試：真 planSync＋暫存 gameDir＋本機 HTTP。
// 案例清單的權威＝_notes/plans/instance-sync-v3.md §commit ③a-2 §測試案例 ＋ commit3a2.md §測試。

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { startServer, serveWithRange } = require("./helpers/local-http.cjs");
const {
  useMockClock,
  until,
  watch,
  stillPending,
} = require("./helpers/mock-clock.cjs");
const { snapshot } = require("./helpers/fs-snapshot.cjs");
const { getPaths } = require("../lib/paths-layout.js");
const { planSync } = require("../lib/sync/plan.js");
const { linkCheckPaths } = require("../lib/sync/blocking.js");
const { hashFile } = require("../main/fs-utils.js");
const {
  readRecord,
  isInProgress,
  writeRecord,
} = require("../main/sync/instance-record.js");
const { configureNetFetch, downloadToFileWithStallGuard } = require("../main/net-fetch.js");
const { applyPlan, SyncApplyError } = require("../main/sync/apply.js");
const { prepareRuntime } = require("../main/runtime/prepare.js");
const { registerInstanceIpc } = require("../main/ipc/instance-ipc.js");
const { linkMessage } = require("../lib/fs-links.js");
const { windowsEnv } = require("../lib/launch-args.js");
const { startFakeRuntime, MC, LOADER } = require("./helpers/fake-runtime.cjs");

const HANG_LIMIT_MS = 10_000;
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const A = Buffer.from("mod A ".repeat(200));
const B = Buffer.from("mod B ".repeat(300));
const C = Buffer.from("config C ".repeat(50));
const blobs = new Map([A, B, C].map((b) => [sha(b), b]));
const entry = (p, buf) => ({ path: p, sha256: sha(buf), size: buf.length });
// ④c 起 prepareRuntime 回三欄、併進記錄（→ _notes/plans/instance-sync-v3-commit4c.md §設計「同步端」）
const RUNTIME = () => ({ minecraft: "1.21.11", loader: { type: "fabric", version: "0.19.3" }, javaMajor: 21 });

/**
 * 每個測試一個乾淨的根目錄與站台；behave(req, res, shaHex, n) 可覆寫單一 blob 的回法。
 * linkedRoot：安裝位置是 <root>/link，它是指向 <root>/real 的 junction（Windows 才用）
 */
async function setup(t, { behave, linkedRoot = false } = {}) {
  // 下載的看門狗只有 300 ms（deps()）：時間交給 mock 時鐘，正常的下載不會被判停滯；
  // 停住是預期結果的案用 ctx.clock 推進（→ _notes/plans/test-real-clock.md）
  const clock = useMockClock(t);
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-apply-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  let launcherRootDir = root;
  if (linkedRoot) {
    await fsp.mkdir(path.join(root, "real"));
    launcherRootDir = path.join(root, "link");
    await fsp.symlink(path.join(root, "real"), launcherRootDir, "junction");
  }
  const paths = getPaths({ launcherRootDir });
  await fsp.mkdir(paths.gameDir, { recursive: true });
  const perSha = new Map();
  const srv = await startServer((req, res) => {
    const m = /^\/files\/([0-9a-f]{64})$/.exec(req.url);
    const body = m && blobs.get(m[1]);
    if (!body) {
      res.writeHead(404);
      res.end();
      return;
    }
    const n = (perSha.get(m[1]) ?? 0) + 1;
    perSha.set(m[1], n);
    if (behave && behave(req, res, m[1], n)) return;
    serveWithRange(req, res, body);
  });
  t.after(() => srv.close());
  const blobRequests = (buf) =>
    srv.requests.filter((r) => r.url === `/files/${sha(buf)}`);
  return { root, paths, srv, blobRequests, clock, filesBaseUrl: `${srv.url}/files/` };
}

const abs = (paths, rel) => path.join(paths.gameDir, ...rel.split("/"));
async function put(paths, rel, content) {
  await fsp.mkdir(path.dirname(abs(paths, rel)), { recursive: true });
  await fsp.writeFile(abs(paths, rel), content);
}
const read = (paths, rel) => fsp.readFile(abs(paths, rel));
const exists = (p) =>
  fsp.lstat(p).then(
    () => true,
    () => false,
  );

async function plan(paths, { previous = null, next }) {
  return planSync({
    previous,
    next,
    gameDir: paths.gameDir,
    // ③b 的真探針要同樣處理：路徑上是資料夾 ⇒ 存在、但 hash 回 null（拿資料夾去 hash 會丟 EISDIR，
    // 整個同步崩掉）；計畫因此列成下載，交給擋路檢查（→ commit3a2.md §上層沒列 8）
    probe: {
      exists: (rel) => exists(abs(paths, rel)),
      sha256: async (rel) =>
        (await fsp.lstat(abs(paths, rel))).isFile()
          ? hashFile(abs(paths, rel), "sha256")
          : null,
    },
    playerEditable: [],
    protectedPaths: [],
    verifyAll: false,
  });
}

const recordFor = (next, version = "v2") => ({
  format: 3,
  version,
  files: next.map(({ path: p, sha256 }) => ({ path: p, sha256 })),
});

/** 預設 deps：看門狗期限縮短；其他照真的，個別測試覆寫 */
function deps(extra = {}) {
  const progress = [];
  return {
    progress,
    prepareRuntime: async () => RUNTIME(),
    download: (url, target, onChunk, opts) =>
      downloadToFileWithStallGuard(url, target, onChunk, {
        ...opts,
        windowMs: 300,
        minBytes: 100,
      }),
    fetchReleaseFiles: async () => null,
    sendSyncProgress: (p) => progress.push(p),
    now: () => new Date(2026, 8, 30, 14, 30, 0),
    ...extra,
  };
}

async function run(ctx, { previous = null, next, depsOverride = {}, record }) {
  const p = await plan(ctx.paths, { previous, next });
  const d = deps(depsOverride);
  const result = await applyPlan({
    plan: p,
    record: record ?? recordFor(next),
    paths: ctx.paths,
    filesBaseUrl: ctx.filesBaseUrl,
    deps: d,
  });
  return { result, deps: d, plan: p };
}

const stagingDir = (paths) => path.join(paths.tempDir, "sync-staging");
const listStaging = (paths) => fsp.readdir(stagingDir(paths)).catch(() => []);

// ── 成功路徑 ──

test("success: files placed, record written, marker cleared, staging removed", async (t) => {
  const ctx = await setup(t);
  const next = [entry("mods/a.jar", A), entry("config/c.toml", C)];
  const { result } = await run(ctx, { next });

  assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
  assert.deepEqual(await read(ctx.paths, "config/c.toml"), C);
  const rec = await readRecord(ctx.paths);
  assert.deepEqual(rec.files, recordFor(next).files);
  assert.equal(rec.version, "v2");
  assert.equal(rec.appliedAt, new Date(2026, 8, 30, 14, 30, 0).toISOString());
  assert.equal(await isInProgress(ctx.paths), false);
  assert.equal(await exists(stagingDir(ctx.paths)), false);
  assert.deepEqual(result, { movedAside: [], record: rec });
});

test("C4 寫入的記錄帶 prepareRuntime 的三欄；回傳值多帶的 files／version 不准蓋掉記錄", async (t) => {
  const ctx = await setup(t);
  const next = [entry("mods/a.jar", A)];
  await run(ctx, {
    next,
    depsOverride: { prepareRuntime: async () => ({ ...RUNTIME(), files: [], version: "x" }) },
  });
  const rec = await readRecord(ctx.paths);
  assert.deepEqual(
    { minecraft: rec.minecraft, loader: rec.loader, javaMajor: rec.javaMajor },
    RUNTIME(),
  );
  assert.deepEqual(rec.files, recordFor(next).files);
  assert.equal(rec.version, "v2");
});

test("C4 prepareRuntime 回傳值不合法 ⇒ 丟錯、標記留著，下載／改名／刪除／寫記錄一次都沒有", async (t) => {
  const bad = [
    undefined,
    { ...RUNTIME(), minecraft: undefined },
    { ...RUNTIME(), loader: undefined },
    { ...RUNTIME(), javaMajor: undefined },
    { ...RUNTIME(), javaMajor: "21" },
    { ...RUNTIME(), loader: { type: "forge", version: "1" } },
  ];
  for (const value of bad) {
    const ctx = await setup(t);
    await put(ctx.paths, "mods/old.jar", "old");
    const count = { download: 0, rename: 0, rm: 0, unlink: 0, writeRecord: 0 };
    const spyFsp = {
      ...fsp,
      rename: async (...a) => (count.rename++, fsp.rename(...a)),
      rm: async (...a) => (count.rm++, fsp.rm(...a)),
      unlink: async (...a) => (count.unlink++, fsp.unlink(...a)),
    };
    await assert.rejects(
      run(ctx, {
        previous: [{ path: "mods/old.jar", sha256: "0".repeat(64) }],
        next: [entry("mods/a.jar", A)],
        depsOverride: {
          // 開頭清殘留本來就會 rm：只算 prepareRuntime 回來之後的
          prepareRuntime: async () => {
            for (const k of Object.keys(count)) count[k] = 0;
            return value;
          },
          download: async () => {
            count.download++;
          },
          writeRecord: async () => {
            count.writeRecord++;
          },
          fsp: spyFsp,
        },
      }),
      /runtime 回傳值不合法/,
      JSON.stringify(value),
    );
    assert.deepEqual(count, { download: 0, rename: 0, rm: 0, unlink: 0, writeRecord: 0 }, JSON.stringify(value));
    assert.equal(await isInProgress(ctx.paths), true);
    assert.equal(await exists(abs(ctx.paths, "mods/old.jar")), true);
  }
});

test("prepareRuntime is called while the in-progress marker exists", async (t) => {
  const ctx = await setup(t);
  let markerSeen = null;
  await run(ctx, {
    next: [entry("mods/a.jar", A)],
    depsOverride: {
      prepareRuntime: async () => {
        markerSeen = await isInProgress(ctx.paths);
        return RUNTIME();
      },
    },
  });
  assert.equal(markerSeen, true);
});

test("prepareRuntime throws ⇒ marker stays, no download, no record, error propagates", async (t) => {
  const ctx = await setup(t);
  const boom = new Error("java failed");
  await assert.rejects(
    run(ctx, {
      next: [entry("mods/a.jar", A)],
      depsOverride: {
        prepareRuntime: async () => {
          throw boom;
        },
      },
    }),
    (e) => e === boom,
  );
  assert.equal(await isInProgress(ctx.paths), true);
  assert.equal(ctx.srv.requests.length, 0);
  assert.equal(await readRecord(ctx.paths), null);
});

test("player files outside the list survive an update", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/player.jar", "mine");
  await run(ctx, { next: [entry("mods/a.jar", A)] });
  assert.equal(String(await read(ctx.paths, "mods/player.jar")), "mine");
});

test("case-only rename: readdir shows exactly foo.jar afterwards", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/Foo.jar", A);
  await run(ctx, {
    previous: [{ path: "mods/Foo.jar", sha256: sha(A) }],
    next: [entry("mods/foo.jar", A)],
  });
  assert.deepEqual(await fsp.readdir(abs(ctx.paths, "mods")), ["foo.jar"]);
});

test("progress: download events count files 1..N and end at totalBytes", async (t) => {
  const ctx = await setup(t);
  const next = [entry("mods/a.jar", A), entry("mods/b.jar", B)];
  const { deps: d } = await run(ctx, { next });
  const dl = d.progress.filter((p) => p.phase === "download");
  assert.deepEqual([...new Set(dl.map((p) => p.fileIndex))], [1, 2]);
  assert.ok(
    dl.every((p) => p.fileCount === 2 && p.totalBytes === A.length + B.length),
  );
  assert.equal(dl.at(-1).totalReceived, A.length + B.length);
  assert.ok(d.progress.some((p) => p.phase === "apply"));
});

// ── 下載失敗 ──

test("the Nth download fails ⇒ destination untouched, no record, marker stays", async (t) => {
  // 403：不重試。5xx 會等 650 ms 再試，那段空窗在縮短的看門狗窗口（300 ms）下會先被判停滯
  const ctx = await setup(t, {
    behave: (req, res, h) =>
      h === sha(B) && (res.writeHead(403), res.end(), true),
  });
  await assert.rejects(
    run(ctx, { next: [entry("mods/a.jar", A), entry("mods/b.jar", B)] }),
    /HTTP 403/,
  );
  assert.equal(await exists(abs(ctx.paths, "mods/a.jar")), false);
  assert.equal(await readRecord(ctx.paths), null);
  assert.equal(await isInProgress(ctx.paths), true);
});

test("404 and the release changed meanwhile ⇒ GGL_SYNC_SITE_CHANGED", async (t) => {
  const ctx = await setup(t);
  const ghost = { path: "mods/ghost.jar", sha256: "f".repeat(64), size: 3 };
  await assert.rejects(
    run(ctx, {
      next: [ghost],
      depsOverride: {
        fetchReleaseFiles: async () => [
          { path: "mods/new.jar", sha256: "e".repeat(64) },
        ],
      },
    }),
    (e) =>
      e instanceof SyncApplyError &&
      e.code === "GGL_SYNC_SITE_CHANGED" &&
      /站台已更新/.test(e.message),
  );
});

test("404 and the release is unchanged ⇒ the original 404 error, not SITE_CHANGED", async (t) => {
  const ctx = await setup(t);
  const ghost = { path: "mods/ghost.jar", sha256: "f".repeat(64), size: 3 };
  await assert.rejects(
    run(ctx, {
      next: [ghost],
      depsOverride: {
        fetchReleaseFiles: async () => [
          { path: ghost.path, sha256: ghost.sha256 },
        ],
      },
    }),
    (e) => e.code !== "GGL_SYNC_SITE_CHANGED" && /HTTP 404/.test(e.message),
  );
});

for (const [label, wrong] of [
  ["same length", Buffer.from("X".repeat(A.length))],
  ["shorter", Buffer.from("short")],
]) {
  test(`wrong content (${label}) ⇒ HASH_MISMATCH, destination untouched; fixed server ⇒ next run succeeds, no staging residue`, async (t) => {
    let broken = true;
    const ctx = await setup(t, {
      behave: (req, res) => {
        if (!broken) return false;
        res.writeHead(200, { "content-length": String(wrong.length) });
        res.end(wrong);
        return true;
      },
    });
    const next = [entry("mods/a.jar", A)];
    await assert.rejects(run(ctx, { next }), {
      code: "GGL_SYNC_HASH_MISMATCH",
    });
    assert.equal(await exists(abs(ctx.paths, "mods/a.jar")), false);
    assert.deepEqual(await listStaging(ctx.paths), []); // 錯的完成檔已刪，也沒有 .part 可被接續

    broken = false;
    await run(ctx, { next });
    assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
    assert.equal(ctx.blobRequests(A).at(-1).headers.range, undefined);
    assert.equal(await exists(stagingDir(ctx.paths)), false);
  });
}

test(
  "download stalls after headers ⇒ fails when the second window passes, not before; marker stays, destination untouched",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const ctx = await setup(t, {
      behave: (req, res) => {
        res.writeHead(200, { "content-length": String(A.length) });
        res.write(A.subarray(0, 10));
        return true;
      },
    });
    const p = run(ctx, { next: [entry("mods/a.jar", A)] });
    const w = watch(p);
    // 看門狗停滯會重試一次：兩次嘗試各等請求到了才推進一個窗口
    await until(() => ctx.blobRequests(A).length === 1, "第一次請求送達");
    ctx.clock.advance(300);
    await until(() => ctx.blobRequests(A).length === 2, "停滯重試的請求送達");
    ctx.clock.advance(299);
    assert.ok(await stillPending(w), "第二個窗口到之前不該結束");
    ctx.clock.advance(1);
    await assert.rejects(p, { code: "GGL_DOWNLOAD_STALLED" });
    assert.equal(await isInProgress(ctx.paths), true);
    assert.equal(await exists(abs(ctx.paths, "mods/a.jar")), false);
  },
);

test(
  "interrupted download ⇒ the next run resumes with Range and ends with the right hash",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const half = Math.floor(A.length / 2);
    const ctx = await setup(t, {
      behave: (req, res, h, n) => {
        if (n > 2) return false; // 第一次執行（含一次停滯重試）都送一半就停
        res.writeHead(200, { "content-length": String(A.length) });
        res.write(A.subarray(0, half));
        return true;
      },
    });
    const next = [entry("mods/a.jar", A)];
    // 每次嘗試收到前一半之後才推進一個窗口：第二次執行才有 .part 可以續傳
    let halves = 0;
    const first = run(ctx, {
      next,
      depsOverride: {
        sendSyncProgress: (x) => {
          if (x.phase === "download" && x.fileReceived === half) halves++;
        },
      },
    });
    // 前一半（600 bytes）≥ minBytes 100：第一個窗口算有進度、不停；第二個窗口沒進度才判停滯 ⇒ 每次推進兩個窗口，
    // 一次一個窗口（一次推 600 看門狗只看得到一次，不會中止）
    await until(() => halves === 1, "第一次嘗試收到前一半");
    ctx.clock.advance(300);
    ctx.clock.advance(300);
    await until(() => halves === 2, "停滯重試也收到前一半");
    ctx.clock.advance(300);
    ctx.clock.advance(300);
    await assert.rejects(first, { code: "GGL_DOWNLOAD_STALLED" });
    await run(ctx, { next });
    assert.equal(ctx.blobRequests(A).at(-1).headers.range, `bytes=${half}-`);
    assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
  },
);

// ── staging 既有檔 ──

async function stage(ctx, name, content) {
  await fsp.mkdir(stagingDir(ctx.paths), { recursive: true });
  await fsp.writeFile(path.join(stagingDir(ctx.paths), name), content);
}

test("a completed staged file with the right hash is not downloaded again", async (t) => {
  const ctx = await setup(t);
  await stage(ctx, sha(A), A);
  await run(ctx, { next: [entry("mods/a.jar", A)] });
  assert.equal(ctx.blobRequests(A).length, 0);
  assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
});

test(".part equal to the expected size and correct ⇒ no request, applied", async (t) => {
  const ctx = await setup(t);
  await stage(ctx, `${sha(A)}.part`, A);
  await run(ctx, { next: [entry("mods/a.jar", A)] });
  assert.equal(ctx.blobRequests(A).length, 0);
  assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
});

test(".part equal to the expected size but wrong ⇒ discarded, downloaded again, right in the end", async (t) => {
  const ctx = await setup(t);
  await stage(ctx, `${sha(A)}.part`, Buffer.from("X".repeat(A.length)));
  await run(ctx, { next: [entry("mods/a.jar", A)] });
  assert.equal(ctx.blobRequests(A).length, 1);
  assert.equal(ctx.blobRequests(A)[0].headers.range, undefined);
  assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
});

test(".part larger than expected ⇒ downloaded again from 0", async (t) => {
  const ctx = await setup(t);
  await stage(ctx, `${sha(A)}.part`, Buffer.concat([A, Buffer.from("junk")]));
  await run(ctx, { next: [entry("mods/a.jar", A)] });
  assert.equal(ctx.blobRequests(A)[0].headers.range, undefined);
  assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
});

test("stale staging entries (not in this plan) are cleared at the start", async (t) => {
  const ctx = await setup(t);
  await stage(ctx, "d".repeat(64), "old");
  await stage(ctx, `${"e".repeat(64)}.part`, "old");
  let seen = null;
  await run(ctx, {
    next: [entry("mods/a.jar", A)],
    depsOverride: {
      prepareRuntime: async () => {
        seen = await listStaging(ctx.paths);
        return RUNTIME();
      },
    },
  });
  assert.deepEqual(seen, []);
});

// ── 交易失敗點 ──

test("replacement fails on the 2nd file ⇒ no record; rerun succeeds, nothing downloaded twice, no .ggl-tmp left", async (t) => {
  const ctx = await setup(t);
  const next = [entry("mods/a.jar", A), entry("mods/b.jar", B)];
  let renames = 0;
  const flaky = {
    ...fsp,
    rename: async (from, to) => {
      if (to.endsWith("b.jar") && ++renames === 1)
        throw Object.assign(new Error("EPERM (test)"), { code: "EPERM" });
      return fsp.rename(from, to);
    },
  };
  await assert.rejects(
    run(ctx, { next, depsOverride: { fsp: flaky } }),
    /EPERM/,
  );
  assert.equal(await readRecord(ctx.paths), null);

  await run(ctx, { next });
  assert.equal(ctx.blobRequests(A).length, 1);
  assert.equal(ctx.blobRequests(B).length, 1);
  assert.deepEqual((await fsp.readdir(abs(ctx.paths, "mods"))).sort(), [
    "a.jar",
    "b.jar",
  ]);
});

test("leftover cleanup only touches .<name>.ggl-tmp where <name> is in next", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/.a.jar.ggl-tmp", "leftover");
  await put(ctx.paths, "mods/notes.ggl-tmp", "player");
  await put(ctx.paths, "saves/x/.a.ggl-tmp", "player");
  let seen = null;
  await run(ctx, {
    next: [entry("mods/a.jar", A)],
    depsOverride: {
      prepareRuntime: async () => {
        seen = await exists(abs(ctx.paths, "mods/.a.jar.ggl-tmp"));
        return RUNTIME();
      },
    },
  });
  assert.equal(seen, false); // 開頭就清掉了
  assert.equal(await exists(abs(ctx.paths, "mods/notes.ggl-tmp")), true);
  assert.equal(await exists(abs(ctx.paths, "saves/x/.a.ggl-tmp")), true);
});

test("delete step: target is a directory ⇒ GGL_SYNC_DELETE_IS_DIR, not deleted", async (t) => {
  const ctx = await setup(t);
  await fsp.mkdir(abs(ctx.paths, "mods/old.jar"), { recursive: true });
  await put(ctx.paths, "mods/old.jar/inside", "x");
  await assert.rejects(
    run(ctx, {
      previous: [{ path: "mods/old.jar", sha256: "1".repeat(64) }],
      next: [entry("mods/a.jar", A)],
    }),
    { code: "GGL_SYNC_DELETE_IS_DIR" },
  );
  assert.equal(await exists(abs(ctx.paths, "mods/old.jar/inside")), true);
  assert.equal(await readRecord(ctx.paths), null);
});

test("delete step: target already gone ⇒ treated as success", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/old.jar", "x");
  const next = [entry("mods/a.jar", A)];
  const p = await plan(ctx.paths, {
    previous: [{ path: "mods/old.jar", sha256: "1".repeat(64) }],
    next,
  });
  await fsp.rm(abs(ctx.paths, "mods/old.jar"));
  await applyPlan({
    plan: p,
    record: recordFor(next),
    paths: ctx.paths,
    filesBaseUrl: ctx.filesBaseUrl,
    deps: deps(),
  });
  assert.notEqual(await readRecord(ctx.paths), null);
});

test("writing the record fails ⇒ marker stays, error propagates", async (t) => {
  const ctx = await setup(t);
  const boom = new Error("disk full (test)");
  await assert.rejects(
    run(ctx, {
      next: [entry("mods/a.jar", A)],
      depsOverride: {
        writeRecord: async () => {
          throw boom;
        },
      },
    }),
    (e) => e === boom,
  );
  assert.equal(await isInProgress(ctx.paths), true);
});

test("clearing the marker fails after the record is written ⇒ still success", async (t) => {
  const ctx = await setup(t);
  await run(ctx, {
    next: [entry("mods/a.jar", A)],
    depsOverride: {
      clearInProgress: async () => {
        throw new Error("EBUSY (test)");
      },
    },
  });
  assert.notEqual(await readRecord(ctx.paths), null);
  assert.equal(await isInProgress(ctx.paths), true); // 留給下一次開頭清
});

// ── 擋路（A＋） ──

test("removeFirst file → folder: old file deleted, new folder created", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/extra", "old file");
  await run(ctx, {
    previous: [{ path: "mods/extra", sha256: sha(Buffer.from("old file")) }],
    next: [entry("mods/extra/a.jar", A)],
  });
  assert.deepEqual(await read(ctx.paths, "mods/extra/a.jar"), A);
});

test("removeFirst folder → file: folder emptied and removed, file placed", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/extra/a.jar", A);
  await run(ctx, {
    previous: [{ path: "mods/extra/a.jar", sha256: sha(A) }],
    next: [entry("mods/extra", B)],
  });
  assert.deepEqual(await read(ctx.paths, "mods/extra"), B);
});

test("removeFirst folder holding a file outside the list ⇒ BLOCKED_DIR_NOT_EMPTY, nothing touched", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/extra/a.jar", A);
  await put(ctx.paths, "mods/extra/mine.txt", "player");
  await assert.rejects(
    run(ctx, {
      previous: [{ path: "mods/extra/a.jar", sha256: sha(A) }],
      next: [entry("mods/extra", B)],
    }),
    (e) =>
      e.code === "GGL_SYNC_BLOCKED_DIR_NOT_EMPTY" &&
      e.message.includes("mods/extra/mine.txt"),
  );
  assert.deepEqual(await read(ctx.paths, "mods/extra/a.jar"), A); // removeFirst 也沒刪
  assert.equal(await readRecord(ctx.paths), null);
});

for (const [label, previous] of [
  ["with a record", [{ path: "mods/a.jar", sha256: sha(A) }]],
  ["without a record", null],
]) {
  test(`record-external file where a folder is needed (${label}) ⇒ moved aside intact, update succeeds`, async (t) => {
    const ctx = await setup(t);
    if (previous) await put(ctx.paths, "mods/a.jar", A);
    await put(ctx.paths, "Config", "player stuff"); // 大寫：備份名要用本機實際寫法
    const { result } = await run(ctx, {
      previous,
      next: [entry("mods/a.jar", A), entry("config/c.toml", C)],
    });

    assert.deepEqual(result.movedAside, [
      { from: "Config", to: "Config.ggl-備份-20260930-143000" },
    ]);
    assert.equal(
      String(await read(ctx.paths, "Config.ggl-備份-20260930-143000")),
      "player stuff",
    );
    assert.deepEqual(await read(ctx.paths, "config/c.toml"), C);
  });
}

test("backup name already taken ⇒ -2, the existing backup untouched", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "config", "new stray");
  await put(ctx.paths, "config.ggl-備份-20260930-143000", "older backup");
  const { result } = await run(ctx, { next: [entry("config/c.toml", C)] });
  assert.deepEqual(result.movedAside, [
    { from: "config", to: "config.ggl-備份-20260930-143000-2" },
  ]);
  assert.equal(
    String(await read(ctx.paths, "config.ggl-備份-20260930-143000")),
    "older backup",
  );
});

test("record-external folder where a file is needed ⇒ BLOCKED_BY_DIR, nothing touched", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "options.txt/keep", "player");
  await assert.rejects(
    run(ctx, { next: [entry("mods/a.jar", A), entry("options.txt", C)] }),
    (e) =>
      e.code === "GGL_SYNC_BLOCKED_BY_DIR" && e.message.includes("options.txt"),
  );
  assert.equal(await exists(abs(ctx.paths, "mods/a.jar")), false);
  assert.equal(await exists(abs(ctx.paths, "options.txt/keep")), true);
});

test("blocked ⇒ nothing moved aside either (the check runs before any change)", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "config", "stray file");
  await put(ctx.paths, "options.txt/keep", "player");
  await assert.rejects(
    run(ctx, { next: [entry("config/c.toml", C), entry("options.txt", A)] }),
    {
      code: "GGL_SYNC_BLOCKED_BY_DIR",
    },
  );
  assert.equal(String(await read(ctx.paths, "config")), "stray file");
});

test("record written by writeRecord is the injected one (deps default wiring)", async (t) => {
  const ctx = await setup(t);
  let got = null;
  await run(ctx, {
    next: [entry("mods/a.jar", A)],
    depsOverride: {
      writeRecord: async (p, r, o) => ((got = r), writeRecord(p, r, o)),
    },
  });
  assert.equal(got.format, 3);
  assert.equal(typeof got.appliedAt, "string");
});

test("backup name taken with different letter case ⇒ still -2 (NTFS rename would overwrite it)", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "config", "new stray");
  await put(ctx.paths, "Config.ggl-備份-20260930-143000", "older backup");
  const { result } = await run(ctx, { next: [entry("config/c.toml", C)] });
  assert.deepEqual(result.movedAside, [
    { from: "config", to: "config.ggl-備份-20260930-143000-2" },
  ]);
  assert.equal(
    String(await read(ctx.paths, "Config.ggl-備份-20260930-143000")),
    "older backup",
  );
});

// ── 真 junction（Windows；不需要管理員權限，2026-09-30 實測） ──

const onWindows = process.platform === "win32";

async function junctionTo(ctx, rel) {
  const outside = path.join(ctx.root, "outside");
  await fsp.mkdir(outside, { recursive: true });
  await fsp.writeFile(path.join(outside, "precious.txt"), "keep me");
  await fsp.mkdir(path.dirname(abs(ctx.paths, rel)), { recursive: true });
  await fsp.symlink(outside, abs(ctx.paths, rel), "junction");
  return path.join(outside, "precious.txt");
}

test(
  "real junction where a folder is needed ⇒ BLOCKED_BY_LINK, nothing touched",
  { skip: !onWindows },
  async (t) => {
    const ctx = await setup(t);
    const precious = await junctionTo(ctx, "config");
    await assert.rejects(run(ctx, { next: [entry("config/c.toml", C)] }), {
      code: "GGL_SYNC_BLOCKED_BY_LINK",
    });
    assert.equal(
      (await fsp.lstat(abs(ctx.paths, "config"))).isSymbolicLink(),
      true,
    );
    assert.equal(String(await fsp.readFile(precious)), "keep me");
  },
);

test(
  "real junction inside a removeFirst folder, listed in the record ⇒ BLOCKED_BY_LINK, nothing touched",
  { skip: !onWindows },
  async (t) => {
    const ctx = await setup(t);
    await put(ctx.paths, "mods/extra/a.jar", A);
    const precious = await junctionTo(ctx, "mods/extra/link");
    await assert.rejects(
      run(ctx, {
        previous: [
          { path: "mods/extra/a.jar", sha256: sha(A) },
          { path: "mods/extra/link", sha256: "1".repeat(64) },
        ],
        next: [entry("mods/extra", B)],
      }),
      (e) =>
        e.code === "GGL_SYNC_BLOCKED_BY_LINK" && e.path === "mods/extra/link",
    );
    assert.deepEqual(await read(ctx.paths, "mods/extra/a.jar"), A);
    assert.equal(String(await fsp.readFile(precious)), "keep me");
  },
);

// ── 連結封口 1a（→ _notes/plans/cross-review-2026-10-phase1.md §測試「1a 整合」L1–L18） ──

/** 把 p 換成指向 <root>/outside 的 junction：p 原有的內容整個搬進 outside（同上層 §5.13 的做法），另放一個 precious.txt */
async function linkAt(ctx, p) {
  const outside = path.join(ctx.root, "outside");
  if (await exists(p)) await fsp.rename(p, outside);
  await fsp.mkdir(outside, { recursive: true });
  await fsp.writeFile(path.join(outside, "precious.txt"), "keep me");
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.symlink(outside, p, "junction");
  return outside;
}

const readOrNull = (p) => fsp.readFile(p).catch(() => null);

/** 計次的 prepareRuntime／download；onDownload 在每次下載真的開始前執行 */
function countingDeps({ onDownload } = {}) {
  const counts = { prepareRuntime: 0, download: 0 };
  const realDownload = deps().download;
  return {
    counts,
    override: {
      prepareRuntime: async () => {
        counts.prepareRuntime++;
        return RUNTIME();
      },
      download: async (...args) => {
        counts.download++;
        await onDownload?.(counts.download);
        return realDownload(...args);
      },
    },
  };
}

/**
 * 每個拒絕案的共同斷言（§測試「每案共同斷言」＋擋在哪個檢查點）。
 * 舊記錄先放一份，比對它的位元組沒變。
 */
async function expectRefused(ctx, { outside, runArgs, onDownload, path: wantPath, where, checkpoint }) {
  const before = await snapshot(outside);
  const recordBefore = await readOrNull(ctx.paths.syncRecordPath);
  const c = countingDeps({ onDownload });
  await assert.rejects(run(ctx, { ...runArgs, depsOverride: c.override }), (e) => {
    assert.equal(e.code, "GGL_SYNC_BLOCKED_BY_LINK");
    assert.equal(e.path, wantPath);
    assert.equal(e.where, where);
    assert.ok(e.message.includes(e.path), e.message);
    return true;
  });
  assert.deepEqual(await snapshot(outside), before, "外部不得有任何變化");
  assert.deepEqual(await readOrNull(ctx.paths.syncRecordPath), recordBefore);
  if (checkpoint === 1) {
    assert.equal(await exists(ctx.paths.syncInProgressPath), false);
    assert.deepEqual(c.counts, { prepareRuntime: 0, download: 0 });
  } else {
    assert.equal(await exists(ctx.paths.syncInProgressPath), true);
    assert.equal(c.counts.prepareRuntime, 1);
  }
}

const seedRecord = (ctx) =>
  fsp.writeFile(ctx.paths.syncRecordPath, "previous record bytes");

const mods = (ctx) => abs(ctx.paths, "mods");

for (const [id, label, opts, arrange, runArgs, want] of [
  [
    "L1", "mods/ is a junction, the record's old.jar must be deleted", {},
    async (ctx) => {
      await put(ctx.paths, "mods/old.jar", A);
      return linkAt(ctx, mods(ctx));
    },
    { previous: [{ path: "mods/old.jar", sha256: sha(A) }], next: [entry("config/c.toml", C)] },
    () => ({ path: "mods", where: "game" }),
  ],
  [
    "L2", "mods/ is a junction, a new file must be placed (outside .ggl-tmp survives)", {},
    async (ctx) => {
      const outside = await linkAt(ctx, mods(ctx));
      await fsp.writeFile(path.join(outside, ".new.jar.ggl-tmp"), "not ours");
      return outside;
    },
    { next: [entry("mods/new.jar", A)] },
    () => ({ path: "mods", where: "game" }),
  ],
  [
    "L3", "mods/ is a junction, Foo.jar → foo.jar", {},
    async (ctx) => {
      await put(ctx.paths, "mods/Foo.jar", A);
      return linkAt(ctx, mods(ctx));
    },
    { previous: [{ path: "mods/Foo.jar", sha256: sha(A) }], next: [entry("mods/foo.jar", A)] },
    () => ({ path: "mods", where: "game" }),
  ],
  [
    "L4", "gameDir is a junction, only a delete", {},
    async (ctx) => {
      await put(ctx.paths, "mods/old.jar", A);
      return linkAt(ctx, ctx.paths.gameDir);
    },
    { previous: [{ path: "mods/old.jar", sha256: sha(A) }], next: [] },
    (ctx) => ({ path: ctx.paths.gameDir, where: "managed" }),
  ],
  [
    "L5", "gameDir is a junction, a download", {},
    (ctx) => linkAt(ctx, ctx.paths.gameDir),
    { next: [entry("mods/a.jar", A)] },
    (ctx) => ({ path: ctx.paths.gameDir, where: "managed" }),
  ],
  [
    "L6", "group/ is a junction, a download", {},
    (ctx) => linkAt(ctx, ctx.paths.groupDir),
    { next: [entry("mods/a.jar", A)] },
    (ctx) => ({ path: ctx.paths.groupDir, where: "managed" }),
  ],
  [
    "L7", ".temp/sync-staging is a junction holding player.dat", {},
    async (ctx) => {
      const outside = await linkAt(ctx, stagingDir(ctx.paths));
      await fsp.writeFile(path.join(outside, "player.dat"), "player");
      return outside;
    },
    { next: [entry("mods/a.jar", A)] },
    (ctx) => ({ path: stagingDir(ctx.paths), where: "managed" }),
  ],
  [
    "L8", ".temp is a junction holding sync-staging/player.dat and other.dat", {},
    async (ctx) => {
      const outside = await linkAt(ctx, ctx.paths.tempDir);
      await fsp.mkdir(path.join(outside, "sync-staging"));
      await fsp.writeFile(path.join(outside, "sync-staging", "player.dat"), "player");
      await fsp.writeFile(path.join(outside, "other.dat"), "other");
      return outside;
    },
    { next: [entry("mods/a.jar", A)] },
    (ctx) => ({ path: ctx.paths.tempDir, where: "managed" }),
  ],
  [
    "L9", "the install location itself is a junction", { linkedRoot: true },
    async (ctx) => path.join(ctx.root, "real"),
    { next: [entry("mods/a.jar", A)] },
    (ctx) => ({ path: ctx.paths.root, where: "root" }),
  ],
  [
    "L10", "instanceDir is a junction (no in-progress marker may appear outside)", {},
    (ctx) => linkAt(ctx, ctx.paths.instanceDir),
    { next: [entry("mods/a.jar", A)] },
    (ctx) => ({ path: ctx.paths.instanceDir, where: "managed" }),
  ],
  [
    "L11", "libraries/ is a junction, nothing under it in the plan", {},
    (ctx) => linkAt(ctx, abs(ctx.paths, "libraries")),
    { next: [entry("mods/a.jar", A)] },
    () => ({ path: "libraries", where: "game" }),
  ],
  [
    "L12", "<root>/runtime is a junction", {},
    (ctx) => linkAt(ctx, path.join(ctx.paths.root, "runtime")),
    { next: [entry("mods/a.jar", A)] },
    (ctx) => ({ path: path.join(ctx.paths.root, "runtime"), where: "managed" }),
  ],
  [
    "L13", "a remove target is itself a junction (not in removeFirst)", {},
    async (ctx) => {
      await fsp.mkdir(mods(ctx), { recursive: true });
      return linkAt(ctx, abs(ctx.paths, "mods/x"));
    },
    { previous: [{ path: "mods/x", sha256: "1".repeat(64) }], next: [entry("mods/a.jar", A)] },
    () => ({ path: "mods/x", where: "game" }),
  ],
]) {
  test(`${id} ${label} ⇒ BLOCKED_BY_LINK at the first check, outside untouched`, { skip: !onWindows }, async (t) => {
    const ctx = await setup(t, opts);
    await seedRecord(ctx);
    const outside = await arrange(ctx);
    await expectRefused(ctx, { outside, runArgs, ...want(ctx), checkpoint: 1 });
  });
}

for (const [id, label, target, want] of [
  ["L14", "mods/ becomes a junction during the download", (ctx) => mods(ctx), () => ({ path: "mods", where: "game" })],
  [
    "L15", "<root>/runtime becomes a junction during the download",
    (ctx) => path.join(ctx.paths.root, "runtime"),
    (ctx) => ({ path: path.join(ctx.paths.root, "runtime"), where: "managed" }),
  ],
]) {
  test(`${id} ${label} ⇒ BLOCKED_BY_LINK at the second check, marker stays, no record`, { skip: !onWindows }, async (t) => {
    const ctx = await setup(t);
    await seedRecord(ctx);
    const outside = path.join(ctx.root, "outside");
    await fsp.mkdir(outside);
    await fsp.writeFile(path.join(outside, "precious.txt"), "keep me");
    await expectRefused(ctx, {
      outside,
      runArgs: { next: [entry("mods/a.jar", A)] },
      onDownload: async (n) => {
        if (n === 1) await fsp.symlink(outside, target(ctx), "junction");
      },
      ...want(ctx),
      checkpoint: 2,
    });
  });
}

test("L16 coverage: every path applyPlan writes through deps.fsp has its ancestors (a) and, for rm/rename, itself (b) checked", async (t) => {
  const ctx = await setup(t);
  await put(ctx.paths, "mods/old.jar", A); // remove
  await put(ctx.paths, "mods/Foo.jar", B); // rename → foo.jar
  await put(ctx.paths, "shaders", "old shader"); // removeFirst（新版要的是 shaders/s.txt）
  await put(ctx.paths, "config", "player"); // 記錄外的檔擋在資料夾的位置 ⇒ moveAside
  await fsp.mkdir(abs(ctx.paths, "mods/extra"), { recursive: true }); // 空資料夾擋在檔的位置 ⇒ dirsToRemove
  const previous = [
    { path: "mods/old.jar", sha256: sha(A) },
    { path: "mods/Foo.jar", sha256: sha(B) },
    { path: "shaders", sha256: sha(Buffer.from("old shader")) },
  ];
  const next = [
    entry("mods/foo.jar", B),
    entry("shaders/s.txt", C),
    entry("config/c.toml", C),
    entry("mods/extra", A),
  ];
  const ops = [];
  const recorded = new Set(["rm", "rename", "copyFile", "mkdir", "writeFile"]);
  const spy = new Proxy(fsp, {
    get(target, key) {
      const v = target[key];
      if (typeof v !== "function") return v;
      if (!recorded.has(key)) return v.bind(target);
      return (...args) => {
        ops.push({ op: key, args });
        return v.apply(target, args);
      };
    },
  });
  const { plan: p, result } = await run(ctx, { previous, next, depsOverride: { fsp: spy } });

  // 這幾個分支都要真的走到，覆蓋率才有意義
  assert.deepEqual(p.remove.sort(), ["mods/old.jar", "shaders"]);
  assert.deepEqual(p.removeFirst, ["shaders"]);
  assert.deepEqual(p.rename, [{ from: "mods/Foo.jar", to: "mods/foo.jar" }]);
  assert.deepEqual(result.movedAside.map((m) => m.from), ["config"]);
  assert.ok(ops.some((o) => o.op === "rm" && o.args[1]?.recursive && o.args[0] === abs(ctx.paths, "mods/extra")));

  const checked = new Set(
    linkCheckPaths({ plan: p, recordFiles: recordFor(next).files }).map((r) => r.toLowerCase()),
  );
  const staging = stagingDir(ctx.paths);
  const inStaging = (q) => q === staging || q.startsWith(staging + path.sep);
  const relOf = (q) => path.relative(ctx.paths.gameDir, q).split(path.sep).join("/");
  const ancestors = (rel) => rel.split("/").slice(0, -1).map((_, i, s) => s.slice(0, i + 1).join("/"));
  // (b) 的例外只收這次實際產生的名字，不靠檔名樣式猜：新記錄每個檔的 .ggl-tmp；
  // moveAside 的備份名（剛用 readdir 確認過不存在才取的）
  const tmpOf = (rel) => {
    const i = rel.lastIndexOf("/");
    return `${rel.slice(0, i + 1)}.${rel.slice(i + 1)}.ggl-tmp`;
  };
  const exemptSet = new Set(
    [...next.map((n) => tmpOf(n.path)), ...result.movedAside.map((m) => m.to)].map((r) => r.toLowerCase()),
  );
  const exempt = (rel) => exemptSet.has(rel.toLowerCase());

  const touched = ops.flatMap(({ op, args }) =>
    (op === "rename" || op === "copyFile" ? args.slice(0, 2) : args.slice(0, 1)).map((q) => ({ op, q })),
  );
  assert.ok(touched.length > 10, `記到的寫入太少：${touched.length}`);
  for (const { op, q } of touched) {
    if (inStaging(q)) continue;
    const rel = relOf(q);
    assert.ok(!rel.startsWith(".."), `${op} 寫到 gameDir 與 staging 以外：${q}`);
    for (const a of ancestors(rel)) assert.ok(checked.has(a.toLowerCase()), `(a) ${op} ${rel} 的上層 ${a} 沒查`);
    if ((op === "rm" || op === "rename") && !exempt(rel))
      assert.ok(checked.has(rel.toLowerCase()), `(b) ${op} 的目標 ${rel} 本身沒查`);
  }
});

test("L18 .ggl-tmp is a junction ⇒ the link itself is removed, outside untouched, one log line, update succeeds", { skip: !onWindows }, async (t) => {
  const ctx = await setup(t);
  await fsp.mkdir(mods(ctx), { recursive: true });
  const outside = await linkAt(ctx, abs(ctx.paths, "mods/.x.jar.ggl-tmp"));
  const before = await snapshot(outside);
  const logs = [];
  await run(ctx, { next: [entry("mods/x.jar", A)], depsOverride: { log: (l) => logs.push(l) } });
  assert.deepEqual(await read(ctx.paths, "mods/x.jar"), A);
  assert.equal(await exists(abs(ctx.paths, "mods/.x.jar.ggl-tmp")), false);
  assert.deepEqual(await snapshot(outside), before);
  assert.equal(logs.length, 1);
  assert.ok(logs[0].includes("mods/.x.jar.ggl-tmp"), logs[0]);
});

// ── 連結封口 1b D7（→ _notes/plans/cross-review-2026-10-phase1.md §測試「1b」）──
// 真的 prepareRuntime（Java 一步換成空的）＋本機 HTTP 的 runtime；深層 junction 1a 的檢查點不查，由 runtime 自己擋

test("D7 runtime 深層 junction 經 applyPlan 被拒 ⇒ IPC 之後仍是 game 文案原文、中斷標記仍在、記錄沒寫、外部不變", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  const ctx = await setup(t);
  const fake = await startFakeRuntime(t);
  const runtimeArgs = (verifyAll) => ({
    paths: ctx.paths,
    minecraft: MC,
    loader: LOADER,
    verifyAll,
    reinstallJava: false,
    env: windowsEnv("10.0.26200"),
    deps: {
      ...fake.endpoints,
      stall: { windowMs: 300, minBytes: 1 },
      deadlineMs: 300,
      steps: { installJava: async () => {} },
    },
  });
  await prepareRuntime(runtimeArgs(false));
  const outside = path.join(ctx.root, "outside");
  await fsp.rename(abs(ctx.paths, "libraries/com"), outside);
  await fsp.symlink(outside, abs(ctx.paths, "libraries/com"), "junction");
  const jar = fake.windowsLibraryRels().find((r) => r.startsWith("libraries/com/"));
  await fsp.rm(path.join(outside, ...jar.slice("libraries/com/".length).split("/")));
  await seedRecord(ctx);
  const recordBefore = await readOrNull(ctx.paths.syncRecordPath);
  const before = await snapshot(outside);

  let refused;
  await assert.rejects(
    run(ctx, {
      next: [entry("mods/a.jar", A)],
      depsOverride: { prepareRuntime: () => prepareRuntime(runtimeArgs(false)) },
    }),
    (e) => {
      refused = e;
      return e.code === "GGL_SYNC_BLOCKED_BY_LINK" && e.where === "game" && e.path === "libraries/com";
    },
  );
  const handlers = new Map();
  registerInstanceIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: {
      updateInstance: async () => {
        throw refused;
      },
    },
    showInfoDialog: async () => {},
  });
  await assert.rejects(handlers.get("instance:update")({ sender: {} }), (e) => {
    assert.equal(e.message, linkMessage({ where: "game", path: "libraries/com" }));
    return true;
  });
  assert.equal(await exists(ctx.paths.syncInProgressPath), true, "D-LINK-C-DEEP：拒在 markInProgress 之後，標記留著");
  assert.deepEqual(await readOrNull(ctx.paths.syncRecordPath), recordBefore);
  assert.deepEqual(await snapshot(outside), before);
  assert.equal((await fsp.lstat(abs(ctx.paths, "libraries/com"))).isSymbolicLink(), true);
});

// ── N6：GGL 內部檔名是連結 ⇒ 只刪連結本身、照常更新、記 debug log（→ _notes/plans/cross-review-2026-10-n6.md §回歸測試 T-A*）──

test("T-A1 N6: staging <sha>.part is a junction ⇒ the first update succeeds, outside untouched, the removal is logged", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  const ctx = await setup(t);
  const netLogs = [];
  configureNetFetch({ appendLauncherLog: async (l) => netLogs.push(l) });
  t.after(() => configureNetFetch({}));
  const staged = path.join(stagingDir(ctx.paths), sha(A));
  const outside = await linkAt(ctx, `${staged}.part`);
  const before = await snapshot(outside);

  await run(ctx, { next: [entry("mods/a.jar", A)] });

  assert.deepEqual(await read(ctx.paths, "mods/a.jar"), A);
  assert.deepEqual(await snapshot(outside), before);
  assert.deepEqual(netLogs, [`DOWNLOAD_TEMP_LINK_REMOVED ${staged}.part`]);
});

test("T-A2 N6: sync-in-progress and sync-record.json.tmp are file symlinks ⇒ update succeeds, outside untouched, both removals reach deps.log", { timeout: HANG_LIMIT_MS }, async (t) => {
  const ctx = await setup(t);
  const outside = path.join(ctx.root, "outside");
  await fsp.mkdir(outside, { recursive: true });
  await fsp.writeFile(path.join(outside, "marker.txt"), "VICTIM marker");
  await fsp.writeFile(path.join(outside, "record.txt"), "VICTIM record");
  await fsp.mkdir(ctx.paths.instanceDir, { recursive: true });
  await fsp.symlink(path.join(outside, "marker.txt"), ctx.paths.syncInProgressPath, "file");
  await fsp.symlink(path.join(outside, "record.txt"), `${ctx.paths.syncRecordPath}.tmp`, "file");
  const before = await snapshot(outside);
  const logs = [];

  await run(ctx, { next: [entry("mods/a.jar", A)], depsOverride: { log: (l) => logs.push(l) } });

  assert.deepEqual(await snapshot(outside), before);
  const st = await fsp.lstat(ctx.paths.syncRecordPath);
  assert.ok(st.isFile() && !st.isSymbolicLink(), "sync-record.json 應該是一般檔");
  assert.equal((await readRecord(ctx.paths)).version, "v2");
  assert.equal(await exists(ctx.paths.syncInProgressPath), false);
  assert.deepEqual(logs, [
    `SYNC_MARKER_LINK_REMOVED ${ctx.paths.syncInProgressPath}`,
    `SYNC_RECORD_TMP_LINK_REMOVED ${ctx.paths.syncRecordPath}.tmp`,
  ]);
});
