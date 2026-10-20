"use strict";

// test/ggl-structured-log.test.cjs 的錯誤樣本（形狀照 plans/cross-review-2026-10-phase2.md §Probe 紀錄）。
// 放在 .js 檔：常駐日誌的 st 只收 app 內 .js 的 frame，測試檔本身是 .cjs，frame 會被濾掉。
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const APP_ROOT = path.join(__dirname, "..", "..");

// A1：程式錯
function typeError() {
  try {
    const o = null;
    return o.x;
  } catch (err) {
    return err;
  }
}

// A2：message 多行，其中幾行長得像 frame（含 app 內路徑形狀）
function multiLineMessage() {
  return new Error(
    [
      "token=FAKE_A2",
      "    at https://evil.example/x.js?token=FAKE_A2:1:1",
      "    at C:\\evil\\x.js:1:1",
      `    at ${path.join(APP_ROOT, "FAKE_A2.js")}:1:1`,
    ].join("\n"),
  );
}

// A3：stack 被改寫成網址
function rewrittenStack() {
  const err = new Error("x");
  err.stack = "Error: x\n    at https://evil.example/a.js?token=FAKE_A3:1:1";
  return err;
}

function withCode(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

async function rejectLater() {
  await null;
  throw new Error("anon-async token=FAKE_ANON");
}

// 匿名 async 函式：呼叫端的 frame 是「at async <路徑>:行:欄」，沒有函式名也沒有括號
function anonymousAsync() {
  return (async () => {
    await rejectLater();
  })().catch((err) => err);
}

// 長得像 async frame 的偽造行：在多行 message 裡、在被改寫的 stack 裡
function forgedAsyncFrames() {
  const inMessage = new Error(
    [
      "token=FAKE_AM",
      `    at async ${path.join(APP_ROOT, "FAKE_AM.js")}:1:1`,
      "    at async https://evil.example/x.js?token=FAKE_AM:1:1",
    ].join("\n"),
  );
  const rewritten = new Error("x");
  rewritten.stack = [
    "Error: x",
    "    at async https://evil.example/a.js?token=FAKE_AS:1:1",
    "    at async C:\\evil\\FAKE_AS.js:1:1",
    "    at async fn (https://evil.example/b.js?token=FAKE_AS:2:2)",
  ].join("\n");
  return { inMessage, rewritten };
}

// B1：同步 fs 錯
function readMissingSync(filePath) {
  try {
    fs.readFileSync(filePath);
  } catch (err) {
    return err;
  }
  throw new Error("expected ENOENT");
}

// B6：async 函式裡 await fs.promises.mkdir（Probe：stack 沒有 frame）
async function mkdirMissingAsync(dirPath) {
  try {
    await fsp.mkdir(dirPath);
  } catch (err) {
    return err;
  }
  throw new Error("expected ENOENT");
}

// C1：fetchWithNiceError 的訊息形狀（main/net-fetch.js:87）
function netError() {
  return new Error(
    "連線失敗：https://ggl.example/manifest.json?token=FAKE_C1\nENOTFOUND ggl.example",
  );
}

module.exports = {
  APP_ROOT,
  typeError,
  multiLineMessage,
  rewrittenStack,
  anonymousAsync,
  forgedAsyncFrames,
  withCode,
  readMissingSync,
  mkdirMissingAsync,
  netError,
};
