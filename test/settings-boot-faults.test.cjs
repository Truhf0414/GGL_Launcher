"use strict";

// 開機恢復的 Windows 故障（真 fs、repo 裡的真函式）：任何一步失敗，正式檔都不被蓋掉、錯誤是 SettingsError、開機框不含 stack。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V6（EBUSY）、V15、V16；手法 → 同檔 §測試手法、§Probe 紀錄 Q5
// 黑箱＝只擺好檔案系統；需補丁＝在共用的 fs/promises 物件上包 open／readFile，在指定的兩步之間插事件。

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();

const { DEFAULT_SETTINGS, SettingsError, initSettingsAtBoot } = require("../main/settings.js");
const { reportStartupFailure } = require("../main/startup-failure.js");

const SKIP = process.platform !== "win32" && "鎖、ACL、改名被擋都是 Windows 的行為";
const NOW = Date.UTC(2026, 9, 21, 16, 30, 5); // 台北 2026-10-22 00:30:05
const BACKUP_NAME = "settings.broken-20261022-003005.json";
const BROKEN = Buffer.from('{"playerId": "Steve",'); // 語法錯 ⇒ 開機走恢復

const boot = (now = NOW) => initSettingsAtBoot({ now: () => now });

// 收尾一律倒著跑、各自吞錯：先放鎖、還原 ACL，最後才刪資料夾（檔還被鎖著時刪資料夾會 EBUSY，後面的收尾就跑不到）
async function setup(t) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-boot-faults-"));
  const cleanups = [];
  t.after(async () => {
    for (const fn of cleanups.reverse()) {
      try {
        await fn();
      } catch {
        // 清理：一個收不乾淨不擋其他的（資料夾在暫存區）
      }
    }
    await fsp.rm(dir, { recursive: true, force: true });
  });
  electron.paths.userData = dir;
  const file = path.join(dir, "settings.json");
  await fsp.writeFile(file, BROKEN);
  return { dir, file, backup: path.join(dir, BACKUP_NAME), cleanups };
}

const listDir = async (dir) => (await fsp.readdir(dir)).sort();
const tmpFiles = async (dir) => (await fsp.readdir(dir)).filter((n) => n.endsWith(".tmp"));

async function bootFails(reason, check = () => {}) {
  let caught;
  try {
    await boot();
  } catch (e) {
    caught = e;
  }
  assert.ok(caught instanceof SettingsError, `應為 SettingsError，實際 ${caught?.name}：${caught?.message}`);
  assert.equal(caught.reason, reason, caught.message);
  const boxes = [];
  reportStartupFailure({
    app: { quit: () => {} },
    showErrorBox: (_title, content) => boxes.push(content),
    err: caught,
  });
  assert.ok(!/\n\s+at /.test(boxes[0]), `開機框不放 stack：\n${boxes[0]}`);
  assert.ok(boxes[0].includes(caught.settingsPath), boxes[0]);
  check(caught);
  return caught;
}

async function assertTargetIsOriginal(file) {
  assert.ok((await fsp.readFile(file)).equals(BROKEN), "正式檔被改了");
}

// ── ACL：拒絕在資料夾裡建檔（WD＝建檔、AD＝建子資料夾）──
// 這台電腦名與使用者名相同時，只寫使用者名會被解析成電腦帳號、拒絕無效（Q5 實測），所以一律寫「電腦名\使用者名」

const ACCOUNT = `${process.env.COMPUTERNAME}\\${process.env.USERNAME}`;

async function denyCreate(h) {
  const { dir } = h;
  execFileSync("icacls", [dir, "/deny", `${ACCOUNT}:(WD,AD)`], { stdio: "pipe" });
  h.cleanups.push(() => allowCreate(dir));
  // 對照組：拒絕後建檔必須失敗；沒擋住＝這案測不到東西，讓它紅（不是 skip）
  const probe = path.join(dir, "acl-probe");
  let blocked = false;
  try {
    await fsp.writeFile(probe, "x");
  } catch (e) {
    blocked = e.code === "EPERM" || e.code === "EACCES";
  }
  if (!blocked) {
    allowCreate(dir);
    assert.fail(`ACL 對照組沒擋住建檔（${ACCOUNT}）`);
  }
}

function allowCreate(dir) {
  execFileSync("icacls", [dir, "/remove:d", ACCOUNT], { stdio: "pipe" });
}

// ── PowerShell 子行程持鎖（Node 沒有 FileShare.None 的開法）──

