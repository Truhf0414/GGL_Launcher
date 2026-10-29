"use strict";

// 啟動參數照 version json 組：rules、合併版本鏈、library 過濾、classpath、log4j 設定檔、placeholder 展開。
// 設計 → _notes/plans/instance-sync-v3-commit5a.md。不 require("electron")。
// 錯誤兩種：json 內容不能用 ⇒ code GGL_BAD_VERSION_JSON（就緒只吞這種）；呼叫端用錯 ⇒ TypeError。

const path = require("path");
const { mergeLibraries, libraryArtifact } = require("./library-filter.js");
const { isSingleSegment } = require("./runtime-target.js");

const BAD_VERSION_JSON = "GGL_BAD_VERSION_JSON";
const badJson = (message) =>
  Object.assign(new Error(message), { code: BAD_VERSION_JSON });

const isObject = (x) =>
  x !== null && typeof x === "object" && !Array.isArray(x);
const own = (o, k) => (Object.hasOwn(o, k) ? o[k] : undefined);

/** 1.21.11 原版 json 的參數用到的全部 placeholder（logging 的 ${path} 不算，Y4） */
const PLACEHOLDER_KEYS = Object.freeze([
  "auth_player_name",
  "version_name",
  "game_directory",
  "assets_root",
  "assets_index_name",
  "auth_uuid",
  "auth_access_token",
  "clientid",
  "auth_xuid",
  "version_type",
  "resolution_width",
  "resolution_height",
  "quickPlayPath",
  "quickPlaySingleplayer",
  "quickPlayMultiplayer",
  "quickPlayRealms",
  "natives_directory",
  "launcher_name",
  "launcher_version",
  "classpath",
]);
const KNOWN_KEYS = new Set(PLACEHOLDER_KEYS);
const PLACEHOLDER = /\$\{([^}]+)\}/g;
const keysIn = (s) => [...s.matchAll(PLACEHOLDER)].map((m) => m[1]);

// ── rules ──

const RULE_KEYS = new Set(["action", "os", "features"]);
const OS_KEYS = new Set(["name", "arch", "version"]);

function assertEnv(env) {
  const os = env?.os;
  if (
    !isObject(os) ||
    typeof os.name !== "string" ||
    typeof os.arch !== "string" ||
    typeof os.version !== "string" ||
    !isObject(env.features)
  ) {
    throw new TypeError(
      "env 形狀不對：要 { os: { name, arch, version }, features: {} }",
    );
  }
}

/**
 * 這台機器的 env。Java 只裝 windows／x64（main/runtime/java.js），所以 name、arch 固定；
 * osVersion 由 main 給 os.release()（→ _notes/plans/instance-sync-v3-commit5b.md V1）
 */
function windowsEnv(osVersion) {
  if (typeof osVersion !== "string" || osVersion === "") {
    throw new TypeError("windowsEnv: osVersion 要是非空字串");
  }
  return {
    os: { name: "windows", arch: "x86_64", version: osVersion },
    features: {},
  };
}

/** 不看 env：checkLaunchSpec 也用它，結果不能隨這台機器而變 */
function validateRule(rule) {
  if (!isObject(rule)) throw badJson("rule 不是物件");
  for (const k of Object.keys(rule)) {
    if (!RULE_KEYS.has(k)) throw badJson(`rule 有不認得的鍵：${k}`);
  }
  if (rule.action !== "allow" && rule.action !== "disallow") {
    throw badJson(`rule 的 action 不認得：${rule.action}`);
  }
  if (rule.os !== undefined) {
    if (!isObject(rule.os)) throw badJson("rule.os 不是物件");
    for (const [k, v] of Object.entries(rule.os)) {
      if (!OS_KEYS.has(k)) throw badJson(`rule.os 有不認得的鍵：${k}`);
      if (typeof v !== "string") throw badJson(`rule.os.${k} 不是字串`);
    }
    if (rule.os.version !== undefined) {
      try {
        new RegExp(rule.os.version);
      } catch {
        throw badJson(`rule.os.version 不是正規式：${rule.os.version}`);
      }
    }
  }
  if (rule.features !== undefined && !isObject(rule.features)) {
    throw badJson("rule.features 不是物件");
  }
}

