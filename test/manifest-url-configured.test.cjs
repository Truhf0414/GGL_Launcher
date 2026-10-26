"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isRemoteManifestUrlConfigured,
} = require("../lib/manifest-url-configured.js");

// 原本還有只含空白、example.com 佔位的列：值是 server-config 出貨的字串（test/server-config.test.cjs 釘住），
// 佔位範本早已不存在，那兩條退路已刪（→ _notes/plans/cross-review-2026-10-phase6c.md U4）
test('isRemoteManifestUrlConfigured："" ⇒ 沒開同步；其他 ⇒ 有', () => {
  assert.equal(isRemoteManifestUrlConfigured(""), false);
  assert.equal(
    isRemoteManifestUrlConfigured("https://ggl3.example/manifest.json"),
    true,
  );
});
