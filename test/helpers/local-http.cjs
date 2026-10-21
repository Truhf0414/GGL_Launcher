"use strict";

// 測試用本機 HTTP：handler 自己決定怎麼回（含「寫了 headers 就停住」）。測試要的假伺服器一律從這裡開。
// close 一律先 closeAllConnections——停住的回應不關，node --test 會掛著不結束。
// 一律回 connection: close：keep-alive 的連線會拖到下一案才關，fetch（undici）關它時拿前一案 mock 時鐘的
// 計時器去呼叫下一案 mock 的 clearTimeout，弄亂下一案的計時器佇列，之後推進時間也不觸發
// （→ _notes/plans/test-real-clock.md；回歸測試 test/local-http.test.cjs）。

const http = require("http");

/**
 * @param {(req: http.IncomingMessage, res: http.ServerResponse, n: number) => void} handler n＝第幾個請求（從 1 起）
 * @returns {Promise<{ url: string, requests: { method: string, url: string, headers: object }[], close: () => Promise<void> }>}
 */
async function startServer(handler) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, headers: req.headers });
    res.setHeader("connection", "close");
    handler(req, res, requests.length);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    requests,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/**
 * 照真站台（Cloudflare）的 Range 行為送一份內容：無 Range ⇒ 200 全部；
 * 範圍內 ⇒ 206；起點 ≥ 檔案大小 ⇒ 416 + content-range: bytes *\/<size>。
 */
function serveWithRange(req, res, body) {
  const m = /^bytes=(\d+)-$/.exec(String(req.headers.range || ""));
  if (!m) {
    res.writeHead(200, { "content-length": String(body.length) });
    res.end(body);
    return;
  }
  const start = Number(m[1]);
  if (start >= body.length) {
    res.writeHead(416, { "content-range": `bytes */${body.length}` });
    res.end();
    return;
  }
  const part = body.subarray(start);
  res.writeHead(206, {
    "content-length": String(part.length),
    "content-range": `bytes ${start}-${body.length - 1}/${body.length}`,
  });
  res.end(part);
}

module.exports = { startServer, serveWithRange };