function validateRules(rules) {
  if (rules === undefined) return;
  if (!Array.isArray(rules)) throw badJson("rules 不是陣列");
  rules.forEach(validateRule);
}

/** 一條 rule 寫出的每個條件都成立才算符合（Y6） */
function ruleMatches(rule, env) {
  const os = rule.os ?? {};
  if (os.name !== undefined && os.name !== env.os.name) return false;
  if (os.arch !== undefined && os.arch !== env.os.arch) return false;
  if (os.version !== undefined && !new RegExp(os.version).test(env.os.version))
    return false;
  for (const [k, v] of Object.entries(rule.features ?? {})) {
    if (own(env.features, k) !== v) return false;
  }
  return true;
}

/**
 * 依序看，最後一條符合的決定；有 rules 但都不符 ⇒ 不允許；沒有 rules ⇒ 允許。
 * rules 出自已過 checkLaunchSpec 的 json；env 在入口驗過（checkRuntimeReady、installRuntimeFiles）
 */
function evaluateRules(rules, env) {
  if (rules === undefined || rules.length === 0) return true;
  let allowed = false;
  for (const rule of rules) {
    if (ruleMatches(rule, env)) allowed = rule.action === "allow";
  }
  return allowed;
}

// ── 版本鏈 ──

function validateArgItem(item, where) {
  if (typeof item === "string") return;
  const okValue =
    isObject(item) &&
    Object.keys(item).every((k) => k === "rules" || k === "value") &&
    (typeof item.value === "string" ||
      (Array.isArray(item.value) &&
        item.value.length > 0 &&
        item.value.every((s) => typeof s === "string")));
  if (!okValue) {
    throw badJson(
      `${where}：參數項不是字串或 { rules, value }：${JSON.stringify(item)}`,
    );
  }
  validateRules(item.rules);
}

/** 不管 rules，參數項可能送出的每個字串 */
const itemStrings = (item) =>
  typeof item === "string" ? [item] : [].concat(item.value);

/** 一層 json 的參數（已驗）；沒有 arguments ⇒ 兩個空陣列 */
function argumentsOf(json, label) {
  if (json.arguments === undefined) {
    if (json.minecraftArguments !== undefined) {
      throw badJson(`${label}：只有 minecraftArguments（舊式 json），不支援`);
    }
    return { jvm: [], game: [] };
  }
  if (!isObject(json.arguments)) throw badJson(`${label}：arguments 不是物件`);
  const out = {};
  for (const side of ["jvm", "game"]) {
    const list = json.arguments[side] ?? [];
    if (!Array.isArray(list))
      throw badJson(`${label}：arguments.${side} 不是陣列`);
    list.forEach((item) => validateArgItem(item, `${label} arguments.${side}`));
    out[side] = list;
  }
  return out;
}

const layerLabel = (json, i) =>
  `版本鏈第 ${i + 1} 層（${json?.id ?? "沒有 id"}）`;
const CHILD_WINS = ["id", "mainClass", "type", "assetIndex", "logging"];

/**
 * @param {object[]} chain 由根到葉（⑤c 給 [原版, Fabric]）
 */
function mergeVersionChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) {
    throw new TypeError("mergeVersionChain: chain 要是非空陣列");
  }
  const out = { arguments: { jvm: [], game: [] }, libraries: [] };
  chain.forEach((json, i) => {
    const label = layerLabel(json, i);
    if (!isObject(json)) throw badJson(`${label}：不是物件`);
    const args = argumentsOf(json, label);
    out.arguments.jvm.push(...args.jvm);
    out.arguments.game.push(...args.game);
    // mergeLibraries 直接展開：字串會被拆成一個個字元當成假 library，先擋（Z6）
    if (json.libraries !== undefined && !Array.isArray(json.libraries)) {
      throw badJson(`${label}：libraries 不是陣列`);
    }
    out.libraries = mergeLibraries(out.libraries, json.libraries);
    // Fabric 寫的是 "logging": null：null 不算有值（X2）
    for (const k of CHILD_WINS) {
      if (json[k] !== null && json[k] !== undefined) out[k] = json[k];
    }
  });
  return out;
}

// ── library 與 classpath ──

function filterLibraries(libraries, env) {
  if (!Array.isArray(libraries)) {
    throw new TypeError("filterLibraries: libraries 要是陣列");
  }
  return libraries.filter((lib) => evaluateRules(lib?.rules, env));
}

