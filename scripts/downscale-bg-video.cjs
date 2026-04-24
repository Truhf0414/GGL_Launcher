const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function fail(msg) {
  console.error(`[downscale-bg-video] ${msg}`);
  process.exit(1);
}

const repoRoot = process.cwd();
const input = path.join(repoRoot, "assets", "sakura_field_BG.mp4");
const tmpOut = path.join(repoRoot, "assets", "sakura_field_BG.downscaled.mp4");

const keepBackup = process.argv.includes("--keep-backup");
const targetWidthArg = process.argv.find((a) => a.startsWith("--width="));
const targetFpsArg = process.argv.find((a) => a.startsWith("--fps="));
const crfArg = process.argv.find((a) => a.startsWith("--crf="));
const targetWidth = targetWidthArg
  ? Number(targetWidthArg.split("=")[1])
  : 1920;
const targetFps = targetFpsArg ? Number(targetFpsArg.split("=")[1]) : 30;
const crf = crfArg ? Number(crfArg.split("=")[1]) : 24;

if (!Number.isFinite(targetWidth) || targetWidth < 320) {
  fail(`invalid width "${targetWidthArg}" (use --width=1920 etc.)`);
}
if (!Number.isFinite(targetFps) || targetFps < 10 || targetFps > 60) {
  fail(`invalid fps "${targetFpsArg}" (use --fps=30 etc.)`);
}
if (!Number.isFinite(crf) || crf < 18 || crf > 35) {
  fail(`invalid crf "${crfArg}" (use --crf=24 etc.)`);
}

if (!fs.existsSync(input)) {
  fail(`input not found: ${input}`);
}

const ffmpegPath = "ffmpeg";

// Ensure temp output doesn't exist
try {
  if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
} catch {}

console.log(
  `[downscale-bg-video] encode width=${targetWidth} fps=${targetFps} crf=${crf} (overwrite original)`,
);

// Notes:
// - Use H.264 for maximum compatibility in Electron/Chromium on Windows.
// - No audio needed (video is muted), so strip audio for smaller files.
// - Keep even dimensions: scale to width, auto height, force even via trunc().
// FPS cap reduces decode+present cost (common launcher trick).
const vf = `scale=${targetWidth}:-2:flags=lanczos,fps=${targetFps}`;
const args = [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  input,
  "-vf",
  vf,
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  String(crf),
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-an",
  tmpOut,
];

// Do NOT use shell mode; it breaks paths with spaces.
const r = spawnSync(ffmpegPath, args, { stdio: "inherit" });
if (r.error) fail(String(r.error));
if (r.status !== 0) fail(`ffmpeg failed with exit code ${r.status}`);
if (!fs.existsSync(tmpOut)) fail(`expected output missing: ${tmpOut}`);

// Swap files
const backup = path.join(repoRoot, "assets", "sakura_field_BG.original.mp4");
try {
  if (keepBackup) {
    if (!fs.existsSync(backup)) fs.renameSync(input, backup);
    else fs.unlinkSync(input);
  } else {
    fs.unlinkSync(input);
  }
  fs.renameSync(tmpOut, input);
} catch (e) {
  fail(`failed to replace original: ${e?.message ?? e}`);
}

const newSize = fs.statSync(input).size;
console.log(
  `[downscale-bg-video] done. New file size: ${(newSize / 1024 / 1024).toFixed(1)} MB`,
);
if (keepBackup) {
  const oldSize = fs.statSync(backup).size;
  console.log(
    `[downscale-bg-video] kept backup: assets/sakura_field_BG.original.mp4 (${(oldSize / 1024 / 1024).toFixed(1)} MB)`,
  );
}
