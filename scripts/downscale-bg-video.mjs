import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function fail(msg) {
  console.error(`[downscale-bg-video] ${msg}`);
  process.exit(1);
}

const repoRoot = process.cwd();
const input = path.join(repoRoot, "assets", "sakura_field_BG.mp4");
const tmpOut = path.join(repoRoot, "assets", "sakura_field_BG.downscaled.mp4");

const keepBackup = process.argv.includes("--keep-backup");
const targetWidthArg = process.argv.find((a) => a.startsWith("--width="));
const targetWidth = targetWidthArg
  ? Number(targetWidthArg.split("=")[1])
  : 1920;

if (!Number.isFinite(targetWidth) || targetWidth < 320) {
  fail(`invalid width "${targetWidthArg}" (use --width=1920 etc.)`);
}

if (!fs.existsSync(input)) {
  fail(`input not found: ${input}`);
}

let ffmpegPath;
ffmpegPath = "ffmpeg";

// Ensure temp output doesn't exist
try {
  if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
} catch {}

console.log(
  `[downscale-bg-video] downscaling to width=${targetWidth} (overwrite original)`,
);

// Notes:
// - Use H.264 for maximum compatibility in Electron/Chromium on Windows.
// - No audio needed (video is muted), so strip audio for smaller files.
// - Keep even dimensions: scale to width, auto height, force even via trunc().
const vf = `scale=${targetWidth}:-2:flags=lanczos`;
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
  "23",
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