// 握手：子行程印 LOCKED 才算拿到鎖；stdin 收掉它就放鎖結束。等不到握手（20 秒）或沒拿到就結束 ⇒ 該案紅
async function lockWithPowerShell(h, filePath, share) {
  const script =
    `$f=[System.IO.File]::Open($env:GGL_LOCK_PATH,'Open','Read','${share}');` +
    "[Console]::Out.WriteLine('LOCKED');[Console]::Out.Flush();" +
    "[void][Console]::In.ReadLine();$f.Close()";
  const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    env: { ...process.env, GGL_LOCK_PATH: filePath },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = new Promise((resolve) => child.once("exit", resolve));
  async function release() {
    child.stdin.end();
    const killer = setTimeout(() => child.kill(), 5000);
    await exited;
    clearTimeout(killer);
  }
  h.cleanups.push(release);
  let out = "";
  let errText = "";
  child.stderr.on("data", (d) => (errText += d));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`等不到 PowerShell 拿鎖：${errText}`)), 20_000);
    child.stdout.on("data", (d) => {
      out += d;
      if (out.includes("LOCKED")) {
        clearTimeout(timer);
        resolve();
      }
    });
    exited.then((code) => {
      clearTimeout(timer);
      reject(new Error(`PowerShell 沒拿到鎖就結束（${code}）：${errText}`));
    });
  });
  return release;
}

// ── 在 fs/promises 上包 open：拿到 (filePath, flags) 決定插什麼 ──

function wrapOpen(t, around) {
  const realOpen = fsp.open;
  t.mock.method(fsp, "open", async function (filePath, flags, ...rest) {
    return around({ filePath: String(filePath), flags, open: () => realOpen.call(this, filePath, flags, ...rest) });
  });
}

// ── V6 ──

test("V6 讀檔時被 FileShare.None 鎖住（EBUSY）⇒ unreadable、不備份、不建暫存、目標不變", { skip: SKIP }, async (t) => {
  const h = await setup(t);
  const { dir, file } = h;
  await lockWithPowerShell(h, file, "None");
  const err = await bootFails("unreadable");
  assert.equal(err.cause.code, "EBUSY");
  assert.deepEqual(await listDir(dir), ["settings.json"]);
});

// ── V15 改名被擋 ──

test("V15 比對後改名時目標被行程內 fsp.open 開著 ⇒ recovery-failed(replace)、目標不變、我們的暫存已刪、備份＝原檔", { skip: SKIP }, async (t) => {
  const h = await setup(t);
  const { dir, file, backup } = h;
  const holder = await fsp.open(file, "r");
  h.cleanups.push(() => holder.close());
  const err = await bootFails("recovery-failed");
  assert.equal(err.step, "replace");
  assert.equal(err.cause.code, "EPERM");
  assert.equal(err.backupPath, backup);
  assert.ok(err.message.includes(backup), err.message);
  await assertTargetIsOriginal(file);
  assert.ok((await fsp.readFile(backup)).equals(BROKEN));
  assert.deepEqual(await tmpFiles(dir), []);
});

test("V15 暫存檔（改名的來源）被別人鎖著 ⇒ 改名失敗、目標不變、暫存刪不掉留下（不涵蓋：SPR #17）", { skip: SKIP }, async (t) => {
  const h = await setup(t);
  const { dir, file } = h;
  // 比對讀目標的那一刻，暫存檔已寫好關好：在這裡叫 PowerShell 鎖住它
  const realReadFile = fsp.readFile;
  let release = null;
  t.mock.method(fsp, "readFile", async function (p, ...rest) {
    const tmp = (await tmpFiles(dir))[0];
    if (String(p) === file && tmp && !release) {
      release = await lockWithPowerShell(h, path.join(dir, tmp), "Read");
    }
    return realReadFile.call(this, p, ...rest);
  });
  const err = await bootFails("recovery-failed");
  assert.ok(release, "補丁沒插到：比對時沒有暫存檔");
  assert.equal(err.step, "replace");
  assert.equal(err.cause.code, "EBUSY"); // 2026-10-22 本機連三次實測皆 EBUSY（FileShare.Read、沒給 Delete）
  await assertTargetIsOriginal(file);
  assert.equal((await tmpFiles(dir)).length, 1, "被鎖著的暫存刪不掉，留下");
  await release();
});

// ── V16 其餘故障 ──

test("V16 備份名被資料夾佔住（EEXIST，黑箱）⇒ recovery-failed(backup)、沒有暫存、那個資料夾不動", { skip: SKIP }, async (t) => {
  const { dir, file, backup } = await setup(t);
  await fsp.mkdir(backup);
  const err = await bootFails("recovery-failed");
  assert.equal(err.step, "backup");
  assert.equal(err.cause.code, "EEXIST");
  await assertTargetIsOriginal(file);
  assert.ok((await fsp.stat(backup)).isDirectory());
  assert.deepEqual(await listDir(dir), [BACKUP_NAME, "settings.json"]);
});

