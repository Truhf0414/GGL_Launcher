"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const {
  publish,
  rollback,
  listReleases,
  walkSource,
  readSite,
  writeFileAtomic,
  archiveNameFor,
} = require("../scripts/lib/publish.js");
const {
  validateIndex,
  validateGate,
  validateNotice,
  validateRelease,
} = require("../lib/sync/site-format.js");

// ── 共用小工具：一律在 os.tmpdir() 底下，不碰 H: ──

const sha256 = (content) =>
  crypto.createHash("sha256").update(content).digest("hex");

async function tmpDir(t, label) {
  const dir = await fsp.mkdtemp(
    path.join(os.tmpdir(), `ggl-publish-${label}-`),
  );
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  return dir;
}

/** files：{ "相對路徑": 內容 }；結尾 / 的鍵＝空資料夾 */
async function writeTree(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, ...rel.split("/"));
    if (rel.endsWith("/")) {
      await fsp.mkdir(abs, { recursive: true });
    } else {
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, content);
    }
  }
}

const TEST_CONFIG = {
  include: ["mods/", "config/", "options.txt", "servers.dat"],
  exclude: ["**/.index/**", "**/*.bak"],
  playerEditable: ["config/", "options.txt", "servers.dat"],
  protectedPaths: ["saves/", "screenshots/", "hotbar.nbt"],
  keepReleases: 3,
};

const RELEASE = (
  version,
  files,
  publishedAt = "2026-09-20T10:00:00+08:00",
) => ({
  version,
  publishedAt,
  minecraft: "1.21.11",
  loader: { type: "fabric", version: "0.19.3" },
  playerEditable: ["config/"],
  files: Object.entries(files).map(([p, content]) => ({
    path: p,
    sha256: sha256(content),
    size: Buffer.byteLength(content),
  })),
});

// ── 步驟 3：走訪與讀站台 ──

test("walkSource：走整棵樹；只對 include 命中且非 exclude 的檔算 hash（B7）", async (t) => {
  const src = await tmpDir(t, "walk");
  await writeTree(src, {
    "mmc-pack.json": "{}",
    "mods/a.jar": "A",
    "mods/.index/a.pw.toml": "idx",
    "mods/old.bak": "bak",
    "config/x/y.toml": "Y",
    "options.txt": "opt",
    "saves/world/level.dat": "save",
    "logs/latest.log": "log",
  });
  const { entries, errors } = await walkSource(src, TEST_CONFIG);
  assert.deepEqual(errors, []);
  const byPath = Object.fromEntries(entries.map((e) => [e.path, e]));
  assert.deepEqual(Object.keys(byPath).sort(), [
    "config/x/y.toml",
    "logs/latest.log",
    "mmc-pack.json",
    "mods/.index/a.pw.toml",
    "mods/a.jar",
    "mods/old.bak",
    "options.txt",
    "saves/world/level.dat",
  ]);
  assert.equal(byPath["mods/a.jar"].sha256, sha256("A"));
  assert.equal(byPath["config/x/y.toml"].sha256, sha256("Y"));
  assert.equal(byPath["options.txt"].size, 3);
  for (const p of [
    "mods/.index/a.pw.toml",
    "mods/old.bak",
    "saves/world/level.dat",
    "logs/latest.log",
    "mmc-pack.json",
  ]) {
    assert.equal(byPath[p].sha256, null, p);
  }
  assert.equal(byPath["mods/a.jar"].absPath, path.join(src, "mods", "a.jar"));
});

test("walkSource：來源缺某個 include 項 ⇒ 不報錯", async (t) => {
  const src = await tmpDir(t, "walk-missing");
  await writeTree(src, { "mods/a.jar": "A" }); // 沒有 config/、options.txt、servers.dat
  const { entries, errors } = await walkSource(src, TEST_CONFIG);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    entries.map((e) => e.path),
    ["mods/a.jar"],
  );
});

test("walkSource：junction 與檔案 symlink ⇒ error、不跟進（B7）", async (t) => {
  const src = await tmpDir(t, "walk-link");
  const outside = await tmpDir(t, "walk-outside");
  await writeTree(outside, { "evil/x.jar": "X", "secret.txt": "S" });
  await writeTree(src, { "mods/a.jar": "A" });
  await fsp.symlink(
    path.join(outside, "evil"),
    path.join(src, "mods", "linked"),
    "junction",
  );
  await fsp.symlink(
    path.join(outside, "secret.txt"),
    path.join(src, "options.txt"),
    "file",
  );
  const { entries, errors } = await walkSource(src, TEST_CONFIG);
  assert.deepEqual(
    entries.map((e) => e.path),
    ["mods/a.jar"],
  );
  assert.deepEqual(errors.map((e) => [e.code, e.path]).sort(), [
    ["symlink", "mods/linked"],
    ["symlink", "options.txt"],
  ]);
});

test("readSite：站台根不存在 ⇒ 全空、不丟錯", async (t) => {
  const root = path.join(await tmpDir(t, "site-none"), "nope");
  const site = await readSite(root);
  assert.equal(site.current.state, "missing");
  assert.deepEqual(site.archives, []);
  assert.equal(site.blobs.size, 0);
  assert.deepEqual(site.staleTemps, []);
  assert.equal(site.manifest.isV3, false);
  assert.equal(site.manifest.legacyFields, null);
  assert.equal(site.gateExists, false);
});

test("readSite：封存分類（B5）、殘骸分類（B6）、files/ 分類、舊 manifest 欄位", async (t) => {
  const root = await tmpDir(t, "site");
  const r1 = RELEASE("v1", { "mods/a.jar": "A" }, "2026-09-20T10:00:00+08:00");
  const r2 = RELEASE("v2", { "mods/a.jar": "A2" }, "2026-09-21T10:00:00+08:00");
  const blob = sha256("A");
  await writeTree(root, {
    "release.json": JSON.stringify(r2),
    "releases/20260920-100000-v1.json": JSON.stringify(r1),
    "releases/20260921-100000-v2.json": JSON.stringify(r2),
    "releases/garbage.json": "{}",
    "releases/20260922-100000-bad.json": JSON.stringify({ version: "bad" }),
    "releases/20260923-100000-dir.json/": "",
    "releases/x.json.tmp": "tmp",
    [`files/${blob}`]: "A",
    [`files/${"b".repeat(64)}.tmp`]: "partial",
    "files/foo.tmp": "not mine",
    "files/bootstrap-x/a.txt": "legacy",
    "release.json.tmp": "tmp",
    "notes.tmp": "not mine",
    "manifest.json": JSON.stringify({
      schemaVersion: 2,
      notice: { title: "T" },
      maintenance: { enabled: false, message: "" },
      minLauncherVersion: "1.0.0",
      notifications: [{ id: "n1", title: "N1" }],
      other: 1,
    }),
    "gate.json": "{}",
  });
  const site = await readSite(root);
  assert.equal(site.current.state, "ok");
  assert.deepEqual(
    site.archives.map((a) => a.name),
    ["20260921-100000-v2.json", "20260920-100000-v1.json"],
  );
  assert.deepEqual(site.unreadableArchives, [
    "releases/20260922-100000-bad.json",
    "releases/20260923-100000-dir.json/",
    "releases/garbage.json",
  ]);
  assert.deepEqual(site.staleTemps.sort(), [
    `files/${"b".repeat(64)}.tmp`,
    "release.json.tmp",
    "releases/x.json.tmp",
  ]);
  assert.deepEqual([...site.blobs], [[blob, 1]]);
  assert.deepEqual(site.nonBlobEntries, [
    "files/bootstrap-x/",
    "files/foo.tmp",
  ]);
  assert.deepEqual(site.manifest, {
    isV3: false,
    legacyFields: {
      notice: { title: "T" },
      maintenance: { enabled: false, message: "" },
      minLauncherVersion: "1.0.0",
      notifications: [{ id: "n1", title: "N1" }],
    },
  });
  assert.equal(site.gateExists, true);
  assert.equal(site.noticeExists, false);
});

