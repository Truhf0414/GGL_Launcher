"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MANIFEST_FORMAT,
  isBlobName,
  validateIndex,
  validateGate,
  validateNotice,
  validateRelease,
  fileListError,
  resolveSiteUrls,
  compareVersionCore,
} = require("../lib/sync/site-format.js");

const SHA = "a".repeat(64);

function goodRelease(overrides = {}) {
  return {
    version: "GGL3.1.02",
    publishedAt: "2026-09-19T12:00:00+08:00",
    minecraft: "1.21.11",
    loader: { type: "fabric", version: "0.19.3" },
    playerEditable: ["config/", "options.txt", "shaderpacks/*.txt"],
    files: [{ path: "mods/sodium.jar", sha256: SHA, size: 1234567 }],
    ...overrides,
  };
}

function assertErrorAt(result, fieldPrefix) {
  assert.equal(result.ok, false, `應為 error：${fieldPrefix}`);
  assert.ok(
    result.error.startsWith(fieldPrefix),
    `error 應點名 ${fieldPrefix}，實際：${result.error}`,
  );
}

const INDEX = {
  format: 3,
  gate: "gate.json",
  notice: "notice.json",
  release: "release.json",
  files: "files/",
};
const INDEX_URL_KEYS = ["gate", "notice", "release", "files"];

test("index：標準形狀 ok；format 2 ⇒ error、不是 newer", () => {
  assert.equal(MANIFEST_FORMAT, 3);
  assert.equal(validateIndex(INDEX).ok, true);
  assertErrorAt(validateIndex({ ...INDEX, format: 2 }), "index.format");
  assertErrorAt(validateIndex({ ...INDEX, files: "files" }), "index.files");
  assertErrorAt(validateIndex({ ...INDEX, release: "" }), "index.release");
});

test("N29 index：format 4（整數、較新）⇒ ok:false、newer:true、叫人下載新版啟動器、不帶欄位路徑", () => {
  const r = validateIndex({ ...INDEX, format: 4 });
  assert.equal(r.ok, false);
  assert.equal(r.newer, true);
  assert.match(r.error, /format 4/);
  assert.match(r.error, /請下載新版啟動器/);
  // 照原樣顯示給玩家，不帶欄位路徑
  assert.equal(r.error.startsWith("index."), false, r.error);
});

const NOT_NEWER_FORMATS = [
  ["2", 2],
  ['字串 "3"', "3"],
  ['字串 "4"', "4"],
  ["3.5", 3.5],
  ["缺", undefined],
];
for (const [label, format] of NOT_NEWER_FORMATS) {
  test(`N29 index：format ${label} ⇒ ok:false、沒有 newer`, () => {
    const r = validateIndex({ ...INDEX, format });
    assertErrorAt(r, "index.format");
    assert.equal("newer" in r, false);
  });
}

for (const key of INDEX_URL_KEYS) {
  test(`N29 index：${key} 寫成 "http://" ⇒ ok:false、訊息點名 index.${key}`, () => {
    assertErrorAt(
      validateIndex({ ...INDEX, [key]: "http://" }),
      `index.${key}`,
    );
  });
}

const BAD_SCHEME_URLS = [
  "ftp://example.com/x/",
  "file:///C:/x/",
  "javascript:alert(1)/",
  "data:text/plain,x/",
];
for (const url of BAD_SCHEME_URLS) {
  test(`N29 index：絕對網址 ${url.slice(0, url.indexOf(":") + 1)} ⇒ ok:false`, () => {
    for (const key of INDEX_URL_KEYS) {
      assertErrorAt(validateIndex({ ...INDEX, [key]: url }), `index.${key}`);
    }
  });
}

test("N29 index：相對路徑與 https 絕對網址 ⇒ ok", () => {
  assert.equal(
    validateIndex({ ...INDEX, gate: "sub/gate.json", files: "../files/" }).ok,
    true,
  );
  const abs = {
    format: 3,
    gate: "https://example.com/g.json",
    notice: "https://example.com/n.json",
    release: "https://example.com/r.json",
    files: "https://cdn.example.com/files/",
  };
  assert.deepEqual(validateIndex(abs), { ok: true, value: abs });
});

test("resolveSiteUrls：相對於 manifest 自己的 URL", () => {
  const urls = resolveSiteUrls("https://example.com/ggl/manifest.json", {
    gate: "gate.json",
    notice: "notice.json",
    release: "release.json",
    files: "files/",
  });
  assert.deepEqual(urls, {
    gate: "https://example.com/ggl/gate.json",
    notice: "https://example.com/ggl/notice.json",
    release: "https://example.com/ggl/release.json",
    files: "https://example.com/ggl/files/",
  });
});

test("gate：空殼 {} ok；maintenance 缺 message ⇒ ok 且補成空字串", () => {
  assert.deepEqual(validateGate({}), {
    ok: true,
    value: { maintenance: null, minLauncherVersion: null },
  });
  assert.deepEqual(
    validateGate({ maintenance: { enabled: true } }).value.maintenance,
    {
      enabled: true,
      message: "",
    },
  );
  assertErrorAt(
    validateGate({ maintenance: { enabled: "yes" } }),
    "gate.maintenance.enabled",
  );
});

test("gate：minLauncherVersion 必須是 x.y.z", () => {
  assert.equal(validateGate({ minLauncherVersion: "1.0.0" }).ok, true);
  for (const bad of [100, "1.0", "1.0.0-beta"]) {
    assertErrorAt(
      validateGate({ minLauncherVersion: bad }),
      "gate.minLauncherVersion",
    );
  }
});

