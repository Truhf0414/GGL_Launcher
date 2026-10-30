"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const serverConfig = require("../lib/server-config.js");

function assertDeepFrozen(o, where) {
  assert.ok(Object.isFrozen(o), `${where} 沒有 freeze`);
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === "object") assertDeepFrozen(v, `${where}.${k}`);
  }
}

test("server-config: 物件、巢狀物件、陣列全部 frozen", () => {
  assertDeepFrozen(serverConfig, "serverConfig");
});

test("server-config: manifestUrl 是 https", () => {
  assert.match(serverConfig.manifestUrl, /^https:\/\//);
});

test("server-config: protectedPaths 每項都是 gameDir 相對路徑", () => {
  assert.ok(serverConfig.protectedPaths.length > 0);
  for (const p of serverConfig.protectedPaths) {
    assert.equal(typeof p, "string");
    assert.ok(!p.startsWith("/"), p);
    assert.ok(!p.includes("\\"), p);
    assert.ok(!p.split("/").includes(".."), p);
  }
});

// → _notes/plans/instance-sync-v3-commit4d.md K3
test("K3 server-config 的頂層鍵：等於明列清單（多一個、少一個都紅）", () => {
  assert.deepEqual(Object.keys(serverConfig).sort(), [
    "discord",
    "instanceId",
    "launcherDownloadUrl",
    "launcherRootDir",
    "manifestUrl",
    "microsoftAuth",
    "protectedPaths",
    "serverStatus",
  ]);
});

// → _notes/plans/release-gate-2026-10.md G-4（OD-2b）：啟動器過舊時的下載入口，畫面的文字網址與按鈕都讀這一個值
test("G4 server-config.launcherDownloadUrl：固定是啟動器的 GitHub Releases 頁，https 且解析得了；discord.downloadLauncherUrl 不動", () => {
  assert.equal(
    serverConfig.launcherDownloadUrl,
    "https://github.com/Truhf0414/GGL_Launcher/releases",
  );
  assert.equal(new URL(serverConfig.launcherDownloadUrl).protocol, "https:");
  assert.equal(serverConfig.discord.downloadLauncherUrl, "");
});

test("server-config: loopbackPort 為合法 port", () => {
  const port = serverConfig.microsoftAuth.loopbackPort;
  assert.ok(Number.isInteger(port) && port >= 1 && port <= 65535, String(port));
});

// → _notes/plans/cross-review-2026-10-phase6c.md U4：lib/manifest-url-configured.js、lib/discord-button-url.js
// 不再在執行期防這些值的型別，保證改由這裡釘住（值跟程式一起出貨）
test('U4 server-config：manifestUrl 是字串；Discord 按鈕網址是 "" 或解析得了的 http(s)；白名單是小寫、去過空白的非空字串陣列', () => {
  assert.equal(typeof serverConfig.manifestUrl, "string");
  const { inviteUrl, downloadLauncherUrl, allowedButtonHosts } =
    serverConfig.discord;
  for (const [name, u] of [
    ["inviteUrl", inviteUrl],
    ["downloadLauncherUrl", downloadLauncherUrl],
  ]) {
    assert.equal(typeof u, "string", name);
    if (u === "") continue;
    assert.match(u, /^https?:\/\//, name);
    assert.doesNotThrow(() => new URL(u), name);
  }
  assert.ok(Array.isArray(allowedButtonHosts));
  for (const h of allowedButtonHosts) {
    assert.equal(typeof h, "string");
    assert.ok(h !== "" && h === h.trim().toLowerCase(), h);
  }
});
