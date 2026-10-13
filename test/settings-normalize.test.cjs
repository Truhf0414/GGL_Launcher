"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { normalizeSettingsObject } = require("../main/settings.js");
const serverConfig = require("../lib/server-config.js");

const LEGACY_DISCORD = {
  discordClientId: "1494225911321595945",
  discordLargeImageKey: "ggl",
  discordLargeImageText: "GGL",
  discordStateText: "GGL3",
  discordButtonJoinServerUrl: "https://discord.gg/x",
  discordButtonDownloadLauncherUrl: "",
  discordAllowedButtonHosts: [],
};

// → _notes/plans/instance-sync-v3-commit4d.md K1
test("K1 normalizeSettingsObject 只輸出認得的鍵：舊 discord 鍵與未知鍵都不留", () => {
  const out = normalizeSettingsObject({
    ...LEGACY_DISCORD,
    someFutureKey: 42,
    playerId: "Steve",
  });
  assert.deepEqual(Object.keys(out).sort(), [
    "debugLogging",
    "launcherRootDir",
    "maxMemoryGb",
    "memoryGb",
    "minMemoryGb",
    "playerId",
  ]);
  assert.equal(out.playerId, "Steve");
});

// → _notes/plans/instance-sync-v3-commit4d.md K4（J4 的防線）
test("K4 預設檔讀得進，且它的每個鍵經正規化後都還在（新加的設定鍵忘了登記 ⇒ 紅）", () => {
  const raw = fs.readFileSync(
    path.join(__dirname, "..", "assets", "default-settings.json"),
    "utf8",
  );
  const defaults = JSON.parse(raw);
  assert.ok(defaults && typeof defaults === "object" && !Array.isArray(defaults));
  const kept = Object.keys(normalizeSettingsObject(defaults));
  // settings:set（J7）認得的鍵＝空物件正規化的輸出；兩條路都要涵蓋預設檔的每個鍵
  const known = Object.keys(normalizeSettingsObject({}));
  for (const k of Object.keys(defaults)) {
    assert.ok(kept.includes(k), `預設檔的鍵 ${k} 沒登記進 normalizeSettingsObject`);
    assert.ok(known.includes(k), `預設檔的鍵 ${k} 不在 settings:set 認得的鍵裡`);
  }
});

test("normalizeSettingsObject: launcherRootDir 空白 ⇒ server-config 的預設", () => {
  assert.equal(
    normalizeSettingsObject({ launcherRootDir: "  " }).launcherRootDir,
    serverConfig.launcherRootDir,
  );
  assert.equal(
    normalizeSettingsObject({}).launcherRootDir,
    serverConfig.launcherRootDir,
  );
});
