"use strict";

// 同步中樞：一把鎖包住更新、修復、啟動；狀態的計算與送出；更新／修復的流程；啟動閘。
// 對外只經注入接電（不 require("electron")、不 require minecraft-launch.js）。
// 設計、介面、錯誤文字 → _notes/plans/instance-sync-v3-commit3b1b.md；裁決 R1–R14 → instance-sync-v3-commit3b1.md。

const path = require("path");
const fsp = require("fs/promises");
const { getPaths } = require("../../lib/paths-layout.js");
const {
  isRemoteManifestUrlConfigured,
} = require("../../lib/manifest-url-configured.js");
const { compareVersionCore } = require("../../lib/sync/site-format.js");
const {
  SYNC_ALLOWED_KINDS,
  computeStatusKind,
  deriveUi,
  gateMessages,
} = require("../../lib/sync/status-kind.js");
const {
  planSync,
  listStrayJars: listStrayJarsIn,
  assertRemovableStrayJars,
} = require("../../lib/sync/plan.js");
const { checkRuntimeReady } = require("../../lib/runtime-readiness.js");
const {
  pickRuntimeFields,
  sameRuntimeTarget,
} = require("../../lib/runtime-target.js");
const instanceRecord = require("./instance-record.js");
const { createSiteClient } = require("./site-client.js");
const { checkGameRunning } = require("./game-running.js");
const { makeRuntimeProbe } = require("./runtime-probe.js");
const { removeStaleRuntime } = require("./runtime-cleanup.js");
const { hashFile } = require("../fs-utils.js");

class SyncStateError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "SyncStateError";
    this.code = code;
    Object.assign(this, extra);
  }
}

const VERB = { update: "更新", repair: "修復" };

// 第一句不說「同步」：準備中撞到鎖也是這句，而準備中不算同步中（R1）
const busyError = (holder) =>
  new SyncStateError(
    "GGL_SYNC_BUSY",
    holder === "launch"
      ? "遊戲啟動中，請稍候再試。"
      : "更新或修復進行中，請等它完成。",
    { holder },
  );

const notAllowedError = (who, kind) =>
  new SyncStateError(
    "GGL_SYNC_NOT_ALLOWED",
    `現在不能${VERB[who]}（目前狀態：${kind}）。請重新檢查後再試。`,
    { kind },
  );

// 缺了就在建立時丟：選填加預設的話，③b-2 忘了接也不會有人發現（H10、R14）
const REQUIRED_FUNCTIONS = [
  "readSettings",
  "isMinecraftRunning",
  "log", // ④c：runtime 安裝與 D2 清理的紀錄（appendLauncherLog），A2
  "sendInstanceStatus",
  "confirmGameClosed",
];

function assertRequiredDeps(deps) {
  for (const key of REQUIRED_FUNCTIONS) {
    if (typeof deps?.[key] !== "function")
      throw new TypeError(`createInstanceSync: 缺少必填的注入 ${key}`);
  }
  try {
    compareVersionCore(deps.launcherVersion, "0.0.0");
  } catch {
    throw new TypeError(
      `createInstanceSync: launcherVersion 必須以 x.y.z 開頭（實際：${deps.launcherVersion}）`,
    );
  }
}

/** 讀記錄、讀標記丟的系統錯誤（帶 syscall）⇒ 讀不到；其他錯誤是 bug，往外丟（R4） */
async function readLocalFile(filePath, read) {
  try {
    return { ok: true, value: await read() };
  } catch (err) {
    if (typeof err?.syscall !== "string") throw err;
    return { ok: false, detail: `${filePath}：${err.message}` };
  }
}

/** planSync 的本機探針：路徑上有任何東西都算存在；不是一般檔就不 hash（拿資料夾去 hash 會丟 EISDIR） */
function makeProbe(gameDir) {
  const abs = (rel) => path.join(gameDir, ...rel.split("/"));
  const lstatOrNull = async (rel) => {
    try {
      return await fsp.lstat(abs(rel));
    } catch (e) {
      if (e?.code === "ENOENT" || e?.code === "ENOTDIR") return null;
      throw e;
    }
  };
  return {
    exists: async (rel) => (await lstatOrNull(rel)) !== null,
    sha256: async (rel) => {
      const st = await lstatOrNull(rel);
      return st?.isFile() ? hashFile(abs(rel), "sha256") : null;
    },
  };
}

