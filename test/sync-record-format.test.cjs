"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RECORD_FORMAT,
  validateRecord,
} = require("../lib/sync/record-format.js");

const SHA = "a".repeat(64);

function goodRecord(overrides = {}) {
  return {
    format: 3,
    version: "GGL3.1.02",
    appliedAt: "2026-09-29T12:00:00+08:00",
    files: [{ path: "mods/sodium.jar", sha256: SHA }],
    ...overrides,
  };
}

function assertRejected(record, fieldPrefix) {
  const r = validateRecord(record);
  assert.equal(r.ok, false, JSON.stringify(record));
  assert.ok(
    r.error.startsWith(fieldPrefix),
    `${r.error} 應以 ${fieldPrefix} 開頭`,
  );
}

test("RECORD_FORMAT is 3", () => {
  assert.equal(RECORD_FORMAT, 3);
});

test("validateRecord: ③ 形狀（只有 files）原樣通過", () => {
  const rec = goodRecord();
  assert.deepEqual(validateRecord(rec), { ok: true, value: rec });
});

test("validateRecord: ④ 三欄齊全通過；三欄都缺也通過", () => {
  const full = goodRecord({
    minecraft: "1.21.11",
    loader: { type: "fabric", version: "0.19.3" },
    javaMajor: 21,
  });
  assert.deepEqual(validateRecord(full), { ok: true, value: full });
  assert.equal(
    validateRecord(
      goodRecord({ minecraft: undefined, loader: undefined, javaMajor: undefined }),
    ).ok,
    true,
  );
});

test("validateRecord: 必填欄位錯", () => {
  assertRejected(null, "record");
  assertRejected([], "record");
  assertRejected(goodRecord({ format: 2 }), "record.format");
  assertRejected(goodRecord({ version: undefined }), "record.version");
  assertRejected(goodRecord({ appliedAt: undefined }), "record.appliedAt");
  assertRejected(goodRecord({ files: "x" }), "record.files");
});

test("validateRecord: files 每筆的形狀", () => {
  assertRejected(goodRecord({ files: ["mods/a.jar"] }), "record.files[0]");
  assertRejected(
    goodRecord({ files: [{ path: "mods/a.jar" }] }),
    "record.files[0].sha256",
  );
  assertRejected(
    goodRecord({ files: [{ path: "mods/a.jar", sha256: "A".repeat(64) }] }),
    "record.files[0].sha256",
  );
  assertRejected(
    goodRecord({ files: [{ path: "../a.jar", sha256: SHA }] }),
    "record.files[0].path",
  );
  assertRejected(
    goodRecord({ files: [{ path: "config/", sha256: SHA }] }),
    "record.files[0].path",
  );
});

test("validateRecord: path 重複、只差大小寫、上下層 ⇒ 不過", () => {
  const two = (a, b) =>
    goodRecord({
      files: [
        { path: a, sha256: SHA },
        { path: b, sha256: SHA },
      ],
    });
  assertRejected(two("mods/a.jar", "mods/a.jar"), "record.files");
  assertRejected(two("mods/Foo.jar", "mods/FOO.jar"), "record.files");
  assertRejected(two("mods", "mods/a.jar"), "record.files");
});

test("validateRecord: ④ 三欄存在但型別錯（含 null）⇒ 不過", () => {
  assertRejected(goodRecord({ minecraft: null }), "record.minecraft");
  assertRejected(goodRecord({ minecraft: 1 }), "record.minecraft");
  assertRejected(goodRecord({ loader: null }), "record.loader");
  assertRejected(
    goodRecord({ loader: { type: "fabric", version: 3 } }),
    "record.loader",
  );
  assertRejected(
    goodRecord({ loader: { version: "0.19.3" } }),
    "record.loader",
  );
  assertRejected(goodRecord({ javaMajor: "21" }), "record.javaMajor");
  assertRejected(goodRecord({ javaMajor: 0 }), "record.javaMajor");
  assertRejected(goodRecord({ javaMajor: 1.5 }), "record.javaMajor");
  assertRejected(goodRecord({ javaMajor: null }), "record.javaMajor");
});