/** 過濾後的 library ＋ 版本 jar（最後）；Windows 路徑、以 ; 串 */
function buildClasspath({ libraries, librariesDir, versionJarPath }) {
  if (
    !Array.isArray(libraries) ||
    typeof librariesDir !== "string" ||
    typeof versionJarPath !== "string"
  ) {
    throw new TypeError(
      "buildClasspath: 要 { libraries: [], librariesDir: string, versionJarPath: string }",
    );
  }
  const parts = libraries.map((lib) =>
    path.win32.join(librariesDir, ...libraryArtifact(lib).rel.split("/")),
  );
  parts.push(versionJarPath);
  return parts.join(";");
}

// ── log4j 設定檔 ──

const isSha1 = (x) => typeof x === "string" && /^[0-9a-f]{40}$/i.test(x);
const isHttpUrl = (x) => typeof x === "string" && /^https?:\/\//i.test(x);

/**
 * @returns {{ rel: string, url: string, sha1: string, size: number, argument: string } | null}
 *   rel 以 "/" 分隔、相對 gameDir；沒有 logging.client ⇒ null
 */
function logConfigFile(json) {
  const logging = json?.logging;
  if (logging === undefined || logging === null) return null;
  if (!isObject(logging)) throw badJson("logging 不是物件");
  const c = logging.client;
  if (c === undefined || c === null) return null;
  if (!isObject(c) || !isObject(c.file)) {
    throw badJson("logging.client 或 logging.client.file 不是物件");
  }
  if (c.type !== "log4j2-xml") {
    throw badJson(`logging.client.type 不認得：${c.type}`);
  }
  const arg = c.argument;
  if (
    typeof arg !== "string" ||
    !arg.includes("${path}") ||
    arg.split("${path}").join("").includes("${")
  ) {
    throw badJson(
      `logging.client.argument 要含 \${path} 且沒有別的 placeholder：${arg}`,
    );
  }
  const f = c.file;
  if (!isSingleSegment(f.id)) {
    throw badJson(`logging.client.file.id 不能當檔名：${f.id}`);
  }
  if (!isHttpUrl(f.url))
    throw badJson("logging.client.file.url 不是 http(s) 網址");
  if (!isSha1(f.sha1))
    throw badJson(`logging.client.file.sha1 不是 40 位 hex：${f.sha1}`);
  if (!(Number.isSafeInteger(f.size) && f.size >= 0)) {
    throw badJson("logging.client.file.size 不是非負整數");
  }
  return {
    rel: `assets/log_configs/${f.id}`,
    url: f.url,
    sha1: f.sha1,
    size: f.size,
    argument: arg,
  };
}

// ── 單份 json 的啟動資料檢查（Z1）──

/**
 * 錯要在更新時叫、不是按下啟動才叫：⑤b 接進 checkVanillaJson／checkFabricJson。
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function checkLaunchSpec(json) {
  try {
    if (!isObject(json)) throw badJson("json 不是物件");
    const args = argumentsOf(json, "json");
    for (const item of [...args.jvm, ...args.game]) {
      for (const s of itemStrings(item)) {
        for (const key of keysIn(s)) {
          if (!KNOWN_KEYS.has(key))
            throw badJson(`不認得的 placeholder：\${${key}}`);
        }
      }
    }
    if (json.libraries !== undefined) {
      if (!Array.isArray(json.libraries)) throw badJson("libraries 不是陣列");
      for (const lib of json.libraries) validateRules(lib?.rules);
    }
    logConfigFile(json);
    return { ok: true };
  } catch (e) {
    if (e?.code === BAD_VERSION_JSON) return { ok: false, error: e.message };
    throw e;
  }
}

// ── 展開參數 ──

function checkPlaceholders(placeholders) {
  if (!isObject(placeholders)) throw new TypeError("placeholders 要是物件");
  for (const [k, v] of Object.entries(placeholders)) {
    if (!KNOWN_KEYS.has(k))
      throw new TypeError(`placeholders 有不認得的鍵：${k}`);
    if (typeof v !== "string" && v !== null) {
      throw new TypeError(`placeholders.${k} 要是字串或 null（故意沒有）`);
    }
  }
}

/**
 * 一個 token 換值。值是 null（呼叫端明講故意沒有，Y3′）⇒ { omit: true }，
 * 只准整段就是 ${key}；沒給或空字串 ⇒ 呼叫端漏給。只掃一遍：換進去的值不再被換。
 * placeholder 的名字在邊界 checkLaunchSpec 驗過
 */
