"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { resolveCliOptions } = require("../scripts/publish.js");

// 測試用設定：刻意不用 publish-config.js 的真路徑，resolveCliOptions 本身也不碰檔案系統
const CONFIG = {
  siteRoot: path.resolve("fake-site"),
  releaseSourceRoot: path.resolve("fake-release"),
};
const resolve = (...argv) => resolveCliOptions(argv, CONFIG);

test("resolveCliOptions：沒給 --site-root ⇒ 用設定的預設值且乾跑", () => {
  const r = resolve("GGL3.1.02");
  assert.equal(r.ok, true);
  assert.equal(r.mode, "publish");
  assert.equal(r.siteRoot, CONFIG.siteRoot);
  assert.equal(r.siteRootIsDefault, true);
  assert.equal(r.dryRun, true);
  assert.equal(r.force, false);
});

test("resolveCliOptions：給了 --site-root 就用給的，即使值等於預設也不算預設", () => {
  const other = path.resolve("other-site");
  const r = resolve("v1", "--site-root", other, "--apply", "--force");
  assert.equal(r.siteRoot, other);
  assert.equal(r.siteRootIsDefault, false);
  assert.equal(r.dryRun, false);
  assert.equal(r.force, true);
  const same = resolve("v1", "--site-root", CONFIG.siteRoot);
  assert.equal(same.siteRootIsDefault, false);
});

test("resolveCliOptions：版本資料夾相對 ⇒ 接在 release root 底下；絕對 ⇒ 照用（B9）", () => {
  assert.equal(
    resolve("v1").sourceDir,
    path.join(CONFIG.releaseSourceRoot, "v1"),
  );
  const root = path.resolve("elsewhere");
  assert.equal(
    resolve("v1", "--release-root", root).sourceDir,
    path.join(root, "v1"),
  );
  const abs = path.resolve("abs-source", "v9");
  assert.equal(resolve(abs).sourceDir, abs);
});

test("resolveCliOptions：--details 在 publish 與 rollback 可用，預設 false", () => {
  assert.equal(resolve("v1").details, false);
  assert.equal(resolve("v1", "--details").details, true);
  assert.equal(resolve("--rollback", "--to", "1", "--details").details, true);
});

test("resolveCliOptions：四個模式的正常用法", () => {
  assert.deepEqual(
    [
      resolve("--list").mode,
      resolve("--rollback").mode,
      resolve("--rollback", "--to", "2").mode,
    ],
    ["list", "rollback-list", "rollback"],
  );
  const r = resolve(
    "--rollback",
    "--to",
    "2",
    "--apply",
    "--site-root",
    CONFIG.siteRoot,
  );
  assert.equal(r.to, 2);
  assert.equal(r.dryRun, false);
  assert.equal(resolve("--rollback", "--to", "2").dryRun, true);
});

test("resolveCliOptions：模式白名單外的旗標 ⇒ ok:false", () => {
  const cases = [
    ["--rollback", "--apply"], // 忘了 --to，不准默默變成只列清單
    ["--list", "--force"],
    ["--list", "--details"],
    ["--rollback", "--details"],
    ["--list", "--apply"],
    ["--list", "--release-root", "x"],
    ["--rollback", "--force"],
    ["--rollback", "--to", "1", "--force"],
    ["--rollback", "--to", "1", "--release-root", "x"],
  ];
  for (const argv of cases) {
    const r = resolveCliOptions(argv, CONFIG);
    assert.equal(r.ok, false, argv.join(" "));
    assert.match(r.usage, /用法/);
  }
});

test("resolveCliOptions：參數錯誤各自 ok:false", () => {
  const cases = [
    ["--rollback", "--to", "0"],
    ["--rollback", "--to", "-1"],
    ["--rollback", "--to", "1.5"],
    ["--rollback", "--to", "abc"],
    ["--to", "1"], // 沒配 --rollback
    ["v1", "--to", "1"],
    ["--list", "--rollback"],
    ["v1", "--bogus"], // 未知旗標
    [], // publish 模式沒給版本資料夾
    ["v1", "v2"], // 給兩個
    ["--list", "v1"],
    ["--rollback", "v1"],
    ["v1", "--site-root", ""],
    ["v1", "--site-root"], // 沒給值
  ];
  for (const argv of cases) {
    assert.equal(
      resolveCliOptions(argv, CONFIG).ok,
      false,
      JSON.stringify(argv),
    );
  }
});

