// 內建 JRE 21：多來源 zip + Mojang runtime 備援（manifest-sync 會呼叫 ensureBundledJava）
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { copyDir } = require("./fs-utils");
const {
  fetchWithNiceError,
  downloadToFile,
  downloadToFileWithFallback,
  verifyFileSha256IfProvided,
  verifyFileSha1IfProvided,
} = require("./net-fetch");
const { rankSourcesByQuickProbe } = require("./mc-mirror");
const { formatEtaSeconds } = require("./format-eta-seconds");

const defaultJavaUi = {
  sendSyncStatus: () => {},
  sendSyncProgress: () => {},
};
let javaUi = { ...defaultJavaUi };

function configureBundledJava(next) {
  javaUi = { ...defaultJavaUi, ...next };
}

function sendSyncStatus(text) {
  javaUi.sendSyncStatus(text);
}
function sendSyncProgress(text, progress01) {
  javaUi.sendSyncProgress(text, progress01);
}

async function getZuluWindowsJre21ZipUrl() {
  try {
    const u =
      "https://api.azul.com/metadata/v1/zulu/packages/?" +
      [
        "latest=true",
        "page=1",
        "page_size=1",
        "os=windows",
        "arch=x86_64",
        "java_version=21",
        "java_package_type=jre",
        "archive_type=zip",
        "release_status=ga",
        "availability_types=CA",
        "include_fields=download_url,sha256_hash",
      ].join("&");
    const res = await fetchWithNiceError(u, {
      cache: "no-store",
      timeoutMs: 8000,
      headers: { "User-Agent": "GGL3-Launcher", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const item = Array.isArray(j) ? j[0] : null;
    const url = String(item?.download_url || "").trim();
    const sha256 = String(item?.sha256_hash || "").trim();
    return url && /^https?:\/\//i.test(url) ? { url, sha256 } : null;
  } catch {
    return null;
  }
}

async function getSemeruWindowsJre21ZipUrl() {
  try {
    const res = await fetchWithNiceError(
      "https://api.github.com/repos/ibmruntimes/semeru21-binaries/releases/latest",
      {
        cache: "no-store",
        timeoutMs: 8000,
        headers: {
          "User-Agent": "GGL3-Launcher",
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (!res.ok) return null;
    const j = await res.json();
    const assets = Array.isArray(j?.assets) ? j.assets : [];
    const zip = assets.find((a) => {
      const name = String(a?.name || "").toLowerCase();
      return (
        name.includes("jre") &&
        name.includes("windows") &&
        (name.includes("x64") || name.includes("amd64")) &&
        name.endsWith(".zip")
      );
    });
    const zipUrl =
      typeof zip?.browser_download_url === "string"
        ? zip.browser_download_url
        : "";
    if (!zipUrl) return null;

    const zipName = String(zip?.name || "");
    const shaAsset = assets.find((a) => {
      const name = String(a?.name || "").toLowerCase();
      if (!name.includes("sha256")) return false;
      if (
        !name.endsWith(".txt") &&
        !name.endsWith(".sha256") &&
        !name.endsWith(".sha256.txt")
      )
        return false;
      return (
        !zipName ||
        name.includes(zipName.toLowerCase().replace(/[^a-z0-9]+/g, "")) ||
        name.includes("jre")
      );
    });

    let sha256 = "";
    if (shaAsset?.browser_download_url) {
      try {
        const r = await fetchWithNiceError(
          String(shaAsset.browser_download_url),
          { cache: "no-store", timeoutMs: 8000 },
        );
        if (r.ok) {
          const txt = await r.text();
          const line = txt
            .split(/\r?\n/)
            .map((s) => s.trim())
            .find((s) => s && (!zipName || s.includes(zipName)));
          const m = line ? line.match(/^([a-fA-F0-9]{64})\b/) : null;
          if (m) sha256 = m[1].toLowerCase();
        }
      } catch {}
    }

    return { url: zipUrl, sha256 };
  } catch {
    return null;
  }
}

async function ensureBundledJava({ settings, paths }) {
  void settings;
  sendSyncStatus("檢查 Java 依賴…");
  sendSyncProgress("檢查 Java 依賴…", 0.02);

  const javaExe = await getBundledJavaExe(paths);
  if (javaExe) {
    sendSyncStatus("Java 依賴已就緒");
    return;
  }

  sendSyncStatus("正在下載 Java Runtime（JRE 21）…");
  await fsp.mkdir(paths.tempDir, { recursive: true });

  const zulu = await getZuluWindowsJre21ZipUrl();
  const semeru = await getSemeruWindowsJre21ZipUrl();

  const envMirror = String(process.env.GGL_JAVA_MIRROR_URL || "").trim();
  const sources = [
    envMirror ? { name: "自訂鏡像", url: envMirror } : null,
    zulu?.url
      ? { name: "Azul Zulu", url: zulu.url, sha256: zulu.sha256 }
      : null,
    semeru?.url
      ? { name: "IBM Semeru", url: semeru.url, sha256: semeru.sha256 }
      : null,
    {
      name: "Adoptium(eclipse)",
      url: "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse",
    },
    {
      name: "Adoptium(adoptium)",
      url: "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/adoptium",
    },
  ].filter(Boolean);

  const orderedSources = await rankSourcesByQuickProbe(sources);

  const zipPath = path.join(paths.tempDir, "jre21.zip");

  let lastUiBucket = -1;
  let lastAt = Date.now();
  let lastBytes = 0;
  let emaSpeedBps = 0;
  try {
    const used = await downloadToFileWithFallback(
      orderedSources,
      zipPath,
      ({ received, total }) => {
        const mb = received / (1024 * 1024);
        const totalMb = total > 0 ? total / (1024 * 1024) : 0;

        const estimatedTotal = total > 0 ? total : 120 * 1024 * 1024;
        const p =
          estimatedTotal > 0
            ? Math.max(0, Math.min(1, received / estimatedTotal))
            : 0;

        const now = Date.now();
        const dtMs = Math.max(1, now - lastAt);
        const dBytes = Math.max(0, received - lastBytes);
        const instBps = (dBytes * 1000) / dtMs;
        emaSpeedBps =
          emaSpeedBps > 0 ? emaSpeedBps * 0.85 + instBps * 0.15 : instBps;
        lastAt = now;
        lastBytes = received;

        const remainBytes = Math.max(0, estimatedTotal - received);
        const etaSec = emaSpeedBps > 1 ? remainBytes / emaSpeedBps : 0;
        const speedMb = emaSpeedBps / (1024 * 1024);

        const bucket = Math.floor(mb);
        if (bucket === lastUiBucket) return;
        lastUiBucket = bucket;

        const pct = `${Math.round(p * 100)}%`;
        const speedStr = `${speedMb.toFixed(2)}MB/s`;
        const etaStr = `ETA ${formatEtaSeconds(etaSec)}`;
        const sizeStr =
          total > 0
            ? `${mb.toFixed(0)}/${totalMb.toFixed(0)}MB`
            : `${mb.toFixed(0)}MB/?`;
        const text = `Java(JRE) ${pct} · ${sizeStr} · ${speedStr} · ${etaStr}`;
        sendSyncProgress(text, 0.02 + p * 0.45);
      },
      { resume: true },
    );

    await verifyFileSha256IfProvided(zipPath, used?.sha256);
  } catch (zipErr) {
    try {
      await ensureBundledJavaFromMojang(paths);
      return;
    } catch {
      throw zipErr;
    }
  }

  sendSyncStatus("正在安裝 Java 依賴…");
  sendSyncProgress("正在安裝 Java 依賴…", 0.55);

  const extractZip = require("extract-zip");
  const extractDir = path.join(paths.tempDir, "jdk-extract");
  await fsp.rm(extractDir, { recursive: true, force: true });
  await fsp.mkdir(extractDir, { recursive: true });
  await extractZip(zipPath, { dir: extractDir });

  const entries = await fsp.readdir(extractDir, { withFileTypes: true });
  const rootFolder = entries.find((e) => e.isDirectory());
  if (!rootFolder) throw new Error("Java 解壓失敗：找不到根資料夾。");

  const extractedJdkRoot = path.join(extractDir, rootFolder.name);

  await fsp.rm(paths.jdkDir, { recursive: true, force: true });
  await fsp.mkdir(paths.jdkDir, { recursive: true });

  try {
    await fsp.rename(extractedJdkRoot, paths.jdkDir);
  } catch {
    await copyDir(extractedJdkRoot, paths.jdkDir);
  }

  const javaExe2 = await getBundledJavaExe(paths);
  if (!javaExe2) throw new Error("Java 安裝後仍找不到 bin\\java.exe");

  sendSyncStatus("Java 依賴安裝完成");
  sendSyncProgress("Java 依賴安裝完成", 0.72);
}

async function ensureBundledJavaFromMojang(paths) {
  sendSyncStatus("改用 Mojang 官方 Java Runtime（最後備援）…");
  sendSyncProgress("改用 Mojang 官方 Java Runtime（最後備援）…", 0.03);

  const allUrl =
    "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";
  const all = await (
    await fetchWithNiceError(allUrl, { cache: "no-store", timeoutMs: 8000 })
  ).json();
  const delta = all?.["windows-x64"]?.["java-runtime-delta"];
  const entry = Array.isArray(delta) ? delta[0] : null;
  const manifestUrl = String(entry?.manifest?.url || "").trim();
  if (!manifestUrl)
    throw new Error(
      "Mojang runtime manifest 不存在（windows-x64/java-runtime-delta）。",
    );

  const maniRes = await fetchWithNiceError(manifestUrl, {
    cache: "no-store",
    timeoutMs: 8000,
  });
  if (!maniRes.ok)
    throw new Error(`Mojang runtime manifest 下載失敗：HTTP ${maniRes.status}`);
  const manifest = await maniRes.json();
  const files =
    manifest?.files && typeof manifest.files === "object" ? manifest.files : {};

  await fsp.rm(paths.jdkDir, { recursive: true, force: true });
  await fsp.mkdir(paths.jdkDir, { recursive: true });

  const entries = Object.entries(files);
  const fileEntries = entries.filter(
    ([, v]) =>
      v && typeof v === "object" && v.type === "file" && v.downloads?.raw?.url,
  );
  const totalBytes = fileEntries.reduce(
    (sum, [, v]) => sum + Number(v.downloads.raw.size || 0),
    0,
  );
  let doneBytes = 0;
  let lastUiBucket = -1;
  const inFlight = new Map();
  let lastAt = Date.now();
  let lastBytes = 0;
  let emaSpeedBps = 0;

  const getCurBytes = () => {
    let inflightSum = 0;
    for (const v of inFlight.values()) inflightSum += Number(v || 0);
    return doneBytes + inflightSum;
  };

  const bumpUi = () => {
    const cur = getCurBytes();
    const mb = cur / (1024 * 1024);
    const bucket = Math.floor(mb);
    if (bucket === lastUiBucket) return;
    lastUiBucket = bucket;
    const p = totalBytes > 0 ? cur / totalBytes : 0;

    const now = Date.now();
    const dtMs = Math.max(1, now - lastAt);
    const dBytes = Math.max(0, cur - lastBytes);
    const instBps = (dBytes * 1000) / dtMs;
    emaSpeedBps =
      emaSpeedBps > 0 ? emaSpeedBps * 0.85 + instBps * 0.15 : instBps;
    lastAt = now;
    lastBytes = cur;

    const remainBytes = Math.max(0, totalBytes - cur);
    const etaSec = emaSpeedBps > 1 ? remainBytes / emaSpeedBps : 0;
    const speedMb = emaSpeedBps / (1024 * 1024);

    const pct = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
    const totalMb = totalBytes > 0 ? totalBytes / (1024 * 1024) : 0;
    const sizeStr =
      totalBytes > 0
        ? `${mb.toFixed(0)}/${totalMb.toFixed(0)}MB`
        : `${mb.toFixed(0)}MB/?`;
    const speedStr = `${speedMb.toFixed(2)}MB/s`;
    const etaStr = `ETA ${formatEtaSeconds(etaSec)}`;
    sendSyncProgress(
      `Java(Mojang) ${pct} · ${sizeStr} · ${speedStr} · ${etaStr}`,
      0.02 + Math.max(0, Math.min(1, p)) * 0.45,
    );
  };

  const CONCURRENCY = 6;
  let idx = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, fileEntries.length) },
    async () => {
      while (true) {
        const curIdx = idx++;
        if (curIdx >= fileEntries.length) return;
        const [rel, v] = fileEntries[curIdx];
        const url = String(v.downloads.raw.url);
        const sha1 = String(v.downloads.raw.sha1 || "");
        const out = path.join(paths.jdkDir, rel);
        inFlight.set(rel, 0);
        try {
          await downloadToFile(
            url,
            out,
            ({ received }) => {
              inFlight.set(rel, Number(received || 0));
              bumpUi();
            },
            { resume: true, label: "Java(Mojang)" },
          );
          await verifyFileSha1IfProvided(out, sha1);
          doneBytes += Number(v.downloads.raw.size || 0);
        } finally {
          inFlight.delete(rel);
          bumpUi();
        }
      }
    },
  );

  await Promise.all(workers);

  const javaExe2 = await getBundledJavaExe(paths);
  if (!javaExe2) throw new Error("Mojang Java 安裝後仍找不到 bin\\java.exe");

  sendSyncStatus("Java 依賴安裝完成（Mojang）");
  sendSyncProgress("Java 依賴安裝完成（Mojang）", 0.72);
}

async function getBundledJavaExe(paths) {
  const bundled = path.join(paths.jdkDir, "bin", "java.exe");
  try {
    await fsp.access(bundled, fs.constants.F_OK);
    return bundled;
  } catch {
    return "";
  }
}

module.exports = {
  configureBundledJava,
  ensureBundledJava,
  ensureBundledJavaFromMojang,
  getBundledJavaExe,
};