test("readSite：release.json 壞掉 ⇒ invalid 並帶 validateRelease 的 error（B4）", async (t) => {
  const root = await tmpDir(t, "site-bad");
  await writeTree(root, { "release.json": JSON.stringify({ version: "x" }) });
  const site = await readSite(root);
  assert.equal(site.current.state, "invalid");
  assert.match(site.current.error, /^release\./);
  await writeTree(root, { "release.json": "{not json" });
  assert.equal((await readSite(root)).current.state, "invalid");
});

test("writeFileAtomic：rename 遇 EBUSY 重試後成功；非 EPERM／EBUSY 不重試（B3）", async (t) => {
  const dir = await tmpDir(t, "atomic");
  const target = path.join(dir, "release.json");
  let calls = 0;
  const flaky = async (from, to) => {
    calls += 1;
    if (calls <= 2) throw Object.assign(new Error("busy"), { code: "EBUSY" });
    return fsp.rename(from, to);
  };
  await writeFileAtomic(target, "hello", { rename: flaky });
  assert.equal(calls, 3);
  assert.equal(await fsp.readFile(target, "utf8"), "hello");
  assert.equal(fs.existsSync(`${target}.tmp`), false);

  calls = 0;
  const missing = async () => {
    calls += 1;
    throw Object.assign(new Error("gone"), { code: "ENOENT" });
  };
  await assert.rejects(writeFileAtomic(target, "x", { rename: missing }), {
    code: "ENOENT",
  });
  assert.equal(calls, 1);
});

test("writeFileAtomic：EPERM 一直失敗 ⇒ 重試 5 次後丟錯", async (t) => {
  const dir = await tmpDir(t, "atomic-perm");
  let calls = 0;
  const denied = async () => {
    calls += 1;
    throw Object.assign(new Error("denied"), { code: "EPERM" });
  };
  await assert.rejects(
    writeFileAtomic(path.join(dir, "x.json"), "x", { rename: denied }),
    { code: "EPERM" },
  );
  assert.equal(calls, 6); // 第一次＋重試 5 次
});

// ── 步驟 4–6 共用：來源、站台、快照 ──

const MMC_PACK = (loader = "0.19.3") =>
  JSON.stringify({
    components: [
      { uid: "net.minecraft", version: "1.21.11" },
      { uid: "net.fabricmc.fabric-loader", version: loader },
    ],
  });

// 本地時間建構：封存檔名（B8）與執行機器時區無關，本機與 CI 都算得出同一個名字
const at = (day, hour = 10) => new Date(2026, 8, day, hour, 0, 0);
const archiveOf = (version, now) =>
  archiveNameFor({ version, publishedAt: now.toISOString() });

/** 每次都在新的子資料夾建，同一個版本名可以建很多份不同內容 */
async function makeSource(parent, version, files, { mmc = MMC_PACK() } = {}) {
  await fsp.mkdir(parent, { recursive: true });
  const base = await fsp.mkdtemp(path.join(parent, "s-"));
  const dir = path.join(base, version);
  await writeTree(dir, { "mmc-pack.json": mmc, ...files });
  return dir;
}

/** 站台快照：listing 含資料夾，檔比 hash；withMtime 時檔與資料夾都比 mtimeMs（2b-SPR #18） */
async function snapshot(root, { withMtime = true } = {}) {
  const out = [];
  async function walk(rel) {
    let dirents;
    try {
      dirents = await fsp.readdir(path.join(root, rel), {
        withFileTypes: true,
      });
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
    for (const d of dirents) {
      const r = rel ? `${rel}/${d.name}` : d.name;
      const abs = path.join(root, r);
      const st = await fsp.lstat(abs);
      if (st.isSymbolicLink()) {
        out.push(`L ${r} -> ${await fsp.readlink(abs)}`); // 捷徑只記指向，不跟進
        continue;
      }
      const mtime = withMtime ? ` ${st.mtimeMs}` : "";
      if (st.isDirectory()) {
        out.push(`D ${r}${mtime}`);
        await walk(r);
      } else {
        out.push(`F ${r} ${sha256(await fsp.readFile(abs))}${mtime}`);
      }
    }
  }
  await walk("");
  return out.sort();
}

const V2_MANIFEST = {
  schemaVersion: 2,
  notice: {
    title: "T",
    subtitle: "S",
    imageUrl: "notice-thumb.jpg",
    logUrl: "changelog.json",
  },
  maintenance: { enabled: false, message: "" },
  minLauncherVersion: "1.0.0",
  notifications: [{ id: "n1", title: "N1" }],
};

/** 仿真站台現況：v2 manifest（帶 notifications）、files/bootstrap-x/、changelog.json、根目錄雜檔 */
async function legacySite(root) {
  await writeTree(root, {
    "manifest.json": JSON.stringify(V2_MANIFEST, null, 2),
    "changelog.json": "[]",
    "notice-thumb.jpg": "jpg",
    Caddyfile: "caddy",
    "files/bootstrap-x/config/a.txt": "legacy",
  });
}

function runner(siteRoot, config = TEST_CONFIG) {
  return (sourceDir, now, extra = {}) =>
    publish({
      sourceDir,
      siteRoot,
      siteRootIsDefault: false,
      publishConfig: config,
      now,
      apply: true,
      force: false,
      ...extra,
    });
}

async function readRelease(siteRoot) {
  return JSON.parse(
    await fsp.readFile(path.join(siteRoot, "release.json"), "utf8"),
  );
}

const V1_FILES = {
  "mods/a.jar": "A1",
  "mods/b.jar": "B",
  "config/c.toml": "C1",
  "options.txt": "O",
};
const V2_FILES = {
  "mods/a.jar": "A2",
  "mods/b.jar": "B",
  "config/c.toml": "C1",
  "options.txt": "O",
};

async function newSite(t, label) {
  const work = await tmpDir(t, label);
  const siteRoot = path.join(work, "site");
  const srcRoot = path.join(work, "src");
  await legacySite(siteRoot);
  return { siteRoot, srcRoot, run: runner(siteRoot) };
}

async function publishOk(run, sourceDir, now) {
  const r = await run(sourceDir, now);
  assert.equal(r.ok, true, r.report.join("\n"));
  return r;
}

/** 已發過 v1、v2，另放 B6 形狀殘骸與「不該刪」的樣本 */
async function seededSite(t, label = "seed") {
  const ctx = await newSite(t, label);
  await publishOk(
    ctx.run,
    await makeSource(ctx.srcRoot, "v1", V1_FILES),
    at(20),
  );
  await publishOk(
    ctx.run,
    await makeSource(ctx.srcRoot, "v2", V2_FILES),
    at(21),
  );
  await writeTree(ctx.siteRoot, {
    [`files/${"e".repeat(64)}.tmp`]: "partial",
    "release.json.tmp": "tmp",
    "releases/x.json.tmp": "tmp",
    "files/foo.tmp": "not mine",
    "notes.tmp": "not mine",
  });
  return ctx;
}

// ── 步驟 4：乾跑與拒絕路徑 ──

test("publish 乾跑：站台 listing（含資料夾、mtime）與 hash 前後完全相同", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "dry");
  const before = await snapshot(siteRoot);
  const src = await makeSource(srcRoot, "v3", {
    ...V2_FILES,
    "mods/c.jar": "C",
  });
  const r = await run(src, at(22), { apply: false });
  assert.equal(r.ok, true, r.report.join("\n"));
  assert.equal(r.summary.dryRun, true);
  assert.deepEqual(await snapshot(siteRoot), before);
  assert.match(r.report.at(-1), /乾跑，未寫入任何檔/);
  assert.deepEqual(r.summary.diff.added, ["mods/c.jar"]);
  assert.deepEqual(r.summary.staleTemps.sort(), [
    `files/${"e".repeat(64)}.tmp`,
    "release.json.tmp",
    "releases/x.json.tmp",
  ]);
});

