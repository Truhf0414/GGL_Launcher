"use strict";

// 原版與 Fabric version json 的驗證：本機讀到的與網路抓到的都用它，過了才寫進 versions/ 或拿來下載。
// 比 ④a runtimeNeeds 的形狀檢查嚴（→ _notes/plans/instance-sync-v3-commit4b.md §設計「兩份 json」）。
// 回 { ok: true } | { ok: false, error }，不丟例外。不 require("electron")。

const { libraryArtifact } = require("./library-filter.js");
const { checkLaunchSpec } = require("./launch-args.js");
const { checkStrictRelPath } = require("./sync/rel-path.js");

const isObject = (x) =>
  x !== null && typeof x === "object" && !Array.isArray(x);
const isNonEmptyString = (x) => typeof x === "string" && x !== "";
const isSha1 = (x) => typeof x === "string" && /^[0-9a-f]{40}$/i.test(x);
const isSize = (x) => Number.isSafeInteger(x) && x >= 0;
const isHttpUrl = (x) => typeof x === "string" && /^https?:\/\//i.test(x);

/** 每支 library：E1 不支援 classifiers 式 natives；路徑推得出來；sha1 照 sha1Ok */
function checkLibraries(libs, sha1Ok) {
  if (!Array.isArray(libs)) return "libraries 不是陣列";
  for (const lib of libs) {
    const label = `library ${lib?.name ?? "(沒有 name)"}`;
    if (lib?.downloads?.classifiers !== undefined) {
      return `${label}: 帶 downloads.classifiers（舊式 natives），這版 Minecraft 不支援`;
    }
    let art;
    try {
      art = libraryArtifact(lib);
    } catch (e) {
      return String(e?.message ?? e);
    }
    if (!sha1Ok(art.sha1)) return `${label}: sha1 不合法（${art.sha1}）`;
  }
  return null;
}

const fail = (error) => ({ ok: false, error });

/** 參數、rules、logging 在更新時就驗，不等按下啟動（⑤a Z1）；程式錯照丟 */
function launchSpecResult(json) {
  const r = checkLaunchSpec(json);
  return r.ok ? r : fail(`啟動資料：${r.error}`);
}

function checkVanillaJson(json, minecraft) {
  if (!isObject(json)) return fail("原版 json 不是物件");
  if (json.id !== minecraft)
    return fail(`原版 json 的 id 是 ${json.id}，要 ${minecraft}`);

  const jv = json.javaVersion;
  if (!(Number.isSafeInteger(jv?.majorVersion) && jv.majorVersion > 0)) {
    return fail("javaVersion.majorVersion 不是正整數");
  }
  if (!isNonEmptyString(jv.component))
    return fail("javaVersion.component 不是非空字串");

  const c = json.downloads?.client;
  if (!isHttpUrl(c?.url)) return fail("downloads.client.url 不是 http(s) 網址");
  if (!isSha1(c.sha1)) return fail("downloads.client.sha1 不是 40 位 hex");
  if (!isSize(c.size)) return fail("downloads.client.size 不是非負整數");

  const a = json.assetIndex;
  if (typeof a?.id !== "string" || !checkStrictRelPath(`${a.id}.json`).ok) {
    return fail(`assetIndex.id 不合法（${a?.id}）`);
  }
  if (!isHttpUrl(a.url)) return fail("assetIndex.url 不是 http(s) 網址");
  if (!isSha1(a.sha1)) return fail("assetIndex.sha1 不是 40 位 hex");
  if (!isSize(a.size)) return fail("assetIndex.size 不是非負整數");

  const libError = checkLibraries(json.libraries, isSha1);
  return libError ? fail(libError) : launchSpecResult(json);
}

function checkFabricJson(json, { minecraft, launchId }) {
  if (!isObject(json)) return fail("Fabric json 不是物件");
  if (json.id !== launchId)
    return fail(`Fabric json 的 id 是 ${json.id}，要 ${launchId}`);
  if (json.inheritsFrom !== minecraft) {
    return fail(
      `Fabric json 的 inheritsFrom 是 ${json.inheritsFrom}，要 ${minecraft}`,
    );
  }
  // 少了會在合併時退回原版的 mainClass，默默啟動成原版（minecraft-version-json.js:61）
  if (!isNonEmptyString(json.mainClass))
    return fail("Fabric json 沒有 mainClass");

  // intermediary、fabric-loader 沒有 sha1（現查 fixture）
  const libError = checkLibraries(json.libraries, (s) => s === "" || isSha1(s));
  return libError ? fail(libError) : launchSpecResult(json);
}

module.exports = { checkVanillaJson, checkFabricJson };