function substitute(raw, placeholders) {
  const keys = keysIn(raw);
  const nulls = keys.filter((k) => own(placeholders, k) === null);
  if (nulls.length > 0) {
    if (raw !== `\${${nulls[0]}}`) {
      throw badJson(
        `${raw}：${nulls.join("、")} 是 null，但不是整段 \${key}，不能省略`,
      );
    }
    return { omit: true };
  }
  for (const key of keys) {
    const v = own(placeholders, key);
    if (v === undefined || v === "") {
      throw new TypeError(`placeholder ${key} 沒給值（故意沒有請給 null）`);
    }
  }
  return {
    omit: false,
    value: raw.replace(PLACEHOLDER, (_m, k) => placeholders[k]),
  };
}

/** 前一個收進來的 token 是原文就寫好的 --旗標（不是換出來的值） */
const isLiteralFlag = (raw) =>
  typeof raw === "string" && raw.startsWith("--") && keysIn(raw).length === 0;

/** items 是 mergeVersionChain 合併的參數項（各層已過 checkLaunchSpec，合併時 argumentsOf 又驗過形狀） */
function expandArguments(items, env, placeholders) {
  checkPlaceholders(placeholders);
  if (!Array.isArray(items))
    throw new TypeError("expandArguments: items 要是陣列");
  const out = [];
  const raws = [];
  for (const item of items) {
    if (typeof item !== "string" && !evaluateRules(item.rules, env)) continue;
    for (const raw of itemStrings(item)) {
      const r = substitute(raw, placeholders);
      if (!r.omit) {
        out.push(r.value);
        raws.push(raw);
        continue;
      }
      if (!isLiteralFlag(raws.at(-1))) {
        throw badJson(`${raw} 是 null，但前一個不是 --旗標，不能省略`);
      }
      out.pop();
      raws.pop();
    }
  }
  return out;
}

/**
 * @returns {string[]} [...jvm(json), log4j, ...extras, mainClass, ...game(json)]，不含 java.exe
 */
function buildLaunchArgv({ merged, env, placeholders, extras, logConfigPath }) {
  if (!isObject(merged) || !isObject(merged.arguments)) {
    throw new TypeError(
      "buildLaunchArgv: merged 要是 mergeVersionChain 的結果",
    );
  }
  if (typeof merged.mainClass !== "string" || merged.mainClass === "") {
    throw badJson("合併後沒有 mainClass");
  }
  // 套過 rules 才數：唯一的 ${classpath} 若在不成立的 rule 裡，展開後就沒有 classpath（⑤c D1）
  const cpCount = merged.arguments.jvm
    .filter(
      (item) => typeof item === "string" || evaluateRules(item.rules, env),
    )
    .flatMap(itemStrings)
    .filter((s) => s.includes("${classpath}")).length;
  if (cpCount !== 1) {
    throw badJson(
      `jvm 參數裡（套過 rules）的 \${classpath} 有 ${cpCount} 個，要剛好 1 個`,
    );
  }
  if (
    typeof placeholders?.classpath !== "string" ||
    placeholders.classpath === ""
  ) {
    throw new TypeError("placeholders.classpath 必給");
  }
  if (
    !Array.isArray(extras) ||
    extras.some((s) => typeof s !== "string" || s === "")
  ) {
    throw new TypeError("extras 要是非空字串的陣列");
  }

  const log = logConfigFile(merged);
  let logArgs = [];
  if (log) {
    if (typeof logConfigPath !== "string" || logConfigPath === "") {
      throw new TypeError("這份 json 有 logging，要給 logConfigPath");
    }
    logArgs = [log.argument.split("${path}").join(logConfigPath)];
  } else if (logConfigPath !== undefined) {
    throw new TypeError("這份 json 沒有 logging，不該給 logConfigPath");
  }

  return [
    ...expandArguments(merged.arguments.jvm, env, placeholders),
    ...logArgs,
    ...extras,
    merged.mainClass,
    ...expandArguments(merged.arguments.game, env, placeholders),
  ];
}

