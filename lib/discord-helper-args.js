"use strict";

// server-config 的 discord 區塊＋環境變數 → rpc-helper.exe 的 argv（純函式，main/discord-rpc.js 負責 spawn）
const { filterButtonUrl } = require("./discord-button-url.js");

/**
 * @param {{
 *   discord: { clientId: string, largeImageKey: string, largeImageText: string, stateText: string,
 *              inviteUrl: string, downloadLauncherUrl: string, allowedButtonHosts: string[] },
 *   envClientId?: string,
 *   pid: number,
 *   debug: boolean,
 *   lockPath: string,
 *   helperLogPath: string,
 *   statusPath: string,
 * }} input
 * @returns {{ ok: true, clientId: string, args: string[] } | { ok: false, reason: "missing-client-id" }}
 */
function buildDiscordHelperArgs(input) {
  const {
    discord,
    envClientId,
    pid,
    debug,
    lockPath,
    helperLogPath,
    statusPath,
  } = input;
  const clientId =
    String(envClientId || "").trim() || String(discord.clientId || "").trim();
  if (!clientId) return { ok: false, reason: "missing-client-id" };

  const joinUrl = filterButtonUrl(
    discord.inviteUrl,
    discord.allowedButtonHosts,
  );
  const dlUrl = filterButtonUrl(
    discord.downloadLauncherUrl,
    discord.allowedButtonHosts,
  );
  const args = [
    "--clientId",
    clientId,
    "--pid",
    String(pid),
    "--stateText",
    String(discord.stateText),
    "--largeImageKey",
    String(discord.largeImageKey),
    "--largeImageText",
    String(discord.largeImageText),
    "--button1Label",
    "加入伺服器",
    "--button1Url",
    joinUrl,
    "--button2Label",
    "下載啟動器",
    "--button2Url",
    dlUrl,
    "--lockPath",
    lockPath,
    "--debug",
    debug ? "1" : "0",
    ...(debug
      ? ["--selfLogPath", helperLogPath, "--statusPath", statusPath]
      : []),
  ];
  return { ok: true, clientId, args };
}

module.exports = { buildDiscordHelperArgs };