const REFUSALS = [
  [
    "來源放 saves/x（B7＋保護名單）",
    "protected-path",
    (s) => makeSource(s, "v3", { ...V2_FILES, "saves/x/level.dat": "S" }),
  ],
  [
    "來源是整個 Prism 實例",
    "prism-instance",
    (s) => makeSource(s, "v3", { "minecraft/mods/a.jar": "A" }),
  ],
  ["空清單沒加 --force", "sanity", (s) => makeSource(s, "v3", {})],
  [
    "刪掉超過一半沒加 --force",
    "sanity",
    (s) => makeSource(s, "v3", { "options.txt": "O" }),
  ],
  [
    "同版本名的封存已存在且檔案不同（B1）",
    "version-reused",
    (s) => makeSource(s, "v1", { ...V1_FILES, "mods/new.jar": "N" }),
  ],
  [
    "同版本名、files 相同只有 loader.version 不同（B1，2b-SPR #19）",
    "version-reused",
    (s) => makeSource(s, "v2", V2_FILES, { mmc: MMC_PACK("0.19.4") }),
  ],
  [
    "版本資料夾名以 . 開頭（buildRelease 錯誤傳遞，2b-SPR #16）",
    "invalid-version",
    (s) => makeSource(s, ".v3", V2_FILES),
  ],
  [
    "沒有 mmc-pack.json",
    "mmc-pack",
    async (s) => {
      const dir = await makeSource(s, "v3", V2_FILES);
      await fsp.rm(path.join(dir, "mmc-pack.json"));
      return dir;
    },
  ],
  [
    "mmc-pack.json 壞掉",
    "mmc-pack",
    (s) => makeSource(s, "v3", V2_FILES, { mmc: "{oops" }),
  ],
];

for (const [name, code, makeSrc] of REFUSALS) {
  test(`publish 拒絕：${name} ⇒ ok:false、站台不變（含 B6 殘骸）`, async (t) => {
    const { siteRoot, srcRoot, run } = await seededSite(t, "refuse");
    const before = await snapshot(siteRoot);
    const r = await run(await makeSrc(srcRoot), at(22));
    assert.equal(r.ok, false);
    assert.ok(
      r.summary.errors.some((e) => e.code === code),
      JSON.stringify(r.summary.errors),
    );
    assert.deepEqual(await snapshot(siteRoot), before);
    assert.match(r.report.join("\n"), /拒絕發版，站台未動/);
  });
}

test("publish 拒絕：當前 release.json 是 X、X 的封存已被清掉，拿不同內容發 X（B1）", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "reuse-current");
  await fsp.rm(path.join(siteRoot, "releases", archiveOf("v2", at(21))));
  const before = await snapshot(siteRoot);
  const r = await run(
    await makeSource(srcRoot, "v2", { ...V2_FILES, "mods/z.jar": "Z" }),
    at(22),
  );
  assert.equal(r.ok, false);
  assert.deepEqual(
    r.summary.errors.map((e) => e.code),
    ["version-reused"],
  );
  assert.deepEqual(await snapshot(siteRoot), before);
});

test("publish 拒絕：來源含 junction ⇒ symlink error、站台不變", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "refuse-link");
  const outside = await tmpDir(t, "link-target");
  const src = await makeSource(srcRoot, "v3", V2_FILES);
  await fsp.symlink(outside, path.join(src, "mods", "linked"), "junction");
  const before = await snapshot(siteRoot);
  const r = await run(src, at(22));
  assert.equal(r.ok, false);
  assert.ok(r.summary.errors.some((e) => e.code === "symlink"));
  assert.deepEqual(await snapshot(siteRoot), before);
});

test("publish 拒絕：release.json 壞掉（B4）⇒ 報告含兩條修法；加 --force 仍拒絕", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "b4");
  await fsp.writeFile(
    path.join(siteRoot, "release.json"),
    JSON.stringify({ version: "broken" }),
  );
  const before = await snapshot(siteRoot);
  const src = await makeSource(srcRoot, "v3", V2_FILES);
  for (const force of [false, true]) {
    const r = await run(src, at(22), { force });
    assert.equal(r.ok, false);
    const b4 = r.summary.errors.find((e) => e.code === "release-invalid");
    assert.ok(b4, JSON.stringify(r.summary.errors));
    // 兩條修法都要是完整、可直接複製的指令（路徑含反斜線，用字面比對）
    const lines = b4.message.split("\n");
    assert.ok(
      lines.includes(
        `  ① 換回最近一份封存：node scripts/publish.js --rollback --to 1 --apply --site-root "${siteRoot}"`,
      ),
      b4.message,
    );
    assert.ok(
      lines.includes(
        `       PowerShell：Remove-Item -LiteralPath "${path.join(siteRoot, "release.json")}"`,
      ),
      b4.message,
    );
    assert.ok(
      lines.includes(
        `       然後：node scripts/publish.js "${src}" --site-root "${siteRoot}" --apply`,
      ),
      b4.message,
    );
    assert.deepEqual(await snapshot(siteRoot), before);
  }
});

