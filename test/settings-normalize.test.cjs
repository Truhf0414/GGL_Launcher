"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeSettingsObject,
  REMOVED_SERVER_SETTING_KEYS,
} = require("../main/settings.js");
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

test("normalizeSettingsObject: 舊 settings.json 的 discord* 七鍵全部剔除", () => {
  assert.deepEqual(
    [...REMOVED_SERVER_SETTING_KEYS].sort(),
    Object.keys(LEGACY_DISCORD).sort(),
  );
  const out = normalizeSettingsObject({ playerId: "Steve", ...LEGACY_DISCORD });
  for (const k of Object.keys(LEGACY_DISCORD)) {
    assert.ok(!(k in out), k);
  }
  assert.equal(out.playerId, "Steve");
});

test("normalizeSettingsObject: 其他未知鍵照留（前向相容）", () => {
  const out = normalizeSettingsObject({ someFutureKey: 42 });
  assert.equal(out.someFutureKey, 42);
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
