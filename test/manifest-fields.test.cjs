"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  readManifestVersionString,
  parseManifestNoticeFields,
} = require("../lib/manifest-fields.js");

test("readManifestVersionString", () => {
  assert.equal(readManifestVersionString(null), "");
  assert.equal(readManifestVersionString({}), "");
  assert.equal(readManifestVersionString({ version: 1 }), "");
  assert.equal(readManifestVersionString({ version: " 1.2 " }), " 1.2 ");
});

test("parseManifestNoticeFields: empty / missing", () => {
  assert.deepEqual(parseManifestNoticeFields(null), {
    title: "",
    subtitle: "",
    imageUrl: "",
    logUrl: "",
    inlineLog: [],
  });
  assert.deepEqual(parseManifestNoticeFields({ notice: "nope" }), {
    title: "",
    subtitle: "",
    imageUrl: "",
    logUrl: "",
    inlineLog: [],
  });
});

test("parseManifestNoticeFields: trims strings", () => {
  const f = parseManifestNoticeFields({
    notice: {
      title: "  Hi  ",
      subtitle: " / v1 ",
      imageUrl: " https://x/y.png ",
      logUrl: " https://x/log ",
    },
  });
  assert.equal(f.title, "Hi");
  assert.equal(f.subtitle, "/ v1");
  assert.equal(f.imageUrl, "https://x/y.png");
  assert.equal(f.logUrl, "https://x/log");
  assert.deepEqual(f.inlineLog, []);
});

test("parseManifestNoticeFields: log coerces and caps at 150", () => {
  const lines = Array.from({ length: 160 }, (_, i) => `L${i}`);
  lines.push("", null, 0);
  const f = parseManifestNoticeFields({
    notice: { log: lines, title: "T" },
  });
  assert.equal(f.inlineLog.length, 150);
  assert.equal(f.inlineLog[0], "L0");
  assert.equal(f.inlineLog[149], "L149");
});
