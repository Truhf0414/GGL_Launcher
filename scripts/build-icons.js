/**
 * 產生 Windows/Electron 用 icon 檔案
 *
 * 目的：你的像素風 icon 在 16x16 / 32x32 會看不清楚，
 * 所以這個腳本會做：
 * - 加一個高對比的底色圓角方塊
 * - 加白色外框（outline）
 * - 輸出多尺寸 PNG
 * - 輸出 icon.ico（含 16/24/32/48/64/128/256）
 *
 * 使用方式：
 *   npm run build:icons
 *
 * 輸入檔：
 *   assets/icon.png
 *
 * 輸出檔：
 *   assets/icon_generated_512.png  (主輸出，建議拿來當 app icon)
 *   assets/icon_*.png              (各尺寸)
 *   assets/icon.ico                (Windows 打包用)
 */

const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const root = path.join(__dirname, "..");
const assetsDir = path.join(root, "assets");

const inputPng = path.join(assetsDir, "icon.png");

const outBase512 = path.join(assetsDir, "icon_generated_512.png");
const outIco = path.join(assetsDir, "icon.ico");

// 你可以在這裡調整底色（深色底比較能襯托白色外框）
const bg = "#0b0f14";
const bgBorder = "rgba(255,255,255,0.14)";

function svgIconFrame({ size, radius, padding, outlinePx, imgDataUri }) {
  const inner = size - padding * 2;
  const x = padding;
  const y = padding;

  // 用 feMorphology(dilate) 對 alpha 做外擴，做出白色 outline
  // 這對小尺寸特別有用（避免「糊成一坨」）。
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="outline" x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="${outlinePx}" result="dilated"/>
      <feFlood flood-color="white" flood-opacity="1" result="flood"/>
      <feComposite in="flood" in2="dilated" operator="in" result="stroke"/>
      <feComposite in="stroke" in2="SourceGraphic" operator="over"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${bg}" />
  <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="${radius}" ry="${radius}" fill="none" stroke="${bgBorder}" />

  <!-- 先畫 outline 版，再畫本體（同位置） -->
  <g filter="url(#outline)">
    <image href="${imgDataUri}" x="${x}" y="${y}" width="${inner}" height="${inner}" image-rendering="pixelated" preserveAspectRatio="xMidYMid meet" />
  </g>
  <image href="${imgDataUri}" x="${x}" y="${y}" width="${inner}" height="${inner}" image-rendering="pixelated" preserveAspectRatio="xMidYMid meet" />
</svg>`;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await fileExists(inputPng))) {
    throw new Error(`找不到輸入檔：${inputPng}`);
  }

  const src = await fs.readFile(inputPng);
  const imgDataUri = `data:image/png;base64,${src.toString("base64")}`;

  // 先產生 512 主輸出（之後再縮小到各尺寸）
  const svg512 = svgIconFrame({
    size: 512,
    radius: 110,
    padding: 104,
    outlinePx: 3,
    imgDataUri,
  });

  const base = sharp(Buffer.from(svg512)).png();
  await base.toFile(outBase512);

  // 多尺寸輸出
  const sizes = [256, 128, 64, 48, 32, 24, 16];
  const pngBuffersForIco = [];

  for (const s of sizes) {
    const out = path.join(assetsDir, `icon_${s}.png`);
    const buf = await sharp(outBase512)
      .resize(s, s, { fit: "cover" })
      .png()
      .toBuffer();
    await fs.writeFile(out, buf);
    if ([256, 128, 64, 48, 32, 24, 16].includes(s)) pngBuffersForIco.push(buf);
  }

  // 產生 .ico
  const icoBuf = await pngToIco(pngBuffersForIco);
  await fs.writeFile(outIco, icoBuf);

  console.log("Icons generated:");
  console.log(" -", outBase512);
  console.log(" -", outIco);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
