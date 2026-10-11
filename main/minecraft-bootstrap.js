// Minecraft 本體 / Fabric / libraries+assets（啟動前準備）；Java 見 bundled-java，版本鏈見 minecraft-version-json
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { readSettings } = require("./settings");
const { detectLaunchVersionId } = require("./launch-version-detect");
const {
  fetchJson,
  downloadToFile,
  downloadIfMissing,
  ensureFileValid,
  verifyFileSha1IfProvided,
} = require("./net-fetch");
const {
  stripTrailingSlashes,
  mcUrlFor,
  rewriteLibraryUrlToMirror,
  getMcMirrorDecision,
} = require("./mc-mirror");
const { formatEtaSeconds } = require("./format-eta-seconds");
const { isLibraryAllowedOnWindows } = require("../lib/library-filter.js");
const {
  resolveVersionChain,
  readJsonFile,
  findAssetIndexUrlFromChain,
} = require("./minecraft-version-json");
const {
  configureBundledJava,
  ensureBundledJava,
  ensureBundledJavaFromMojang,
  getBundledJavaExe,
} = require("./bundled-java");

/** Fabric installer 無回應時強制結束，避免主程序永遠掛在 spawn 上 */
const FABRIC_INSTALLER_TIMEOUT_MS = 20 * 60 * 1000;

const defaultBootDeps = {
  sendMcStatus: () => {},
  sendMcProgress: () => {},
  sendSyncStatus: () => {},
  sendSyncProgress: () => {},
};

let boot = { ...defaultBootDeps };

function configureMinecraftBootstrap(next) {
  boot = { ...defaultBootDeps, ...next };
  configureBundledJava({
    sendSyncStatus: boot.sendSyncStatus,
    sendSyncProgress: boot.sendSyncProgress,
  });
}

function sendMcStatus(text) {
  boot.sendMcStatus(text);
}
function sendMcProgress(text, progress01) {
  boot.sendMcProgress(text, progress01);
}

async function ensureMinecraftAndFabricRuntime({
  gameDir,
  mcVersion,
  loaderVersion,
  jdkDir,
}) {
  sendMcStatus("正在檢查 Minecraft 版本檔…");
  await ensureVanillaMinecraftInstalled({ gameDir, mcVersion });

  const existingLaunchId = await detectLaunchVersionId(gameDir, mcVersion);
  const hasFabric = Boolean(
    existingLaunchId &&
    String(existingLaunchId).toLowerCase().includes("fabric-loader"),
  );
  if (!hasFabric) {
    sendMcStatus("正在安裝 Fabric Loader…");
    await installFabricWithInstaller({
      gameDir,
      mcVersion,
      loaderVersion,
      jdkDir,
    });
  }

  const launchId = await detectLaunchVersionId(gameDir, mcVersion);
  sendMcStatus("正在準備 libraries / assets…");
  await ensureLibrariesAndAssets({
    gameDir,
    launchVersionId: launchId,
    assetsMode: "all",
  });
}