function internalErrorStatus(err) {
  return {
    kind: "internal-error",
    localReady: false,
    ui: deriveUi("internal-error", false),
    allowed: { update: false, repair: false },
    syncReasons: [],
    errorTexts: [`啟動器內部錯誤，請回報：${err?.message ?? String(err)}`],
    errorDetail: err?.stack ?? String(err),
    gateMessages: [],
    localVersion: "",
    remoteVersion: "",
  };
}

/**
 * @param {object} deps 必填與選填的注入 → _notes/plans/instance-sync-v3-commit3b1b.md §介面
 */
function createInstanceSync(deps) {
  assertRequiredDeps(deps);
  const { launcherVersion } = deps;
  const serverConfig =
    deps.serverConfig ?? require("../../lib/server-config.js");
  const siteClient = deps.siteClient ?? createSiteClient();
  const applyPlan = deps.applyPlan ?? require("./apply.js").applyPlan;
  const prepareRuntime =
    deps.prepareRuntime ?? require("../runtime/prepare.js").prepareRuntime;
  const runtimeProbeFor = deps.makeRuntimeProbe ?? makeRuntimeProbe;
  const cleanupFs = deps.cleanupFs; // 測試換掉 D2 用的 fs（R#17）；預設＝fs/promises
  const onProgress = deps.onProgress ?? (() => {});
  const gameDeps = { isMinecraftRunning: deps.isMinecraftRunning };
  if (deps.runPowerShell) gameDeps.runPowerShell = deps.runPowerShell;

  // null | { who: "launch" } | { who: "update" | "repair", phase: "preparing" | "applying" }（R1）
  let lock = null;
  let lastSeq = 0;
  let sentSeq = 0;

  function acquire(holder) {
    if (lock) throw busyError(lock.who);
    lock = holder;
  }

  async function gather() {
    const settings = await deps.readSettings();
    const paths = getPaths(settings);
    const configured = isRemoteManifestUrlConfigured(serverConfig.manifestUrl);
    const local = await readLocal(paths);
    let index;
    let gate;
    let release;
    if (configured) {
      index = await siteClient.fetchIndex(serverConfig.manifestUrl);
      ({ gate, release } = await siteClient.fetchSite(index));
    }
    return { settings, paths, configured, local, index, gate, release };
  }

  async function readLocal(paths) {
    const record = await readLocalFile(paths.syncRecordPath, () =>
      instanceRecord.readRecord(paths),
    );
    if (!record.ok) return { side: "unreadable", detail: record.detail };
    const inProgress = await readLocalFile(paths.syncInProgressPath, () =>
      instanceRecord.isInProgress(paths),
    );
    if (!inProgress.ok)
      return { side: "unreadable", detail: inProgress.detail };
    // 就緒讀的檔被擋（帶 syscall）與記錄被擋同一條路：local-unreadable（R#23）
    const runtime = await readLocalFile(paths.gameDir, () =>
      checkRuntimeReady({
        record: record.value,
        probe: runtimeProbeFor(paths),
      }),
    );
    if (!runtime.ok) return { side: "unreadable", detail: runtime.detail };
    return {
      side: "ok",
      record: record.value,
      inProgress: inProgress.value,
      runtimeReady: runtime.value.ready,
    };
  }

  function derive({ configured, local, index, gate, release }, syncing) {
    const r = computeStatusKind({
      configured,
      syncing,
      site: configured ? { index, gate, release } : undefined,
      local,
      launcherVersion,
    });
    return {
      kind: r.kind,
      localReady: r.localReady,
      ui: deriveUi(r.kind, r.localReady),
      allowed: {
        update: SYNC_ALLOWED_KINDS.update.includes(r.kind),
        repair: SYNC_ALLOWED_KINDS.repair.includes(r.kind),
      },
      syncReasons: r.syncReasons,
      errorTexts: r.errorTexts,
      errorDetail: null,
      gateMessages: gateMessages(gate, launcherVersion),
      localVersion: local.side === "ok" ? (local.record?.version ?? "") : "",
      remoteVersion: release?.side === "ok" ? release.value.version : "",
    };
  }

  /** 狀態與算出它的那份輸入一起回：啟動拿同一份去開遊戲（A1、R#21）；算不出來 ⇒ inputs 為 null */
  async function compute(syncing) {
    try {
      const inputs = await gather();
      return { status: derive(inputs, syncing), inputs };
    } catch (err) {
      return { status: internalErrorStatus(err), inputs: null };
    }
  }

  // 較舊的計算晚到就丟掉；送出本身丟錯（視窗沒了）不影響流程
  function send(seq, status) {
    if (seq < sentSeq) return;
    sentSeq = seq;
    try {
      deps.sendInstanceStatus(status);
    } catch {}
  }

  /** 序號與「同步中」都在開始時拿，與呼叫端前一行（例如放鎖）在同一個同步段 */
  async function computeAndSend() {
    return (await computeAndSendWithInputs()).status;
  }

  async function computeAndSendWithInputs() {
    const seq = ++lastSeq;
    const r = await compute(lock?.phase === "applying");
    send(seq, r.status);
    return r;
  }

  /** 前置檢查：當場算，不用上一次送出的；過了這關 local、索引、release 必為 ok */
  async function precheck(who) {
    const inputs = await gather();
    const { kind } = derive(inputs, false);
    if (!SYNC_ALLOWED_KINDS[who].includes(kind))
      throw notAllowedError(who, kind);
    return inputs;
  }

  async function prepare(who) {
    const inputs = await precheck(who);
    const game = await checkGameRunning({
      gameDir: inputs.paths.gameDir,
      deps: gameDeps,
    });
    if (game === "running") {
      throw new SyncStateError(
        "GGL_SYNC_GAME_RUNNING",
        `遊戲正在執行中，請先關閉遊戲再${VERB[who]}。`,
      );
    }
    if (game === "not-running") return inputs;
    if ((await deps.confirmGameClosed()) !== true) {
      throw new SyncStateError(
        "GGL_SYNC_GAME_UNKNOWN",
        "無法確認遊戲是否在執行，已取消。",
      );
    }
    // 等玩家確認的期間站台可能換版：重跑前置檢查，不再問第二次遊戲偵測（R2）
    return precheck(who);
  }

  async function buildPlan(inputs, strayJars, verifyAll) {
    const { paths, local, release } = inputs;
    const plan = await planSync({
      previous: local.record?.files ?? null,
      next: release.value.files,
      gameDir: paths.gameDir,
      probe: makeProbe(paths.gameDir),
      playerEditable: release.value.playerEditable,
      protectedPaths: serverConfig.protectedPaths,
      verifyAll,
      onHashProgress: ({ done, total }) =>
        onProgress({ phase: "check", done, total }),
    });
    const listed = new Set(plan.remove.map((p) => p.toLowerCase()));
    for (const p of strayJars) {
      if (listed.has(p.toLowerCase())) continue;
      listed.add(p.toLowerCase());
      plan.remove.push(p);
    }
    return plan;
  }

  async function runSync(who, strayJars) {
    const inputs = await prepare(who);
    const { settings, paths, index, release } = inputs;
    if (strayJars.length > 0) {
      assertRemovableStrayJars(strayJars, {
        gameDir: paths.gameDir,
        protectedPaths: serverConfig.protectedPaths,
        next: release.value.files,
      });
    }
    // 進入套用：改階段、拿序號、送出 syncing 在同一個同步段，且在算計畫之前（R1）
    lock = { who, phase: "applying" };
    send(++lastSeq, derive(inputs, true));

    const verifyAll = who === "repair" || inputs.local.inProgress; // H7；runtime 用同一個值（④b 承接）
    const plan = await buildPlan(inputs, strayJars, verifyAll);
    const { minecraft, loader } = release.value;
    const result = await applyPlan({
      plan,
      record: {
        format: 3,
        version: release.value.version,
        files: release.value.files.map((f) => ({
          path: f.path,
          sha256: f.sha256,
        })),
      },
      paths,
      filesBaseUrl: index.value.files,
      deps: {
        prepareRuntime: async () => {
          const fields = pickRuntimeFields(
            await prepareRuntime({
              settings,
              paths,
              minecraft,
              loader,
              verifyAll,
              reinstallJava: who === "repair", // ④b E3
              onProgress,
              deps: { log: deps.log },
            }),
          );
          if (!sameRuntimeTarget(fields, release.value)) {
            throw new Error(
              `裝好的 runtime 不是這次要的（要 ${minecraft}／${loader.version}，得到 ${fields.minecraft}／${fields.loader.version}）`,
            );
          }
          return fields;
        },
        // blob 404 時判站台是不是換版了；每次呼叫都重抓（H9）
        fetchReleaseFiles: async () => {
          const { release: r } = await siteClient.fetchSite(index);
          return r?.side === "ok" ? r.value.files : null;
        },
        sendSyncProgress: onProgress,
      },
    });
    // 記錄已寫＝更新成功；清舊 runtime 失敗只寫 log（D2、D4），仍在鎖內
    await removeStaleRuntime({
      paths,
      record: result.record,
      log: deps.log,
      ...(cleanupFs && { fsp: cleanupFs }),
    });
    return { movedAside: result.movedAside }; // 對外形狀不變（IPC 只用 movedAside）
  }

  /** 取鎖之後的每一個出口都放鎖、重算並送出，等重算完才回；重算不蓋掉本身的結果或錯誤 */
  async function withSyncLock(who, strayJars) {
    acquire({ who, phase: "preparing" });
    try {
      return await runSync(who, strayJars);
    } finally {
      lock = null;
      await computeAndSend();
    }
  }

  async function getInstanceStatus() {
    return computeAndSend();
  }

  async function updateInstance() {
    return withSyncLock("update", []);
  }

  async function repairInstance({ strayJarsToRemove = [] } = {}) {
    return withSyncLock("repair", strayJarsToRemove);
  }

  /** 不取鎖；不能修復的 kind 下丟錯，不回空陣列（抓不到 release 時回 [] 等於謊報沒有，H6） */
  async function listStrayJars() {
    const syncing = lock?.phase === "applying";
    const inputs = await gather();
    const { kind } = derive(inputs, syncing);
    if (!SYNC_ALLOWED_KINDS.repair.includes(kind))
      throw notAllowedError("repair", kind);
    let entries;
    try {
      entries = await fsp.readdir(path.join(inputs.paths.gameDir, "mods"), {
        withFileTypes: true,
      });
    } catch (e) {
      if (e?.code === "ENOENT") return [];
      throw e;
    }
    return listStrayJarsIn({
      next: inputs.release.value.files,
      previous: inputs.local.record?.files ?? null,
      modsListing: entries.map((e) => ({ name: e.name, isFile: e.isFile() })),
    });
  }

  /** 啟動閘在鎖內當場算（送畫面）；不可啟動就不呼叫 fn（H3）；可啟動 ⇒ fn 拿到閘那次讀到的輸入（A1） */
  async function withLaunchLock(fn) {
    acquire({ who: "launch" });
    try {
      const { status, inputs } = await computeAndSendWithInputs();
      if (!status.ui.canLaunch) {
        throw new SyncStateError(
          "GGL_SYNC_LAUNCH_BLOCKED",
          `目前無法啟動（狀態：${status.kind}）。`,
          { status },
        );
      }
      const { settings, paths, local } = inputs;
      return await fn(status, { settings, paths, record: local.record });
    } finally {
      lock = null;
    }
  }

  return {
    getInstanceStatus,
    updateInstance,
    repairInstance,
    listStrayJars,
    withLaunchLock,
    getLockHolder: () => lock?.who ?? null,
  };
}

module.exports = { createInstanceSync, SyncStateError };