test("publish 拒絕：release.json 是資料夾（讀取失敗）⇒ 走 B4 拒絕、不整支丟錯", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "b4-dir");
  await fsp.rm(path.join(siteRoot, "release.json"));
  await fsp.mkdir(path.join(siteRoot, "release.json"));
  const before = await snapshot(siteRoot);
  const r = await run(await makeSource(srcRoot, "v3", V2_FILES), at(22));
  assert.equal(r.ok, false);
  const b4 = r.summary.errors.find((e) => e.code === "release-invalid");
  assert.ok(b4, JSON.stringify(r.summary.errors));
  assert.match(b4.message, /讀取失敗（EISDIR）/);
  assert.deepEqual(await snapshot(siteRoot), before);
});

test("publish 拒絕：封存檔名或 blob 位置被「只差大小寫」的檔佔住（Windows 會直接蓋掉）", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "case");
  const name = archiveOf("v3", at(22)).replace(/\.json$/, ".JSON");
  const upper = sha256("C").toUpperCase();
  await writeTree(siteRoot, {
    [`releases/${name}`]: "{}",
    [`files/${upper}`]: "C",
  });
  const before = await snapshot(siteRoot);
  const r = await run(
    await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
    at(22),
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.summary.errors.map((e) => [e.code, e.path]).sort(), [
    ["archive-name-taken", `releases/${name}`],
    ["blob-path-taken", `files/${upper}`],
  ]);
  assert.deepEqual(await snapshot(siteRoot), before);
});

// 站台裡的捷徑：寫入或刪除會跟到站台外 ⇒ 發版與退版都拒絕（owner 2026-09-28 選擋）
const SITE_LINKS = [
  ["files/ 本身是 junction", "files", "junction"],
  ["releases/ 本身是 junction", "releases", "junction"],
  ["files/ 裡有一個 symlink 的暫存檔", `files/${"e".repeat(64)}.tmp`, "file"],
  ["根目錄的 release.json.tmp 是 symlink", "release.json.tmp", "file"],
];

for (const [name, rel, type] of SITE_LINKS) {
  test(`站台裡有捷徑（${name}）⇒ publish 與 rollback 都拒絕、站台外不被碰`, async (t) => {
    const { siteRoot, srcRoot, run } = await seededSite(t, "site-link");
    const outside = await tmpDir(t, "outside");
    await writeTree(outside, { "keep.txt": "outside" });
    const abs = path.join(siteRoot, ...rel.split("/"));
    if (type === "junction") {
      // 原本的資料夾搬到站台外、junction 指過去：站台看起來完整，但實體在外面
      const moved = path.join(outside, "moved");
      await fsp.rename(abs, moved);
      await fsp.symlink(moved, abs, "junction");
    } else {
      await fsp.rm(abs, { force: true });
      await fsp.symlink(path.join(outside, "keep.txt"), abs, "file");
    }
    const outsideBefore = await snapshot(outside);
    const siteBefore = await snapshot(siteRoot, { withMtime: false });
    const r = await run(
      await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
      at(22),
    );
    assert.equal(r.ok, false);
    assert.deepEqual(
      r.summary.errors
        .filter((e) => e.code === "site-symlink")
        .map((e) => e.path),
      [rel],
    );
    const rb = await rollback({ siteRoot, to: 1, apply: true });
    assert.equal(rb.ok, false);
    assert.match(rb.report[0], /站台裡有捷徑/);
    assert.deepEqual(await snapshot(outside), outsideBefore);
    assert.deepEqual(
      await snapshot(siteRoot, { withMtime: false }),
      siteBefore,
    );
  });
}

test("publish 拒絕：要寫的封存檔名被佔住、或 blob 位置是資料夾（B12）", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "b12");
  const name = archiveOf("v3", at(22));
  await writeTree(siteRoot, {
    [`releases/${name}/`]: "",
    [`files/${sha256("C")}/`]: "",
  });
  const before = await snapshot(siteRoot);
  const r = await run(
    await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
    at(22),
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.summary.errors.map((e) => [e.code, e.path]).sort(), [
    ["archive-name-taken", `releases/${name}/`],
    ["blob-path-taken", `files/${sha256("C")}/`],
  ]);
  assert.deepEqual(await snapshot(siteRoot), before);
});

// ── 步驟 5：apply ──

test("publish apply 首發：四支 json 過讀取端驗證、blob 白名單齊全、既有雜檔不動", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "first");
  await writeTree(siteRoot, {
    "notice.json": JSON.stringify({ notice: { title: "keep" } }),
  });
  const keepBytes = {};
  for (const f of [
    "changelog.json",
    "notice-thumb.jpg",
    "Caddyfile",
    "notice.json",
    "files/bootstrap-x/config/a.txt",
  ]) {
    keepBytes[f] = await fsp.readFile(path.join(siteRoot, f));
  }
  const r = await publishOk(
    run,
    await makeSource(srcRoot, "v1", V1_FILES),
    at(20),
  );
  const read = async (f) =>
    JSON.parse(await fsp.readFile(path.join(siteRoot, f), "utf8"));
  assert.equal(validateIndex(await read("manifest.json")).ok, true);
  assert.equal(validateGate(await read("gate.json")).ok, true);
  assert.equal(validateNotice(await read("notice.json")).ok, true);
  const release = await read("release.json");
  assert.equal(validateRelease(release).ok, true);
  for (const f of release.files) {
    const blob = path.join(siteRoot, "files", f.sha256);
    assert.equal((await fsp.stat(blob)).size, f.size, f.path);
    assert.equal(sha256(await fsp.readFile(blob)), f.sha256, f.path);
  }
  for (const [f, bytes] of Object.entries(keepBytes)) {
    assert.deepEqual(await fsp.readFile(path.join(siteRoot, f)), bytes, f);
  }
  assert.deepEqual(await read(`releases/${archiveOf("v1", at(20))}`), release);
  assert.match(
    r.report.join("\n"),
    /舊 manifest 欄位（不會自動搬）：.*notice\.title=T.*maintenance\.enabled=false.*minLauncherVersion=1\.0\.0.*notifications=1 筆（N1）/,
  );
  assert.deepEqual(r.summary.nonBlobEntries, ["files/bootstrap-x/"]);
});

test("publish apply：第二版只多出變更的 blob", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "second");
  await publishOk(run, await makeSource(srcRoot, "v1", V1_FILES), at(20));
  const before = new Set((await readSite(siteRoot)).blobs.keys());
  const r = await publishOk(
    run,
    await makeSource(srcRoot, "v2", V2_FILES),
    at(21),
  );
  const after = new Set((await readSite(siteRoot)).blobs.keys());
  assert.deepEqual(
    [...after].filter((s) => !before.has(s)),
    [sha256("A2")],
  );
  assert.deepEqual(r.summary.blobsToCopy.shas, [sha256("A2")]);
  assert.deepEqual(r.summary.diff.changed, ["mods/a.jar"]);
});

