"use strict";

// Fabric 的 meta／maven 網址與備援主機。清單照官方 installer 的 Reference.FABRIC_SERVICES 抄
// （→ _notes/plans/instance-sync-v3-commit4.md D6）；每次都從第一台試，不像 installer 記住上次成功的那台。
// 不 require("electron")。

const FABRIC_SERVICES = Object.freeze(
  [
    { meta: "https://meta.fabricmc.net/", maven: "https://maven.fabricmc.net/" },
    { meta: "https://meta2.fabricmc.net/", maven: "https://maven2.fabricmc.net/" },
    { meta: "https://meta3.fabricmc.net/", maven: "https://maven3.fabricmc.net/" },
  ].map((s) => Object.freeze(s)),
);

const DEFAULT_MAVEN = FABRIC_SERVICES[0].maven;

/** 版本字串不 encode（照 installer；validateRelease 已限定字元集） */
function profileJsonUrls(minecraft, loaderVersion) {
  return FABRIC_SERVICES.map(
    (s) => `${s.meta}v2/versions/loader/${minecraft}/${loaderVersion}/profile/json`,
  );
}

/** Fabric maven 上的檔 ⇒ 三台主機各一個網址；其他網址只有自己 */
function mavenUrlCandidates(url) {
  if (!url.startsWith(DEFAULT_MAVEN)) return [url];
  const rest = url.slice(DEFAULT_MAVEN.length);
  return FABRIC_SERVICES.map((s) => `${s.maven}${rest}`);
}

module.exports = { FABRIC_SERVICES, profileJsonUrls, mavenUrlCandidates };
