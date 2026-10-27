"use strict";

// version json 的 library：合併父子清單、本機路徑與下載網址。
// 下載端、啟動端與就緒檢查共用同一份（④a 自 main/ 搬來，→ _notes/plans/instance-sync-v3-commit4a.md）。
// 要不要在這台機器用 → lib/launch-args.js 的 filterLibraries（⑤b）。不 require("electron")。

const { checkStrictRelPath } = require("./sync/rel-path.js");

function libraryKey(lib) {
  const name = lib?.name;
  if (typeof name === "string" && name.trim()) return `name:${name.trim()}`;
  const artPath = lib?.downloads?.artifact?.path;
  if (typeof artPath === "string" && artPath.trim())
    return `path:${artPath.trim()}`;
  return `json:${JSON.stringify(lib)}`;
}

function mergeLibraries(parentLibs, childLibs) {
  const m = new Map();
  // 唯一呼叫者 mergeVersionChain：父層是它自己累積的陣列，子層已擋掉「有但不是陣列」
  const combined = [...parentLibs, ...childLibs];
  for (const lib of combined) {
    const k = libraryKey(lib);
    if (m.has(k)) m.delete(k);
    m.set(k, lib);
  }
  return [...m.values()];
}

/** 資料本身不能用（不是程式錯）時的錯誤碼 */
const BAD_LIBRARY = "GGL_BAD_LIBRARY";
const badLibrary = (message) => Object.assign(new Error(message), { code: BAD_LIBRARY });

// group:artifact:version[:classifier]；@ 是 Maven 的副檔名寫法，不支援
const MAVEN_NAME = /^([^:@]+):([^:@]+):([^:@]+)(?::([^:@]+))?$/;

function mavenRelPath(label, name) {
  const m = typeof name === "string" ? MAVEN_NAME.exec(name) : null;
  if (!m) {
    throw badLibrary(
      `${label}: name 不是 group:artifact:version[:classifier]`,
    );
  }
  const [, group, artifact, version, classifier] = m;
  const file = `${artifact}-${version}${classifier ? `-${classifier}` : ""}.jar`;
  return `${group.replace(/\./g, "/")}/${artifact}/${version}/${file}`;
}

/**
 * 一支 library 在 libraries/ 底下的路徑與下載資訊。
 * 有 downloads.artifact ⇒ 用它（原版）；沒有 downloads ⇒ 由 name 推 Maven 路徑、url 接在 lib.url 後（Fabric）。
 * 推不出來、或路徑會跳出 libraries/ ⇒ 丟錯（→ _notes/plans/instance-sync-v3-commit4a.md A3、B4、B5）。
 * @returns {{ rel: string, url: string, sha1: string, size: number }}  rel 以 "/" 分隔、相對 libraries/
 */
function libraryArtifact(lib) {
  const label = `library ${lib?.name ?? "(沒有 name)"}`;
  let out;
  if (lib?.downloads !== undefined) {
    const a = lib.downloads?.artifact;
    if (!a || typeof a.path !== "string") {
      throw badLibrary(`${label}: 有 downloads 但沒有 artifact`);
    }
    out = {
      rel: a.path,
      url: String(a.url ?? ""),
      sha1: String(a.sha1 ?? ""),
      size: Number(a.size) || 0,
    };
  } else {
    const rel = mavenRelPath(label, lib?.name);
    if (typeof lib.url !== "string" || lib.url === "") {
      throw badLibrary(`${label}: 沒有 url`);
    }
    out = {
      rel,
      url: `${lib.url.replace(/\/+$/, "")}/${rel}`,
      sha1: String(lib.sha1 ?? ""),
      size: Number(lib.size) || 0,
    };
  }
  const checked = checkStrictRelPath(out.rel);
  if (!checked.ok) {
    throw badLibrary(`${label}: 路徑不合法（${checked.code}）：${out.rel}`);
  }
  return out;
}

module.exports = {
  mergeLibraries,
  libraryArtifact,
};