test("publish apply：保留集照時間不照版本名字典序（先發 v9 再發 v10…，keepReleases=3）", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "keep");
  const versions = ["v9", "v10", "v11", "v12"];
  for (const [i, v] of versions.entries()) {
    await publishOk(
      run,
      await makeSource(srcRoot, v, {
        "options.txt": "O",
        [`mods/${v}.jar`]: v,
      }),
      at(20 + i),
    );
  }
  const site = await readSite(siteRoot);
  assert.deepEqual(
    site.archives.map((a) => a.release.version),
    ["v12", "v11", "v10"],
  );
  assert.equal(site.blobs.has(sha256("v9")), false);
  assert.equal(site.blobs.has(sha256("v10")), true);
  assert.equal(site.blobs.has(sha256("O")), true);
});

test("publish apply：保留集內壞掉的 blob 用本次來源修好並列在報告", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "repair");
  await fsp.writeFile(path.join(siteRoot, "files", sha256("B")), "X"); // 同大小不同內容
  const r = await publishOk(
    run,
    await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
    at(22),
  );
  assert.deepEqual(r.summary.repairedBlobs, [sha256("B")]);
  assert.equal(
    await fsp.readFile(path.join(siteRoot, "files", sha256("B")), "utf8"),
    "B",
  );
  assert.match(r.report.join("\n"), /修復損壞的 blob：1 個/);
});

test("publish：保留集內、本次來源沒有的 blob 壞掉 ⇒ 點名該版無法退回，發版照樣成功", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "lost");
  await fsp.rm(path.join(siteRoot, "files", sha256("A1"))); // 只有 v1 引用
  const r = await publishOk(
    run,
    await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
    at(22),
  );
  assert.deepEqual(r.summary.brokenRollbacks, [{ version: "v1", blobs: 1 }]);
  assert.match(r.report.join("\n"), /v1 有 1 個 blob 已損壞，該版無法退回/);
  assert.equal(validateRelease(await readRelease(siteRoot)).ok, true);
  assert.equal((await readRelease(siteRoot)).version, "v3");
});

test("publish 乾跑：blob 損壞只報告不修", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "dry-corrupt");
  await fsp.writeFile(path.join(siteRoot, "files", sha256("B")), "X");
  const before = await snapshot(siteRoot);
  const r = await run(await makeSource(srcRoot, "v3", V2_FILES), at(22), {
    apply: false,
  });
  assert.deepEqual(r.summary.repairedBlobs, [sha256("B")]);
  assert.deepEqual(await snapshot(siteRoot), before);
});

for (const failAt of [6, 7, 9]) {
  test(`publish：步驟 ${failAt} 中途失敗，換一個 now 重跑 ⇒ 收斂到一次跑完的狀態（2b-SPR #2）`, async (t) => {
    const a = await newSite(t, `conv-${failAt}`);
    const b = await newSite(t, `conv-ref-${failAt}`);
    for (const ctx of [a, b])
      await publishOk(
        ctx.run,
        await makeSource(ctx.srcRoot, "v1", V1_FILES),
        at(20),
      );
    const srcA = await makeSource(a.srcRoot, "v2", V2_FILES);
    const boom = {
      beforeStep: (n) => {
        if (n === failAt) throw new Error(`boom@${failAt}`);
      },
    };
    await assert.rejects(
      a.run(srcA, at(21), { hooks: boom }),
      new RegExp(`boom@${failAt}`),
    );

    const archive21 = path.join(
      a.siteRoot,
      "releases",
      archiveOf("v2", at(21)),
    );
    const archiveBefore =
      failAt === 9
        ? {
            bytes: await fsp.readFile(archive21),
            mtime: (await fsp.stat(archive21)).mtimeMs,
          }
        : null;
    await publishOk(a.run, srcA, at(22)); // 真實重跑的時間一定不同

    // 注入在 6：release.json 還沒換、沒有記錄可沿用 ⇒ 用第二次的 now；7、9：沿用第一次的
    const refNow = failAt === 6 ? at(22) : at(21);
    await publishOk(b.run, await makeSource(b.srcRoot, "v2", V2_FILES), refNow);
    assert.deepEqual(
      await snapshot(a.siteRoot, { withMtime: false }),
      await snapshot(b.siteRoot, { withMtime: false }),
    );
    const releaseA = await readRelease(a.siteRoot);
    assert.equal(Date.parse(releaseA.publishedAt), refNow.getTime());
    const v2Archives = (await readSite(a.siteRoot)).archives.filter(
      (x) => x.release.version === "v2",
    );
    assert.equal(v2Archives.length, 1);
    assert.deepEqual(v2Archives[0].release, releaseA);
    if (archiveBefore) {
      assert.deepEqual(await fsp.readFile(archive21), archiveBefore.bytes);
      assert.equal((await fsp.stat(archive21)).mtimeMs, archiveBefore.mtime);
    }
  });
}

test("publish apply：同一個資料夾連發兩次 ⇒ 第二次站台 listing（含 mtime）完全不變（B1）", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "twice");
  const src = await makeSource(srcRoot, "v1", V1_FILES);
  await publishOk(run, src, at(20));
  const before = await snapshot(siteRoot);
  const r = await publishOk(run, src, at(21));
  assert.deepEqual(await snapshot(siteRoot), before);
  const { added, changed, removed } = r.summary.diff;
  assert.deepEqual([added.length, changed.length, removed.length], [0, 0, 0]);
});

test("publish apply：B6 殘骸清掉，形狀不合的不碰", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "b6");
  await publishOk(
    run,
    await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
    at(22),
  );
  const exists = (rel) => fs.existsSync(path.join(siteRoot, rel));
  for (const rel of [
    `files/${"e".repeat(64)}.tmp`,
    "release.json.tmp",
    "releases/x.json.tmp",
  ]) {
    assert.equal(exists(rel), false, rel);
  }
  for (const rel of [
    "files/foo.tmp",
    "notes.tmp",
    "files/bootstrap-x/config/a.txt",
  ]) {
    assert.equal(exists(rel), true, rel);
  }
});

test("publish：健全檢查不過加 --force ⇒ 發版成功且 summary.forced", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "force");
  const r = await run(
    await makeSource(srcRoot, "v3", { "options.txt": "O" }),
    at(22),
    { force: true },
  );
  assert.equal(r.ok, true, r.report.join("\n"));
  assert.equal(r.summary.forced, true);
  assert.deepEqual(r.summary.sanity.reasons, ["removes-over-half"]);
  assert.equal((await readRelease(siteRoot)).version, "v3");
});

