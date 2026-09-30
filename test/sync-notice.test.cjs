"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseNoticeFields,
  parseNoticeLogText,
  assembleNotice,
} = require("../lib/sync/notice.js");
const { parseManifestNoticeFields } = require("../lib/manifest-fields.js");

test("parseNoticeFields: manifest-fields re-exports the same function (one copy)", () => {
  assert.equal(parseManifestNoticeFields, parseNoticeFields);
});

test("parseNoticeFields: trims strings, caps inline log at 150, ignores a non-object notice", () => {
  const f = parseNoticeFields({
    notice: {
      title: " T ",
      subtitle: "S",
      imageUrl: " https://x/i.png ",
      logUrl: "https://x/log.json",
      log: Array.from({ length: 200 }, (_, i) => `l${i}`),
    },
  });
  assert.equal(f.title, "T");
  assert.equal(f.imageUrl, "https://x/i.png");
  assert.equal(f.inlineLog.length, 150);
  assert.deepEqual(parseNoticeFields({ notice: "x" }), {
    title: "",
    subtitle: "",
    imageUrl: "",
    logUrl: "",
    inlineLog: [],
  });
});

test("parseNoticeLogText: JSON array / {log} / {lines} / plain text", () => {
  assert.deepEqual(parseNoticeLogText('["a", 2]', "application/json"), [
    "a",
    "2",
  ]);
  assert.deepEqual(parseNoticeLogText('{"log":["a"]}', ""), ["a"]);
  assert.deepEqual(parseNoticeLogText('{"lines":["b"]}', ""), ["b"]);
  assert.deepEqual(parseNoticeLogText(" x \r\n\r\n y ", "text/plain"), [
    "x",
    "y",
  ]);
});

test("parseNoticeLogText: broken JSON falls back to lines; capped at 150", () => {
  assert.deepEqual(parseNoticeLogText("{oops", "application/json"), ["{oops"]);
  const many = Array.from({ length: 200 }, (_, i) => `l${i}`).join("\n");
  assert.equal(parseNoticeLogText(many, "").length, 150);
});

test("assembleNotice: inline log wins; remote log used only when inline is empty", () => {
  const withInline = {
    title: "T",
    subtitle: "",
    imageUrl: "",
    logUrl: "u",
    inlineLog: ["i"],
  };
  assert.deepEqual(assembleNotice(withInline, ["r"]).log, ["i"]);
  const noInline = { ...withInline, inlineLog: [] };
  assert.deepEqual(assembleNotice(noInline, ["r"]), {
    title: "T",
    subtitle: "",
    imageUrl: "",
    logUrl: "u",
    log: ["r"],
  });
});

test("assembleNotice: everything empty ⇒ null", () => {
  const empty = {
    title: "",
    subtitle: "",
    imageUrl: "",
    logUrl: "",
    inlineLog: [],
  };
  assert.equal(assembleNotice(empty, []), null);
});
