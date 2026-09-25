"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildDiscordHelperArgs } = require("../lib/discord-helper-args.js");

const DISCORD = {
  clientId: "cfg-id",
  largeImageKey: "img",
  largeImageText: "IMG",
  stateText: "state",
  inviteUrl: "https://discord.gg/abc",
  downloadLauncherUrl: "https://example.com/dl",
  allowedButtonHosts: [],
};

function build(over = {}) {
  return buildDiscordHelperArgs({
    discord: DISCORD,
    envClientId: "",
    pid: 1234,
    debug: false,
    lockPath: "L",
    helperLogPath: "H",
    statusPath: "S",
    ...over,
  });
}

function argValue(args, flag) {
  const i = args.indexOf(flag);
  return i < 0 ? undefined : args[i + 1];
}

test("buildDiscordHelperArgs: 環境變數優先於 server-config 的 clientId", () => {
  const r = build({ envClientId: " env-id " });
  assert.equal(r.ok, true);
  assert.equal(argValue(r.args, "--clientId"), "env-id");
});

test("buildDiscordHelperArgs: 環境變數空白 ⇒ 用 server-config 的值", () => {
  const r = build({ envClientId: "   " });
  assert.equal(argValue(r.args, "--clientId"), "cfg-id");
  assert.equal(argValue(r.args, "--stateText"), "state");
  assert.equal(argValue(r.args, "--button1Url"), "https://discord.gg/abc");
});

test("buildDiscordHelperArgs: 兩邊都沒有 clientId ⇒ 不啟動", () => {
  const r = build({ discord: { ...DISCORD, clientId: "" } });
  assert.deepEqual(r, { ok: false, reason: "missing-client-id" });
});

test("buildDiscordHelperArgs: 不在 allowedButtonHosts 的按鈕網址被清空", () => {
  const r = build({
    discord: { ...DISCORD, allowedButtonHosts: ["discord.gg"] },
  });
  assert.equal(argValue(r.args, "--button1Url"), "https://discord.gg/abc");
  assert.equal(argValue(r.args, "--button2Url"), "");
});

test("buildDiscordHelperArgs: debug 才帶 log 路徑", () => {
  assert.equal(argValue(build().args, "--selfLogPath"), undefined);
  const r = build({ debug: true });
  assert.equal(argValue(r.args, "--debug"), "1");
  assert.equal(argValue(r.args, "--selfLogPath"), "H");
  assert.equal(argValue(r.args, "--statusPath"), "S");
});