async function ensureVanillaMinecraftInstalled({ gameDir, mcVersion }) {
  const settings = await readSettings();
  const chosen = await getMcMirrorDecision(settings);

  const manifestUrl = chosen.base
    ? mcUrlFor({ mirrorBase: chosen.base, kind: "manifestV2", value: "" })
    : "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
  const manifest = await fetchJson(manifestUrl);
  const versions = Array.isArray(manifest?.versions) ? manifest.versions : [];
  const v = versions.find((x) => String(x?.id) === String(mcVersion));
  if (!v?.url) throw new Error(`找不到 Minecraft 版本：${mcVersion}`);

  const versionJsonUrl = chosen.base
    ? mcUrlFor({
        mirrorBase: chosen.base,
        kind: "versionJson",
        value: mcVersion,
      })
    : String(v.url);
  const versionJson = await fetchJson(versionJsonUrl);
  const id = String(versionJson?.id || mcVersion);

  const verDir = path.join(gameDir, "versions", id);
  await fsp.mkdir(verDir, { recursive: true });

  const jsonPath = path.join(verDir, `${id}.json`);
  await fsp.writeFile(jsonPath, JSON.stringify(versionJson, null, 2), "utf8");

  const client = versionJson?.downloads?.client;
  const clientUrl = chosen.base
    ? mcUrlFor({ mirrorBase: chosen.base, kind: "clientJar", value: mcVersion })
    : client?.url;
  if (clientUrl) {
    const jarPath = path.join(verDir, `${id}.jar`);
    const sha1 = String(client?.sha1 || "");
    const totalBytes = Number(client?.size || 0);

    try {
      await fsp.access(jarPath, fs.constants.F_OK);
      await verifyFileSha1IfProvided(jarPath, sha1);
      return;
    } catch {
      try {
        await fsp.rm(jarPath, { force: true });
      } catch {}
    }

    sendMcStatus(`正在下載 Minecraft 客戶端（${chosen.name}）…`);
    let lastAt = Date.now();
    let lastBytes = 0;
    let emaSpeedBps = 0;
    let lastPct = -1;

    await downloadToFile(
      String(clientUrl),
      jarPath,
      ({ received, total }) => {
        const knownTotal = totalBytes > 0 ? totalBytes : Number(total || 0);
        const p =
          knownTotal > 0 ? Math.max(0, Math.min(1, received / knownTotal)) : 0;

        const now = Date.now();
        const dtMs = Math.max(1, now - lastAt);
        const dBytes = Math.max(0, received - lastBytes);
        const instBps = (dBytes * 1000) / dtMs;
        emaSpeedBps =
          emaSpeedBps > 0 ? emaSpeedBps * 0.85 + instBps * 0.15 : instBps;
        lastAt = now;
        lastBytes = received;

        const remainBytes =
          knownTotal > 0 ? Math.max(0, knownTotal - received) : 0;
        const etaSec =
          emaSpeedBps > 1 && remainBytes > 0 ? remainBytes / emaSpeedBps : 0;
        const speedMb = emaSpeedBps / (1024 * 1024);

        const pctInt = Math.round(p * 100);
        if (pctInt === lastPct) return;
        lastPct = pctInt;

        const mb = received / (1024 * 1024);
        const totalMb = knownTotal > 0 ? knownTotal / (1024 * 1024) : 0;
        const sizeStr =
          knownTotal > 0
            ? `${mb.toFixed(0)}/${totalMb.toFixed(0)}MB`
            : `${mb.toFixed(0)}MB/?`;
        const speedStr = `${speedMb.toFixed(2)}MB/s`;
        const etaStr = `ETA ${formatEtaSeconds(etaSec)}`;
        sendMcProgress(
          `Minecraft Client ${pctInt}% · ${sizeStr} · ${speedStr} · ${etaStr}`,
          p,
        );
      },
      { resume: true, label: "Minecraft 客戶端" },
    );
    await verifyFileSha1IfProvided(jarPath, sha1);
  }
}

function appendStderrCap(buf, chunk, max = 200_000) {
  const next = buf + chunk;
  return next.length > max ? next.slice(-Math.floor(max / 2)) : next;
}

async function installFabricWithInstaller({
  gameDir,
  mcVersion,
  loaderVersion,
  jdkDir,
}) {
  const javaExe = path.join(jdkDir, "bin", "java.exe");
  try {
    await fsp.access(javaExe, fs.constants.F_OK);
  } catch {
    throw new Error(
      "找不到內建 Java，無法安裝 Fabric。請先按『安裝/更新』安裝 Java。",
    );
  }

  const installers = await fetchJson(
    "https://meta.fabricmc.net/v2/versions/installer",
  );
  const latest =
    Array.isArray(installers) && installers[0] ? installers[0] : null;
  const installerVersion = String(latest?.version || "1.0.1");
  const installerUrl = `https://maven.fabricmc.net/net/fabricmc/fabric-installer/${installerVersion}/fabric-installer-${installerVersion}.jar`;

  const installerPath = path.join(
    gameDir,
    ".launcher",
    `fabric-installer-${installerVersion}.jar`,
  );
  await fsp.mkdir(path.dirname(installerPath), { recursive: true });
  await downloadIfMissing(installerUrl, installerPath, {
    sha1: "",
    resume: true,
  });

  const args = [
    "-jar",
    installerPath,
    "client",
    "-dir",
    gameDir,
    "-mcversion",
    String(mcVersion),
    "-loader",
    String(loaderVersion),
    "-noprofile",
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(javaExe, args, { cwd: gameDir, windowsHide: true });
    let stderr = "";
    let finished = false;
    let t;

    function once(fn) {
      if (finished) return;
      finished = true;
      try {
        clearTimeout(t);
      } catch {}
      fn();
    }

    t = setTimeout(() => {
      once(() =>
        reject(
          new Error(
            `Fabric installer 逾時（超過 ${Math.round(FABRIC_INSTALLER_TIMEOUT_MS / 60000)} 分鐘無回應）${stderr ? `\n${stderr.slice(0, 800)}` : ""}`,
          ),
        ),
      );
      try {
        child.kill();
      } catch {}
    }, FABRIC_INSTALLER_TIMEOUT_MS);

    child.stderr.on("data", (d) => {
      stderr = appendStderrCap(stderr, d.toString());
    });
    child.on("exit", (code, signal) => {
      once(() => {
        if (code === 0) resolve();
        else {
          const sig = signal ? ` signal=${signal}` : "";
          reject(
            new Error(
              `Fabric installer 失敗（code=${code}${sig}）${stderr ? `\n${stderr.slice(0, 1200)}` : ""}`,
            ),
          );
        }
      });
    });
    child.on("error", (err) => {
      once(() => reject(err));
    });
  });
}