// ── 啟動給的值與「吃不吃得下」（⑤c D1）──

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
/** 啟動器沒有值的 key：null＝故意沒有，照省略演算法連旗標拿掉（W2、R-l） */
const NO_VALUE_KEYS = [
  "auth_xuid",
  "clientid",
  "resolution_width",
  "resolution_height",
  "quickPlayPath",
  "quickPlaySingleplayer",
  "quickPlayMultiplayer",
  "quickPlayRealms",
];
const isNonEmpty = (s) => typeof s === "string" && s !== "";

/**
 * 「啟動給什麼值」只寫在這裡：啟動填真值，checkLaunchable 填假值。
 * 20 個 key 全給，所以展開時「沒給值」的 TypeError 只會是程式錯（→ _notes/plans/instance-sync-v3-commit5c.md D1）
 */
function launchPlaceholders({
  merged,
  gameDir,
  nativesDir,
  classpath,
  auth,
  launcher,
}) {
  const strings = {
    gameDir,
    nativesDir,
    classpath,
    "launcher.name": launcher?.name,
    "launcher.version": launcher?.version,
  };
  for (const [k, v] of Object.entries(strings)) {
    if (!isNonEmpty(v))
      throw new TypeError(`launchPlaceholders: ${k} 要是非空字串`);
  }
  if (!isObject(merged)) {
    throw new TypeError(
      "launchPlaceholders: merged 要是 mergeVersionChain 的結果",
    );
  }
  if (!isNonEmpty(merged.id))
    throw badJson(`合併後的 id 不是非空字串：${merged.id}`);
  if (!isNonEmpty(merged.type))
    throw badJson(`合併後的 type 不是非空字串：${merged.type}`);
  const assetIndexId = merged.assetIndex?.id;
  if (!isNonEmpty(assetIndexId)) {
    throw badJson(`合併後的 assetIndex.id 不是非空字串：${assetIndexId}`);
  }
  const online = Boolean(auth.uuid && auth.accessToken);
  return {
    // 名字由來源保證非空：正版過帳號邊界（readAccount、登入）、離線是設定的 playerId、假跑是 "check"
    auth_player_name: auth.name,
    auth_uuid: online ? auth.uuid : ZERO_UUID,
    auth_access_token: online ? auth.accessToken : "0",
    version_name: merged.id,
    version_type: merged.type,
    game_directory: gameDir,
    assets_root: path.win32.join(gameDir, "assets"),
    assets_index_name: assetIndexId,
    natives_directory: nativesDir,
    launcher_name: launcher.name,
    launcher_version: launcher.version,
    classpath,
    ...Object.fromEntries(NO_VALUE_KEYS.map((k) => [k, null])),
  };
}

const CHECK_GAME_DIR = "C:\\ggl-check";

/**
 * 合併後的 json 啟動吃不吃得下：拿假值實際組一次 argv。就緒與安裝共用這一把尺。
 * 只把 GGL_BAD_VERSION_JSON 轉成 ok:false；程式錯照丟（④a I2）。
 * merged 的兩層已過 checkLaunchSpec；env 在入口驗過（checkRuntimeReady、installRuntimeFiles）
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function checkLaunchable(merged, env) {
  try {
    const placeholders = launchPlaceholders({
      merged,
      gameDir: CHECK_GAME_DIR,
      nativesDir: `${CHECK_GAME_DIR}\\natives`,
      classpath: "check",
      auth: { name: "check" },
      launcher: { name: "check", version: "0" },
    });
    const logArg = logConfigFile(merged)
      ? { logConfigPath: `${CHECK_GAME_DIR}\\log.xml` }
      : {};
    buildLaunchArgv({ merged, env, placeholders, extras: [], ...logArg });
    return { ok: true };
  } catch (e) {
    if (e?.code === BAD_VERSION_JSON) return { ok: false, error: e.message };
    throw e;
  }
}

module.exports = {
  PLACEHOLDER_KEYS,
  checkLaunchSpec,
  evaluateRules,
  mergeVersionChain,
  filterLibraries,
  buildClasspath,
  logConfigFile,
  expandArguments,
  buildLaunchArgv,
  windowsEnv,
  assertEnv,
  launchPlaceholders,
  checkLaunchable,
};