// ── 報告格式：只斷言關鍵行存在與順序，版面 owner 驗收時再調 ──

const { formatPublishReport } = require("../scripts/lib/publish.js");

const MB = 1024 * 1024;
const SUMMARY = {
  siteRoot: "S",
  siteRootIsDefault: true,
  version: "GGL3.1.02",
  minecraft: "1.21.11",
  loader: { type: "fabric", version: "0.19.3" },
  previous: { version: "GGL3.1.01", publishedAt: "2026-09-10T12:00:00+08:00" },
  diff: {
    added: ["mods/foo-1.2.jar"],
    changed: ["config/bar.toml"],
    removed: ["mods/foo-1.1.jar"],
    unchanged: 195,
    playerEditableTouched: ["config/bar.toml"],
    playerEditableListChanged: { added: [], removed: ["servers.dat"] },
  },
  excluded: [
    { path: "mods/.index/a.pw.toml", rule: "**/.index/**" },
    { path: "mods/.index/b.pw.toml", rule: "**/.index/**" },
    {
      path: "shaderpacks/EuphoriaPatches_1/x.glsl",
      rule: "shaderpacks/*EuphoriaPatches*/",
    },
    {
      path: "shaderpacks/EuphoriaPatches_2/y.glsl",
      rule: "shaderpacks/*EuphoriaPatches*/",
    },
  ],
  blobsToCopy: { count: 4, bytes: 12.3 * MB, shas: [] },
  repairedBlobs: [],
  brokenRollbacks: [{ version: "GGL3.1.00", blobs: 2 }],
  cleanup: {
    blobs: { count: 7, bytes: 40.1 * MB, shas: [] },
    archives: ["releases/20260801-120000-GGL3.0.9.json"],
  },
  deleteFailures: [],
  staleTemps: [],
  nonBlobEntries: ["files/bootstrap-GGL3-launcher-test/"],
  unreadableArchives: [],
  currentWithoutArchive: null,
  legacyManifestFields: {
    notice: { title: "公告" },
    maintenance: { enabled: false, message: "" },
    minLauncherVersion: "1.0.0",
    notifications: [],
  },
  errors: [],
  sanity: { ok: true, reasons: [] },
  forced: false,
  dryRun: true,
};

function assertLinesInOrder(lines, patterns) {
  let from = 0;
  for (const re of patterns) {
    const i = lines.findIndex((l, idx) => idx >= from && re.test(l));
    assert.ok(i >= 0, `找不到（或順序不對）：${re}\n${lines.join("\n")}`);
    from = i + 1;
  }
}

test("formatPublishReport --details：乾跑報告的關鍵行與順序", () => {
  const lines = formatPublishReport(SUMMARY, { details: true });
  assertLinesInOrder(lines, [
    /^== 目標站台根：S（預設值）$/,
    /^== 發版預覽：GGL3\.1\.02（Minecraft 1\.21\.11／fabric 0\.19\.3）$/,
    /^上一版：GGL3\.1\.01（2026-09-10T12:00:00\+08:00 發）$/,
    /^新增 1　變更 1　刪除 1　不變 195$/,
    /^\[新增\] mods\/foo-1\.2\.jar$/,
    /^\[變更\] config\/bar\.toml +← 玩家可改檔/,
    /^\[刪除\] mods\/foo-1\.1\.jar$/,
    /^== 玩家可改清單有變：移出 servers\.dat/,
    /^== 排除（依規則）$/,
    /^mods\/\.index\/ +2 檔（\*\*\/\.index\/\*\*）$/,
    /^shaderpacks\/EuphoriaPatches_1\/ +1 檔（shaderpacks\/\*EuphoriaPatches\*\/）$/,
    /^shaderpacks\/EuphoriaPatches_2\/ +1 檔（shaderpacks\/\*EuphoriaPatches\*\/）$/,
    /^== 需上傳 blob：4 個，共 12\.3 MB$/,
    /^== 將清理：blob 7 個（共 40\.1 MB）；封存 1 份/,
    /^== 退路檢查：GGL3\.1\.00 有 2 個 blob 已損壞，該版無法退回$/,
    /^== 非 blob、不處理：files\/bootstrap-GGL3-launcher-test\/$/,
    /^== 舊 manifest 欄位（不會自動搬）：notice\.title=公告、maintenance\.enabled=false、maintenance\.message=、minLauncherVersion=1\.0\.0、notifications=0 筆$/,
    /^== 乾跑，未寫入任何檔。確認後加 --apply$/,
  ]);
});