async function runPool(items, concurrency, worker) {
  const n = Math.max(1, Math.floor(Number(concurrency) || 1));
  let idx = 0;
  const workers = Array.from(
    { length: Math.min(n, items.length) },
    async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        await worker(items[i], i);
      }
    },
  );
  await Promise.all(workers);
}

async function ensureLibrariesAndAssets({
  gameDir,
  launchVersionId,
  assetsMode = "all",
}) {
  if (!launchVersionId) throw new Error("缺少 launchVersionId。");

  const resolved = await resolveVersionChain({
    gameDir,
    versionId: launchVersionId,
  });
  const libs = Array.isArray(resolved.libraries) ? resolved.libraries : [];
  const settings = await readSettings();
  const mirror = await getMcMirrorDecision(settings);

  const libTasks = [];
  for (const lib of libs) {
    if (!isLibraryAllowedOnWindows(lib?.rules)) continue;
    const art = lib?.downloads?.artifact;
    if (art?.path && art?.url) {
      libTasks.push({
        kind: "artifact",
        url: rewriteLibraryUrlToMirror(String(art.url), mirror.base),
        sha1: String(art.sha1 || ""),
        size: Number(art.size || 0),
        abs: path.join(gameDir, "libraries", String(art.path)),
      });
    }
    const classifiers = lib?.downloads?.classifiers;
    if (classifiers && typeof classifiers === "object") {
      const native =
        classifiers["natives-windows"] ||
        classifiers["natives-windows-x86_64"] ||
        classifiers["natives-windows-x64"];
      if (native?.path && native?.url) {
        libTasks.push({
          kind: "native",
          url: rewriteLibraryUrlToMirror(String(native.url), mirror.base),
          sha1: String(native.sha1 || ""),
          size: Number(native.size || 0),
          abs: path.join(gameDir, "libraries", String(native.path)),
        });
      }
    }
  }

  if (libTasks.length) {
    const label = "正在下載 libraries…";
    const totalBytes = libTasks.reduce((s, t) => s + (Number(t.size) || 0), 0);
    let doneBytes = 0;
    const inFlight = new Map();
    let lastUiMs = 0;
    let lastUiBytes = 0;
    let lastUiAt = Date.now();

    const bump = () => {
      const now = Date.now();
      if (now - lastUiMs < 180) return;
      lastUiMs = now;
      let inflight = 0;
      for (const v of inFlight.values()) inflight += Number(v || 0);
      const cur = doneBytes + inflight;
      const p = totalBytes > 0 ? Math.max(0, Math.min(1, cur / totalBytes)) : 0;
      const dt = Math.max(1, now - lastUiAt);
      const dBytes = Math.max(0, cur - lastUiBytes);
      const bps = (dBytes * 1000) / dt;
      lastUiAt = now;
      lastUiBytes = cur;
      const mbps = bps / (1024 * 1024);
      const eta = bps > 0 && totalBytes > 0 ? (totalBytes - cur) / bps : 0;
      sendMcProgress(
        `${label} ${(p * 100).toFixed(0)}% ${mbps.toFixed(1)}MB/s ETA ${formatEtaSeconds(eta)}`,
        p,
      );
    };

    sendMcProgress(label, 0);
    await runPool(libTasks, 6, async (t) => {
      try {
        await fsp.access(t.abs, fs.constants.F_OK);
        doneBytes += Number(t.size || 0);
        bump();
        return;
      } catch {}

      inFlight.set(t.abs, 0);
      try {
        await downloadToFile(
          String(t.url),
          t.abs,
          ({ received }) => {
            inFlight.set(t.abs, Number(received || 0));
            bump();
          },
          { resume: true, label: "libraries/natives" },
        );
        await verifyFileSha1IfProvided(t.abs, t.sha1);
      } finally {
        inFlight.delete(t.abs);
        doneBytes += Number(t.size || 0);
        bump();
      }

      if (t.kind === "native") {
        const nativesDir = path.join(gameDir, "natives");
        await fsp.mkdir(nativesDir, { recursive: true });
        try {
          const extractZip = require("extract-zip");
          await extractZip(t.abs, { dir: nativesDir });
        } catch (e) {
          const msg = String(e?.message ?? e);
          sendMcStatus(`解壓 natives 失敗：${msg}`);
          throw new Error(`解壓 natives 失敗：${msg}`);
        }
      }
    });
  }

  const assetIndexId = String(resolved.assetIndex || "").trim();
  if (!assetIndexId) {
    return;
  }

  const assetIndexInfo = await findAssetIndexUrlFromChain(gameDir, resolved.id);
  const assetIndexUrl =
    typeof assetIndexInfo === "string" ? assetIndexInfo : assetIndexInfo?.url;
  const assetIndexSha1 =
    typeof assetIndexInfo === "object"
      ? String(assetIndexInfo?.sha1 || "")
      : "";
  if (!assetIndexUrl) {
    return;
  }

  const idxPath = path.join(
    gameDir,
    "assets",
    "indexes",
    `${assetIndexId}.json`,
  );
  await fsp.mkdir(path.dirname(idxPath), { recursive: true });
  const mirrorIdxUrl = mirror.base
    ? `${stripTrailingSlashes(mirror.base)}/assets/indexes/${assetIndexId}.json`
    : "";
  const idxDownloadUrl = mirrorIdxUrl || String(assetIndexUrl);
  try {
    await ensureFileValid(idxDownloadUrl, idxPath, {
      sha1: assetIndexSha1,
      resume: true,
    });
  } catch {
    await ensureFileValid(String(assetIndexUrl), idxPath, {
      sha1: assetIndexSha1,
      resume: true,
    });
  }

  const idx = await readJsonFile(idxPath);

  const objects =
    idx?.objects && typeof idx.objects === "object" ? idx.objects : {};
  const base = mirror.base
    ? `${stripTrailingSlashes(mirror.base)}/assets`
    : "https://resources.download.minecraft.net";
  const keys = Object.keys(objects);
  const shouldDownload = (k) => {
    if (assetsMode === "all") return true;
    return (
      String(k).startsWith("minecraft/lang/") && String(k).endsWith(".json")
    );
  };

  const filteredKeys = keys.filter(shouldDownload);
  if (filteredKeys.length === 0) {
    return;
  }

  const label =
    assetsMode === "all" ? "正在下載完整資源…" : "正在下載語言資源…";
  const totalBytes = filteredKeys.reduce(
    (s, k) => s + Number(objects[k]?.size || 0),
    0,
  );
  let doneBytes = 0;
  const inFlight = new Map();
  let lastUiMs = 0;
  let lastUiBytes = 0;
  let lastUiAt = Date.now();

  const bump = () => {
    const now = Date.now();
    if (now - lastUiMs < 180) return;
    lastUiMs = now;
    let inflight = 0;
    for (const v of inFlight.values()) inflight += Number(v || 0);
    const cur = doneBytes + inflight;
    const p = totalBytes > 0 ? Math.max(0, Math.min(1, cur / totalBytes)) : 0;
    const dt = Math.max(1, now - lastUiAt);
    const dBytes = Math.max(0, cur - lastUiBytes);
    const bps = (dBytes * 1000) / dt;
    lastUiAt = now;
    lastUiBytes = cur;
    const mbps = bps / (1024 * 1024);
    const eta = bps > 0 && totalBytes > 0 ? (totalBytes - cur) / bps : 0;
    sendMcProgress(
      `${label} ${(p * 100).toFixed(0)}% ${mbps.toFixed(1)}MB/s ETA ${formatEtaSeconds(eta)}`,
      p,
    );
  };

  sendMcProgress(label, 0);
  await runPool(filteredKeys, 6, async (k) => {
    const h = objects[k]?.hash;
    if (!h || typeof h !== "string") return;
    const sub = h.slice(0, 2);
    const url = `${base}/${sub}/${h}`;
    const out = path.join(gameDir, "assets", "objects", sub, h);
    const sz = Number(objects[k]?.size || 0);
    try {
      await fsp.access(out, fs.constants.F_OK);
      doneBytes += sz;
      bump();
      return;
    } catch {}

    inFlight.set(h, 0);
    try {
      await downloadToFile(
        url,
        out,
        ({ received }) => {
          inFlight.set(h, Number(received || 0));
          bump();
        },
        { resume: true, label: "assets" },
      );
      await verifyFileSha1IfProvided(out, String(h));
    } finally {
      inFlight.delete(h);
      doneBytes += sz;
      bump();
    }
  });
}

module.exports = {
  configureMinecraftBootstrap,
  ensureMinecraftAndFabricRuntime,
  ensureBundledJava,
  ensureBundledJavaFromMojang,
  getBundledJavaExe,
};