test("publish：乾跑預告的上傳與清理，等於 apply 實際新增與刪除的（2b-SPR #20）", async (t) => {
  const { siteRoot, srcRoot, run } = await seededSite(t, "predict");
  await publishOk(
    run,
    await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
    at(22),
  );
  const src = await makeSource(srcRoot, "v4", {
    "mods/a.jar": "A4",
    "mods/b.jar": "B",
    "config/c.toml": "C1",
    "options.txt": "O",
  });
  const dry = await run(src, at(23), { apply: false });
  const beforeBlobs = new Set((await readSite(siteRoot)).blobs.keys());
  const beforeArchives = (await readSite(siteRoot)).archives.map(
    (a) => `releases/${a.name}`,
  );
  await publishOk(run, src, at(23));
  const after = await readSite(siteRoot);
  const afterBlobs = new Set(after.blobs.keys());
  const afterArchives = new Set(
    after.archives.map((a) => `releases/${a.name}`),
  );
  assert.deepEqual(
    dry.summary.blobsToCopy.shas,
    [...afterBlobs].filter((s) => !beforeBlobs.has(s)).sort(),
  );
  assert.deepEqual(
    dry.summary.cleanup.blobs.shas,
    [...beforeBlobs].filter((s) => !afterBlobs.has(s)).sort(),
  );
  assert.deepEqual(
    dry.summary.cleanup.archives,
    beforeArchives.filter((a) => !afterArchives.has(a)),
  );
  assert.ok(
    dry.summary.cleanup.archives.length > 0,
    "這個情境要真的有封存被清，比對才有意義",
  );
  assert.ok(
    dry.summary.cleanup.blobs.shas.length > 0,
    "這個情境要真的有 blob 被清，比對才有意義",
  );
});

test("publish apply：刪不掉的 blob 記在 deleteFailures、其餘照刪、發版成功", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "unlink");
  const SHARED = {
    "options.txt": "O",
    "mods/s1.jar": "S1",
    "mods/s2.jar": "S2",
  };
  const versions = ["v1", "v2", "v3"];
  for (const [i, v] of versions.entries()) {
    // 每版共用 3 個檔、換 2 個：刪除數不過半，健全檢查才不會擋
    await publishOk(
      run,
      await makeSource(srcRoot, v, {
        ...SHARED,
        [`mods/${v}.jar`]: v,
        [`mods/${v}b.jar`]: `${v}b`,
      }),
      at(20 + i),
    );
  }
  const stuck = sha256("v1");
  const unlink = async (p) => {
    if (path.basename(p) === stuck)
      throw Object.assign(new Error("busy"), { code: "EBUSY" });
    return fsp.unlink(p);
  };
  const r = await run(
    await makeSource(srcRoot, "v4", { ...SHARED, "mods/v4.jar": "v4" }),
    at(23),
    { hooks: { unlink } },
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.summary.deleteFailures, [`files/${stuck}（EBUSY）`]);
  const site = await readSite(siteRoot);
  assert.equal(site.blobs.has(stuck), true);
  assert.equal(site.blobs.has(sha256("v1b")), false);
  assert.match(r.report.join("\n"), /刪不掉、下次發版再試/);
});

test("publish：退到舊版後再發新版，剛退回的那份在份數外就被清（2b-SPR #5，owner 選 (i)）", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "rollback-then-publish");
  for (const [i, v] of ["v1", "v2", "v3"].entries()) {
    await publishOk(
      run,
      await makeSource(srcRoot, v, {
        "options.txt": "O",
        [`mods/${v}.jar`]: v,
      }),
      at(20 + i),
    );
  }
  const rb = await rollback({ siteRoot, to: 2, apply: true }); // 可退清單新到舊：1＝v2、2＝v1
  assert.equal(rb.ok, true, rb.report.join("\n"));
  assert.equal((await readRelease(siteRoot)).version, "v1");
  const src = await makeSource(srcRoot, "v4", {
    "options.txt": "O",
    "mods/v4.jar": "v4",
  });
  const dry = await run(src, at(23), { apply: false });
  assert.deepEqual(dry.summary.cleanup.archives, [
    `releases/${archiveOf("v1", at(20))}`,
  ]);
  await publishOk(run, src, at(23));
  const site = await readSite(siteRoot);
  assert.deepEqual(
    site.archives.map((a) => a.release.version),
    ["v4", "v3", "v2"],
  );
  assert.equal(site.blobs.has(sha256("v1")), false);
});

test("publish：步驟 7 失敗後改發別版 ⇒ 報告點名當前沒有封存（本檔上層沒列 7）", async (t) => {
  const { srcRoot, run } = await newSite(t, "no-archive");
  await publishOk(run, await makeSource(srcRoot, "v1", V1_FILES), at(20));
  const boom = {
    beforeStep: (n) => {
      if (n === 7) throw new Error("boom");
    },
  };
  await assert.rejects(
    run(await makeSource(srcRoot, "v2", V2_FILES), at(21), { hooks: boom }),
  );
  const r = await run(
    await makeSource(srcRoot, "v3", { ...V2_FILES, "mods/c.jar": "C" }),
    at(22),
    { apply: false },
  );
  assert.deepEqual(r.summary.currentWithoutArchive, { version: "v2" });
  assert.match(r.report.join("\n"), /當前 release（v2）沒有對應封存/);
});

test("publish：壞的封存不佔 keepReleases 名額、不刪、列在 unreadableArchives（B5）", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "b5");
  for (const [i, v] of ["v1", "v2", "v3"].entries()) {
    await publishOk(
      run,
      await makeSource(srcRoot, v, {
        "options.txt": "O",
        [`mods/${v}.jar`]: v,
      }),
      at(20 + i),
    );
  }
  // 檔名合格、而且排在最新（字典序最大），內容壞
  await writeTree(siteRoot, {
    "releases/20991231-000000-bad.json": "{}",
    "releases/garbage.json": "{}",
  });
  const r = await publishOk(
    run,
    await makeSource(srcRoot, "v4", {
      "options.txt": "O",
      "mods/v4.jar": "v4",
    }),
    at(23),
  );
  assert.deepEqual(r.summary.unreadableArchives, [
    "releases/20991231-000000-bad.json",
    "releases/garbage.json",
  ]);
  const site = await readSite(siteRoot);
  assert.deepEqual(
    site.archives.map((a) => a.release.version),
    ["v4", "v3", "v2"],
  );
  for (const v of ["v2", "v3", "v4"])
    assert.equal(site.blobs.has(sha256(v)), true, v);
  assert.equal(
    fs.existsSync(path.join(siteRoot, "releases", "20991231-000000-bad.json")),
    true,
  );
  assert.deepEqual(
    (await rollback({ siteRoot, to: 1, apply: false })).ok,
    true,
  );
  assert.deepEqual(
    (await listReleases({ siteRoot })).others.map((a) => a.release.version),
    ["v3", "v2"],
  );
});

// ── 步驟 6：退版與清單 ──

/** 已發 v1、v2、v3（每版只換一個檔，健全檢查過得去） */
async function threeReleases(t, label) {
  const ctx = await newSite(t, label);
  const shared = { "options.txt": "O", "mods/s.jar": "S" };
  for (const [i, v] of ["v1", "v2", "v3"].entries()) {
    await publishOk(
      ctx.run,
      await makeSource(ctx.srcRoot, v, { ...shared, [`mods/${v}.jar`]: v }),
      at(20 + i),
    );
  }
  return ctx;
}

const blobAndArchiveCounts = async (siteRoot) => {
  const site = await readSite(siteRoot);
  return [site.blobs.size, site.archives.length];
};

