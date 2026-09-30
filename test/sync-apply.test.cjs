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
const { getPaths } = require("../lib/paths-layout.js");
const { planSync } = require("../lib/sync/plan.js");
const { hashFile } = require("../main/fs-utils.js");
const {
  readRecord,
  isInProgress,
  writeRecord,
} = require("../main/sync/instance-record.js");
const { downloadToFileWithStallGuard } = require("../main/net-fetch.js");
const { applyPlan, SyncApplyError } = require("../main/sync/apply.js");

const HANG_LIMIT_MS = 10_000;
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const A = Buffer.from("mod A ".repeat(200));
const B = Buffer.from("mod B ".repeat(300));
const C = Buffer.from("config C ".repeat(50));
const blobs = new Map([A, B, C].map((b) => [sha(b), b]));
const entry = (p, buf) => ({ path: p, sha256: sha(buf), size: buf.length });

/** 每個測試一個乾淨的根目錄與站台；behave(req, res, shaHex, n) 可覆寫單一 blob 的回法 */
async function setup(t, { behave } = {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-apply-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const paths = getPaths({ launcherRootDir: root });
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
  return { root, paths, srv, blobRequests, filesBaseUrl: `${srv.url}/files/` };
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
    prepareRuntime: async () => {},
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
  assert.deepEqual(result, { movedAside: [] });
});

test("prepareRuntime is called while the in-progress marker exists", async (t) => {
  const ctx = await setup(t);
  let markerSeen = null;
  await run(ctx, {
    next: [entry("mods/a.jar", A)],
    depsOverride: {
      prepareRuntime: async () => (markerSeen = await isInProgress(ctx.paths)),
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
  "download stalls after headers ⇒ fails within bound, marker stays, destination untouched",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const ctx = await setup(t, {
      behave: (req, res) => {
        res.writeHead(200, { "content-length": String(A.length) });
        res.write(A.subarray(0, 10));
        return true;
      },
    });
    const t0 = Date.now();
    await assert.rejects(run(ctx, { next: [entry("mods/a.jar", A)] }), {
      code: "GGL_DOWNLOAD_STALLED",
    });
    assert.ok(Date.now() - t0 < 300 * 2 * 3, `took ${Date.now() - t0} ms`);
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
    await assert.rejects(run(ctx, { next }), { code: "GGL_DOWNLOAD_STALLED" });
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
      prepareRuntime: async () => (seen = await listStaging(ctx.paths)),
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
      prepareRuntime: async () =>
        (seen = await exists(abs(ctx.paths, "mods/.a.jar.ggl-tmp"))),
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
      writeRecord: async (p, r) => ((got = r), writeRecord(p, r)),
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