test("formatPublishReport 預設：只印數量、玩家可改檔的數量與展開提示，不逐檔列", () => {
  const lines = formatPublishReport(SUMMARY);
  assert.equal(lines.filter((l) => /^\[(新增|變更|刪除)\]/.test(l)).length, 0);
  assertLinesInOrder(lines, [
    /^新增 1　變更 1　刪除 1　不變 195$/,
    /^== 玩家可改檔被新增或變更：1 個（會整檔覆蓋玩家版本，請寫進公告）$/,
    /^（逐檔清單請加 --details）$/,
  ]);
  const nothing = formatPublishReport({
    ...SUMMARY,
    diff: {
      ...SUMMARY.diff,
      added: [],
      changed: [],
      removed: [],
      playerEditableTouched: [],
    },
  });
  assert.ok(
    !nothing.some((l) => l.includes("--details") || l.includes("玩家可改檔被")),
  );
});

test("formatPublishReport 排除段：每個命中位置一行，新冒出來的 .index 看得到", () => {
  const lines = formatPublishReport({
    ...SUMMARY,
    excluded: [
      { path: "mods/.index/a.pw.toml", rule: "**/.index/**" },
      { path: "mods/.index/b.pw.toml", rule: "**/.index/**" },
      // 命中資料夾底下更深的檔，要算在命中的那一層，不是它自己所在的子資料夾
      { path: "mods/.index/sub/deep/c.pw.toml", rule: "**/.index/**" },
      { path: "resourcepacks/.index/r.pw.toml", rule: "**/.index/**" },
      { path: "config/somemod/.index/data.bin", rule: "**/.index/**" },
      { path: "config/a.bak", rule: "**/*.bak" },
      { path: "config/deep/b.bak", rule: "**/*.bak" },
      { path: "top.bak", rule: "**/*.bak" },
    ],
  });
  const start = lines.indexOf("== 排除（依規則）");
  assert.deepEqual(lines.slice(start + 1, start + 7), [
    "（根目錄）   1 檔（**/*.bak）",
    "config/   1 檔（**/*.bak）",
    "config/deep/   1 檔（**/*.bak）",
    "config/somemod/.index/   1 檔（**/.index/**）",
    "mods/.index/   3 檔（**/.index/**）",
    "resourcepacks/.index/   1 檔（**/.index/**）",
  ]);
});

test("formatPublishReport：拒絕與已寫入的結尾行；首發與 --force 的行", () => {
  const refused = formatPublishReport({
    ...SUMMARY,
    errors: [{ code: "sanity", message: "健全檢查不過" }],
  });
  assert.deepEqual(refused.slice(-2), [
    "== 拒絕發版，站台未動：",
    "[sanity] 健全檢查不過",
  ]);
  const applied = formatPublishReport({
    ...SUMMARY,
    dryRun: false,
    previous: null,
    forced: true,
    sanity: { ok: false, reasons: ["empty"] },
  });
  assert.equal(applied.at(-1), "== 已寫入。");
  assert.ok(applied.includes("上一版：無（首發）"));
  assert.ok(applied.includes("== 健全檢查不過（empty），已用 --force 放行"));
  const noDefault = formatPublishReport({
    ...SUMMARY,
    siteRootIsDefault: false,
  });
  assert.equal(noDefault[0], "== 目標站台根：S");
});

// ── CLI 本體：子行程真的跑，兩個路徑都明給，不碰 H: ──