test("listReleases：新到舊、不含當前；release.json 不存在 ⇒ 全部列為可退", async (t) => {
  const { siteRoot } = await threeReleases(t, "list");
  const list = await listReleases({ siteRoot });
  assert.equal(list.current.release.version, "v3");
  assert.deepEqual(
    list.others.map((a) => a.release.version),
    ["v2", "v1"],
  );
  assert.equal(list.currentWithoutArchive, false);
  await fsp.rm(path.join(siteRoot, "release.json"));
  const gone = await listReleases({ siteRoot });
  assert.equal(gone.releaseState, "missing");
  assert.equal(gone.current, null);
  assert.deepEqual(
    gone.others.map((a) => a.release.version),
    ["v3", "v2", "v1"],
  );
});

test("rollback --apply：release.json 逐字等於封存；不清理（blob 與封存數量不變）", async (t) => {
  const { siteRoot } = await threeReleases(t, "rb");
  const counts = await blobAndArchiveCounts(siteRoot);
  const r = await rollback({ siteRoot, to: 1, apply: true }); // 1＝v2
  assert.equal(r.ok, true, r.report.join("\n"));
  const archive = path.join(siteRoot, "releases", archiveOf("v2", at(21)));
  assert.deepEqual(
    await fsp.readFile(path.join(siteRoot, "release.json")),
    await fsp.readFile(archive),
  );
  assert.deepEqual(await blobAndArchiveCounts(siteRoot), counts);
  assert.equal(
    (await listReleases({ siteRoot })).current.release.version,
    "v2",
  );
});

test("rollback 沒加 --apply ⇒ 只驗與印 diff、站台不變", async (t) => {
  const { siteRoot } = await threeReleases(t, "rb-dry");
  const before = await snapshot(siteRoot);
  const r = await rollback({ siteRoot, to: 2, apply: false, details: true });
  assert.equal(r.ok, true);
  assert.match(
    r.report.join("\n"),
    /\[新增\] mods\/v1\.jar[\s\S]*\[刪除\] mods\/v3\.jar/,
  );
  const brief = await rollback({ siteRoot, to: 2, apply: false });
  assert.ok(
    !brief.report.some((l) => l.startsWith("[")),
    brief.report.join("\n"),
  );
  assert.ok(brief.report.includes("（逐檔清單請加 --details）"));
  assert.match(r.report.at(-1), /乾跑/);
  assert.deepEqual(await snapshot(siteRoot), before);
});

for (const [name, damage] of [
  ["被引用的 blob 被刪掉", (p) => fsp.rm(p)],
  [
    "被引用的 blob 換成同大小不同內容（2b-SPR #17）",
    (p) => fsp.writeFile(p, "x1"),
  ],
]) {
  test(`rollback 拒絕：${name} ⇒ ok:false、站台不變`, async (t) => {
    const { siteRoot } = await threeReleases(t, "rb-bad");
    await damage(path.join(siteRoot, "files", sha256("v1")));
    const before = await snapshot(siteRoot);
    const r = await rollback({ siteRoot, to: 2, apply: true }); // 2＝v1
    assert.equal(r.ok, false);
    assert.match(r.report[0], /拒絕退版到 v1/);
    assert.deepEqual(await snapshot(siteRoot), before);
  });
}

test("rollback --to 超界 ⇒ ok:false 並列出可退清單", async (t) => {
  const { siteRoot } = await threeReleases(t, "rb-range");
  const before = await snapshot(siteRoot);
  const r = await rollback({ siteRoot, to: 3, apply: true });
  assert.equal(r.ok, false);
  assert.deepEqual(
    r.report.slice(1).map((l) => l.trim().slice(0, 5)),
    ["1. v2", "2. v1"],
  );
  assert.deepEqual(await snapshot(siteRoot), before);
});

test("release.json 壞掉（B4）時退版照常可用：--rollback --to 1 --apply 換回最新封存（B10）", async (t) => {
  const { siteRoot } = await threeReleases(t, "b4-rb");
  await fsp.writeFile(path.join(siteRoot, "release.json"), "{broken");
  const list = await listReleases({ siteRoot });
  assert.equal(list.releaseState, "invalid");
  assert.deepEqual(
    list.others.map((a) => a.release.version),
    ["v3", "v2", "v1"],
  );
  const r = await rollback({ siteRoot, to: 1, apply: true });
  assert.equal(r.ok, true, r.report.join("\n"));
  assert.match(r.report.join("\n"), /當前無法讀取/);
  const archive = path.join(siteRoot, "releases", archiveOf("v3", at(22)));
  assert.deepEqual(
    await fsp.readFile(path.join(siteRoot, "release.json")),
    await fsp.readFile(archive),
  );
});

test("B4 修法②：刪掉 release.json 後重發 ⇒ 走首發、保留集內舊 blob 還在", async (t) => {
  const { siteRoot, srcRoot, run } = await threeReleases(t, "b4-fix2");
  await fsp.writeFile(path.join(siteRoot, "release.json"), "{broken");
  await fsp.rm(path.join(siteRoot, "release.json"));
  const r = await publishOk(
    run,
    await makeSource(srcRoot, "v4", {
      "options.txt": "O",
      "mods/s.jar": "S",
      "mods/v4.jar": "v4",
    }),
    at(23),
  );
  assert.equal(r.summary.previous, null);
  const site = await readSite(siteRoot);
  assert.deepEqual(
    site.archives.map((a) => a.release.version),
    ["v4", "v3", "v2"],
  );
  for (const v of ["v2", "v3", "v4"])
    assert.equal(site.blobs.has(sha256(v)), true, v);
});

// ── N32 站台索引的白名單（R9、R13）：認得的只有「沒有」「v3」「v2 舊索引」，其餘拒發 ──

const V3_INDEX = {
  format: 3,
  gate: "gate.json",
  notice: "notice.json",
  release: "release.json",
  files: "files/",
};
const asJson = (x) => JSON.stringify(x);
const LEGACY_LINE = /舊 manifest 欄位/;

/** 換掉站台的 manifest.json；內容結尾 / ＝放一個同名資料夾 */
async function putManifest(siteRoot, content) {
  await fsp.rm(path.join(siteRoot, "manifest.json"), {
    recursive: true,
    force: true,
  });
  if (content === null) return;
  if (content === "/") await writeTree(siteRoot, { "manifest.json/": "" });
  else await writeTree(siteRoot, { "manifest.json": content });
}

