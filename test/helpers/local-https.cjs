"use strict";

// 測試用本機 HTTPS：同時提供 h2 與 http/1.1（ALPN 由客戶端挑），handler 看 req.httpVersion 就知道協商出哪個。
// 憑證是只給這個測試用的自簽憑證（CN=localhost、SAN 127.0.0.1、有效到 2126 年），私鑰沒有任何用途；
// 不要拿去別處。信任它的方式見 trustTestCertificate。

const http2 = require("http2");
const tls = require("tls");

const CERT = `-----BEGIN CERTIFICATE-----
MIIBmzCCAUGgAwIBAgIUNLf7S6iva0Eq7vqXZaLoAY/2Zz4wCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAzMDE5MTE0N1oYDzIxMjYxMDA2
MTkxMTQ3WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAAT6PKFcx88NwyTkU806b3iscQKd2ptYkNrkbQhtA/Z4RSEWUiMGKZfP
w9RpW1iVhVmGvb8jHRJFHU2Q7kgrL0P3o28wbTAdBgNVHQ4EFgQUJNZVqEpx5sXu
lbmrEVzNRbVWeswwHwYDVR0jBBgwFoAUJNZVqEpx5sXulbmrEVzNRbVWeswwDwYD
VR0TAQH/BAUwAwEB/zAaBgNVHREEEzARhwR/AAABgglsb2NhbGhvc3QwCgYIKoZI
zj0EAwIDSAAwRQIgBeCZAwSjPso2uE3w8nt6qoJ+GnClLFXud91/2pj/zcMCIQCX
kJ1MBWMyNmuY0GxJdPkeMU/Hj9izIREQLArfh/MgKQ==
-----END CERTIFICATE-----
`;

const KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgqJQCt4rKZuWOyuxE
rVs658lIWDsfUJJlMdpCnCBfzuihRANCAAT6PKFcx88NwyTkU806b3iscQKd2ptY
kNrkbQhtA/Z4RSEWUiMGKZfPw9RpW1iVhVmGvb8jHRJFHU2Q7kgrL0P3
-----END PRIVATE KEY-----
`;

/**
 * 讓本行程之後新建的 TLS 連線信任上面那張憑證（同時不再信任系統根憑證）。
 * 行程層級的狀態：node --test 每個測試檔一個行程，所以只在用得到的測試檔呼叫，不外洩到別的檔。
 */
function trustTestCertificate() {
  tls.setDefaultCACertificates([CERT]);
}

/**
 * @param {(req: import("http2").Http2ServerRequest | import("http").IncomingMessage, res: any, n: number) => void} handler
 * @returns {Promise<{ url: string, requests: { httpVersion: string, method: string, url: string, headers: object }[], close: () => Promise<void> }>}
 */
async function startH2AndH1Server(handler) {
  const requests = [];
  const sockets = new Set();
  const server = http2.createSecureServer(
    { key: KEY, cert: CERT, allowHTTP1: true },
    (req, res) => {
      requests.push({
        httpVersion: req.httpVersion,
        method: req.method,
        url: req.url,
        headers: req.headers,
      });
      handler(req, res, requests.length);
    },
  );
  server.on("secureConnection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `https://127.0.0.1:${server.address().port}`,
    requests,
    close: () =>
      new Promise((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}

module.exports = { startH2AndH1Server, trustTestCertificate };
