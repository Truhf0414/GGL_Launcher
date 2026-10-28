"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseNoticeFields,
  parseNoticeLogText,
  assembleNotice,
} = require("../lib/sync/notice.js");

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

test("parseNoticeLogText: only { log: [...] }; JSON array / {lines} / plain text throw", () => {
  assert.deepEqual(parseNoticeLogText('{"log":["a", 2]}'), ["a", "2"]);
  for (const text of ['["a", 2]', '{"lines":["b"]}', " x \r\n\r\n y "]) {
    assert.throws(() => parseNoticeLogText(text), undefined, text);
  }
});

test("parseNoticeLogText: broken JSON throws; capped at 150", () => {
  assert.throws(() => parseNoticeLogText("{oops"), SyntaxError);
  const log = Array.from({ length: 200 }, (_, i) => `l${i}`);
  assert.equal(parseNoticeLogText(JSON.stringify({ log })).length, 150);
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