test("V16 ACL 拒絕建備份（黑箱＋對照組）⇒ recovery-failed(backup)、沒有備份、沒有暫存", { skip: SKIP }, async (t) => {
  const h = await setup(t);
  const { dir, file } = h;
  await denyCreate(h);
  try {
    const err = await bootFails("recovery-failed");
    assert.equal(err.step, "backup");
    assert.equal(err.cause.code, "EPERM");
    assert.equal(err.backupPath, null);
  } finally {
    allowCreate(dir);
  }
  await assertTargetIsOriginal(file);
  assert.deepEqual(await listDir(dir), ["settings.json"]);
});

test("V16 備份寫到一半失敗（需補丁，模擬 ENOSPC）⇒ recovery-failed(backup)、自己建的半截備份已刪", { skip: SKIP }, async (t) => {
  const { dir, file, backup } = await setup(t);
  wrapOpen(t, async ({ filePath, open }) => {
    const fh = await open();
    if (filePath !== backup) return fh;
    return {
      writeFile: async (bytes) => {
        await fh.writeFile(bytes.subarray(0, 5));
        throw Object.assign(new Error("ENOSPC: no space left on device, write"), {
          code: "ENOSPC",
          syscall: "write",
        });
      },
      sync: () => fh.sync(),
      close: () => fh.close(),
    };
  });
  const err = await bootFails("recovery-failed");
  assert.equal(err.step, "backup");
  assert.equal(err.cause.code, "ENOSPC");
  await assertTargetIsOriginal(file);
  assert.deepEqual(await listDir(dir), ["settings.json"]);
});

test("V16 暫存名被資料夾佔住（需補丁：暫存名帶亂數，建之前才知道）⇒ recovery-failed(temp)、備份＝原檔、那個資料夾不動", { skip: SKIP }, async (t) => {
  const { file, backup } = await setup(t);
  let squatted = null;
  wrapOpen(t, async ({ filePath, open }) => {
    if (filePath.endsWith(".tmp") && !squatted) {
      squatted = filePath;
      await fsp.mkdir(filePath);
    }
    return open();
  });
  const err = await bootFails("recovery-failed");
  assert.equal(err.step, "temp");
  assert.equal(err.cause.code, "EEXIST");
  assert.equal(err.backupPath, backup);
  await assertTargetIsOriginal(file);
  assert.ok((await fsp.readFile(backup)).equals(BROKEN));
  assert.ok((await fsp.stat(squatted)).isDirectory(), "不是我們建的，不刪");
});

test("V16 備份後才拒絕建暫存（需補丁＋對照組）⇒ recovery-failed(temp)；解除後再開機 ⇒ 第二次恢復成功、兩份備份都等於原檔", { skip: SKIP }, async (t) => {
  const h = await setup(t);
  const { dir, file, backup } = h;
  let denied = false;
  wrapOpen(t, async ({ filePath, open }) => {
    if (filePath.endsWith(".tmp") && !denied) {
      denied = true;
      await denyCreate(h);
    }
    return open();
  });
  try {
    const err = await bootFails("recovery-failed");
    assert.equal(err.step, "temp");
    assert.equal(err.cause.code, "EPERM");
    assert.equal(err.backupPath, backup);
  } finally {
    allowCreate(dir);
  }
  await assertTargetIsOriginal(file);
  assert.ok((await fsp.readFile(backup)).equals(BROKEN));
  assert.deepEqual(await tmpFiles(dir), []);

  t.mock.restoreAll();
  const later = NOW + 61_000; // 台北 00:31:06
  const r = await boot(later);
  const secondBackup = path.join(dir, "settings.broken-20261022-003106.json");
  assert.equal(r.recovered.backupPath, secondBackup);
  assert.deepEqual(r.settings, DEFAULT_SETTINGS);
  assert.ok((await fsp.readFile(backup)).equals(BROKEN));
  assert.ok((await fsp.readFile(secondBackup)).equals(BROKEN));
  assert.deepEqual(JSON.parse(await fsp.readFile(file, "utf8")), DEFAULT_SETTINGS);
});

test("V16 暫存建出後目標被改（需補丁）⇒ conflict、目標＝新內容、暫存已刪、備份＝原檔", { skip: SKIP }, async (t) => {
  const { dir, file, backup } = await setup(t);
  const edited = Buffer.from('{"playerId":"外部改的"}');
  wrapOpen(t, async ({ filePath, open }) => {
    const fh = await open();
    if (filePath.endsWith(".tmp")) await fsp.writeFile(file, edited);
    return fh;
  });
  const err = await bootFails("conflict");
  assert.equal(err.step, "compare");
  assert.ok((await fsp.readFile(file)).equals(edited), "外部改的內容被蓋掉了");
  assert.ok((await fsp.readFile(backup)).equals(BROKEN));
  assert.deepEqual(await tmpFiles(dir), []);
});