const fsp = require("node:fs/promises");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const CLI = path.join(__dirname, "..", "scripts", "publish.js");
const MMC = JSON.stringify({
  components: [
    { uid: "net.minecraft", version: "1.21.11" },
    { uid: "net.fabricmc.fabric-loader", version: "0.19.3" },
  ],
});

async function cliWorkspace(t) {
  const work = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-publish-cli-"));
  t.after(() => fsp.rm(work, { recursive: true, force: true }));
  const site = path.join(work, "site");
  const make = async (version, files) => {
    const dir = path.join(work, "src", version);
    for (const [rel, content] of Object.entries({
      "mmc-pack.json": MMC,
      ...files,
    })) {
      await fsp.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
      await fsp.writeFile(path.join(dir, rel), content);
    }
    return dir;
  };
  const cli = (...args) =>
    spawnSync(process.execPath, [CLI, ...args, "--site-root", site], {
      encoding: "utf8",
    });
  return { site, make, cli };
}

test("CLI：乾跑 exit 0；--apply 寫入；--list／--rollback 列清單", async (t) => {
  const { site, make, cli } = await cliWorkspace(t);
  const src = await make("v1", { "mods/a.jar": "A", "options.txt": "O" });
  const dry = cli(src);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /乾跑，未寫入任何檔/);
  await assert.rejects(fsp.access(path.join(site, "release.json")));
  const applied = cli(src, "--apply");
  assert.equal(applied.status, 0, applied.stderr);
  assert.match(applied.stdout, /== 已寫入。/);
  await fsp.access(path.join(site, "release.json"));
  const list = spawnSync(
    process.execPath,
    [CLI, "--list", "--site-root", site],
    { encoding: "utf8" },
  );
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /當前：v1/);
  const rb = spawnSync(
    process.execPath,
    [CLI, "--rollback", "--site-root", site],
    { encoding: "utf8" },
  );
  assert.equal(rb.status, 0, rb.stderr);
  assert.match(rb.stdout, /沒有可退的版本/);
});

test("CLI：被拒絕 exit 1；參數錯 exit 1 並印用法", async (t) => {
  const { make, cli } = await cliWorkspace(t);
  const refused = cli(
    await make("v1", { "mods/a.jar": "A", "saves/w/level.dat": "S" }),
    "--apply",
  );
  assert.equal(refused.status, 1);
  assert.match(refused.stdout, /拒絕發版，站台未動/);
  const bad = cli("--rollback", "--apply");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /用法/);
});

test("CLI：步驟 6 寫到一半失敗 ⇒ exit 1、印「重跑同一道指令會收斂」；清掉障礙重跑就收斂", async (t) => {
  const { site, make, cli } = await cliWorkspace(t);
  // release.json.tmp 是資料夾：B6 刪不掉（記錄後繼續）、步驟 5 照常複製 blob、步驟 6 寫暫存檔才失敗
  await fsp.mkdir(path.join(site, "release.json.tmp"), { recursive: true });
  const src = await make("v1", { "mods/a.jar": "A" });
  const r = cli(src, "--apply");
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /重跑同一道指令會收斂/);
  const blobs = await fsp.readdir(path.join(site, "files"));
  assert.ok(
    blobs.length > 0,
    "步驟 5 已經寫了 blob，證明失敗真的發生在寫到一半",
  );
  await assert.rejects(fsp.access(path.join(site, "release.json")));

  await fsp.rm(path.join(site, "release.json.tmp"), { recursive: true });
  const again = cli(src, "--apply");
  assert.equal(again.status, 0, again.stderr);
  await fsp.access(path.join(site, "release.json"));
});

test("--list：release.json 沒有對應封存時點名當前版本", () => {
  const { formatReleaseList } = require("../scripts/lib/publish.js");
  const lines = formatReleaseList({
    releaseState: "ok",
    current: null,
    currentVersion: "v2",
    currentWithoutArchive: true,
    others: [],
    unreadable: [],
  });
  assert.equal(
    lines[0],
    "當前：v2（release.json 沒有對應的封存，下次發版後將無法退回）",
  );
});