test("notice：空殼 ok；型別錯 ⇒ error", () => {
  assert.deepEqual(validateNotice({ notice: null, notifications: [] }), {
    ok: true,
    value: { notice: null, notifications: [] },
  });
  assert.equal(validateNotice({ notice: { title: "x" } }).ok, true);
  assertErrorAt(validateNotice({ notice: "x" }), "notice.notice");
  assertErrorAt(validateNotice({ notifications: {} }), "notice.notifications");
});

test("release：標準形狀 ok；空 files ok", () => {
  assert.equal(validateRelease(goodRelease()).ok, true);
  assert.equal(validateRelease(goodRelease({ files: [] })).ok, true);
});

test("release：缺欄或型別錯 ⇒ error 點名該欄", () => {
  const { minecraft, ...noMinecraft } = goodRelease();
  assertErrorAt(validateRelease(noMinecraft), "release.minecraft");
  assertErrorAt(
    validateRelease(goodRelease({ loader: { type: "forge", version: "1" } })),
    "release.loader.type",
  );
  assertErrorAt(
    validateRelease(goodRelease({ loader: { type: "fabric" } })),
    "release.loader.version",
  );
  const { playerEditable, ...noPlayerEditable } = goodRelease();
  assertErrorAt(validateRelease(noPlayerEditable), "release.playerEditable");
  assertErrorAt(
    validateRelease(goodRelease({ playerEditable: "config/" })),
    "release.playerEditable",
  );
  assertErrorAt(
    validateRelease(goodRelease({ playerEditable: ["config/", 3] })),
    "release.playerEditable[1]",
  );
  assertErrorAt(
    validateRelease(goodRelease({ playerEditable: ["../config/"] })),
    "release.playerEditable[0]",
  );
  assertErrorAt(
    validateRelease(goodRelease({ version: "" })),
    "release.version",
  );
  assertErrorAt(
    validateRelease(goodRelease({ publishedAt: "not a date" })),
    "release.publishedAt",
  );
});

test("release：files 每筆的 path／sha256／size", () => {
  const file = { path: "mods/a.jar", sha256: SHA, size: 1 };
  assertErrorAt(
    validateRelease(
      goodRelease({ files: [{ ...file, path: "mods/../a.jar" }] }),
    ),
    "release.files[0].path",
  );
  assertErrorAt(
    validateRelease(
      goodRelease({ files: [{ ...file, sha256: "A".repeat(64) }] }),
    ),
    "release.files[0].sha256",
  );
  assertErrorAt(
    validateRelease(goodRelease({ files: [{ ...file, sha256: "abc" }] })),
    "release.files[0].sha256",
  );
  assertErrorAt(
    validateRelease(goodRelease({ files: [{ ...file, size: -1 }] })),
    "release.files[0].size",
  );
  assertErrorAt(
    validateRelease(goodRelease({ files: [{ ...file, size: 1.5 }] })),
    "release.files[0].size",
  );
});

test("release：minecraft／loader.version 開頭必須是英數（假設 18-10）", () => {
  for (const bad of ["1.21/../x", "..", "."]) {
    assertErrorAt(
      validateRelease(goodRelease({ minecraft: bad })),
      "release.minecraft",
    );
  }
  assertErrorAt(
    validateRelease(
      goodRelease({ loader: { type: "fabric", version: "0.19\\3" } }),
    ),
    "release.loader.version",
  );
});

test("release：files 重複、只差大小寫、上下層衝突 ⇒ 各自 error", () => {
  const f = (p) => ({ path: p, sha256: SHA, size: 1 });
  assertErrorAt(
    validateRelease(goodRelease({ files: [f("mods/A.jar"), f("mods/a.jar")] })),
    "release.files",
  );
  assertErrorAt(
    validateRelease(goodRelease({ files: [f("a/b"), f("a/b/c.toml")] })),
    "release.files",
  );
  assertErrorAt(
    validateRelease(goodRelease({ files: [f("mods/a.jar"), f("mods/a.jar")] })),
    "release.files",
  );
});

test("fileListError：withSize 決定每筆要不要 size；label 當訊息開頭", () => {
  const noSize = [{ path: "mods/a.jar", sha256: SHA }];
  assert.equal(
    fileListError(noSize, "record.files", { withSize: false }),
    null,
  );
  assert.equal(
    fileListError(noSize, "release.files", { withSize: true }),
    "release.files[0].size: 必須是 ≥0 的整數",
  );
  assert.equal(
    fileListError([...noSize, ...noSize], "record.files", { withSize: false }),
    "record.files: path 重複（mods/a.jar）",
  );
});

test("isBlobName", () => {
  assert.equal(isBlobName(SHA), true);
  assert.equal(isBlobName("A".repeat(64)), false);
  assert.equal(isBlobName("a".repeat(63)), false);
  assert.equal(isBlobName(`${SHA}.tmp`), false);
  assert.equal(isBlobName(undefined), false);
});

test("compareVersionCore：只比 x.y.z，後綴忽略（假設 18-6）", () => {
  assert.equal(compareVersionCore("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersionCore("1.0.1", "1.0.0"), 1);
  assert.equal(compareVersionCore("1.0.0", "1.0.1"), -1);
  assert.equal(compareVersionCore("1.10.0", "1.9.0"), 1);
  assert.equal(compareVersionCore("1.0.0-beta", "1.0.0"), 0);
  assert.equal(compareVersionCore("1.0.0-beta.2", "1.0.0"), 0);
  assert.throws(() => compareVersionCore("x", "1.0.0"), TypeError);
});