// [名稱, manifest.json 內容, 訊息前半要含的成因, 有沒有修法（newer 沒有）]
const MANIFEST_REFUSALS = [
  [
    'v3 索引 gate 寫成 "http://"',
    asJson({ ...V3_INDEX, gate: "http://" }),
    /index\.gate/,
    true,
  ],
  ["format 4", asJson({ ...V3_INDEX, format: 4 }), /比這個發版工具新/, false],
  [
    'format 字串 "3"',
    asJson({ ...V3_INDEX, format: "3" }),
    /index\.format/,
    true,
  ],
  [
    "合法 v3 另把 gate 寫壞、帶 schemaVersion 2",
    asJson({ ...V3_INDEX, gate: "http://", schemaVersion: 2 }),
    /index\.gate/,
    true,
  ],
  [
    "{ format: null, schemaVersion: 2 }",
    asJson({ format: null, schemaVersion: 2 }),
    /index\.format/,
    true,
  ],
  ["不是合法 JSON（多一個逗號）", '{ "format": 3, }', /JSON 解析失敗/, true],
  ["manifest.json 是資料夾", "/", /讀取失敗/, true],
  ["內容是 []", "[]", /認不出這份索引/, true],
  ["內容是 null", "null", /認不出這份索引/, true],
  ["內容是 3", "3", /認不出這份索引/, true],
  ['內容是 "str"', '"str"', /認不出這份索引/, true],
  ["內容是 true", "true", /認不出這份索引/, true],
  [
    "format 拼成 fromat",
    asJson({
      fromat: 3,
      gate: "gate.json",
      notice: "notice.json",
      release: "release.json",
      files: "files/",
    }),
    /拼錯/,
    true,
  ],
  ["{}", "{}", /認不出這份索引/, true],
  [
    "{ schemaVersion: 1 }",
    asJson({ schemaVersion: 1 }),
    /認不出這份索引/,
    true,
  ],
  [
    "{ schemaVersion: 3 }",
    asJson({ schemaVersion: 3 }),
    /認不出這份索引/,
    true,
  ],
  // v2 只認數字 2 與字串 "2"：Number() 會把 [2]、"2.0" 也算成 2（owner 2026-10-04 裁收緊）
  [
    "{ schemaVersion: [2] }",
    asJson({ schemaVersion: [2] }),
    /認不出這份索引/,
    true,
  ],
  [
    '{ schemaVersion: "2.0" }',
    asJson({ schemaVersion: "2.0" }),
    /認不出這份索引/,
    true,
  ],
];

test("N32 拒發表共 18 格", () => {
  assert.equal(MANIFEST_REFUSALS.length, 18);
});

for (const [name, content, cause, fixable] of MANIFEST_REFUSALS) {
  test(`N32 拒發：${name} ⇒ 乾跑、--apply、--apply --force 都拒，整站不變`, async (t) => {
    const { siteRoot, srcRoot, run } = await newSite(t, "manifest-refuse");
    await putManifest(siteRoot, content);
    const src = await makeSource(srcRoot, "v1", V1_FILES);
    const before = await snapshot(siteRoot);
    for (const extra of [
      { apply: false },
      { apply: true },
      { apply: true, force: true },
    ]) {
      const r = await run(src, at(20), extra);
      const where = `${name} ${JSON.stringify(extra)}`;
      assert.equal(r.ok, false, where);
      const e = r.summary.errors.find((x) => x.code === "manifest-invalid");
      assert.ok(e, `${where}：${JSON.stringify(r.summary.errors)}`);
      assert.equal(e.path, "manifest.json");
      assert.match(e.message, cause, where);
      if (fixable) {
        assert.ok(
          e.message.includes(
            `Remove-Item -LiteralPath "${path.join(siteRoot, "manifest.json")}"`,
          ),
          e.message,
        );
        assert.ok(
          e.message.includes(
            `node scripts/publish.js "${src}" --site-root "${siteRoot}" --apply`,
          ),
          e.message,
        );
      } else {
        assert.equal(e.message.includes("Remove-Item"), false, e.message);
      }
      assert.deepEqual(await snapshot(siteRoot), before, where);
      const report = r.report.join("\n");
      assert.doesNotMatch(report, LEGACY_LINE, where);
      assert.match(report, /拒絕發版，站台未動/, where);
    }
  });
}

test("N32 放行：沒有 manifest.json ⇒ --apply 寫出標準索引", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "manifest-none");
  await putManifest(siteRoot, null);
  await publishOk(run, await makeSource(srcRoot, "v1", V1_FILES), at(20));
  const written = JSON.parse(
    await fsp.readFile(path.join(siteRoot, "manifest.json"), "utf8"),
  );
  assert.deepEqual(written, V3_INDEX);
});

for (const [label, schemaVersion] of [
  ["數字 2", 2],
  ['字串 "2"', "2"],
]) {
  test(`N32 放行：v2 舊索引 schemaVersion ${label} ⇒ 報告列舊欄位、--apply 寫出標準索引`, async (t) => {
    const { siteRoot, srcRoot, run } = await newSite(t, "manifest-v2");
    await putManifest(siteRoot, asJson({ ...V2_MANIFEST, schemaVersion }));
    const r = await publishOk(
      run,
      await makeSource(srcRoot, "v1", V1_FILES),
      at(20),
    );
    assert.match(r.report.join("\n"), LEGACY_LINE);
    const written = JSON.parse(
      await fsp.readFile(path.join(siteRoot, "manifest.json"), "utf8"),
    );
    assert.deepEqual(written, V3_INDEX);
  });
}

test("N32 放行：合法的 v3 索引（gate 換別的檔名）⇒ --apply 之後一個位元組都沒變", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "manifest-v3");
  const text = asJson({ ...V3_INDEX, gate: "gate-custom.json" });
  await putManifest(siteRoot, text);
  await publishOk(run, await makeSource(srcRoot, "v1", V1_FILES), at(20));
  assert.equal(
    await fsp.readFile(path.join(siteRoot, "manifest.json"), "utf8"),
    text,
  );
});

for (const [label, content] of [
  ["format 4", asJson({ ...V3_INDEX, format: 4 })],
  ["null", "null"],
]) {
  test(`N32 退版不受影響：站台索引是 ${label} ⇒ --list 照常、--rollback --to 1 --apply 成功、索引不變`, async (t) => {
    const { siteRoot } = await threeReleases(t, "manifest-rollback");
    await putManifest(siteRoot, content);
    const list = await listReleases({ siteRoot });
    assert.equal(list.current.release.version, "v3");
    assert.deepEqual(
      list.others.map((a) => a.release.version),
      ["v2", "v1"],
    );
    const rb = await rollback({ siteRoot, to: 1, apply: true });
    assert.equal(rb.ok, true, rb.report.join("\n"));
    assert.equal((await readRelease(siteRoot)).version, "v2");
    assert.equal(
      await fsp.readFile(path.join(siteRoot, "manifest.json"), "utf8"),
      content,
    );
  });
}

test("N32 修法走得通：被拒之後刪掉 manifest.json 再發 ⇒ 成功、寫出標準索引", async (t) => {
  const { siteRoot, srcRoot, run } = await newSite(t, "manifest-fix");
  await putManifest(siteRoot, "{}");
  const src = await makeSource(srcRoot, "v1", V1_FILES);
  assert.equal((await run(src, at(20))).ok, false);
  await fsp.rm(path.join(siteRoot, "manifest.json"));
  await publishOk(run, src, at(20));
  const written = JSON.parse(
    await fsp.readFile(path.join(siteRoot, "manifest.json"), "utf8"),
  );
  assert.deepEqual(written, V3_INDEX);
});
