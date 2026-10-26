"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeAllowedHosts,
  filterButtonUrl,
} = require("../lib/discord-button-url.js");

test("normalizeAllowedHosts dedupes and lowercases", () => {
  assert.deepEqual(
    normalizeAllowedHosts([" Discord.GG ", "discord.gg", ""]),
    ["discord.gg"],
  );
});

test("filterButtonUrl: non-http rejected", () => {
  assert.equal(
    filterButtonUrl("ftp://a/b", ["a"]),
    "",
  );
  assert.equal(filterButtonUrl("javascript:alert(1)", []), "");
});

test("filterButtonUrl: empty allowlist passes any https", () => {
  const u = "https://evil.example/join";
  assert.equal(filterButtonUrl(u, []), u);
  // 原本還有 allowedHosts 是 null 的一列：清單來自 server-config、一定是陣列（test/server-config.test.cjs 釘住），那條退路已刪（→ _notes/plans/cross-review-2026-10-phase6c.md U4）
});

test("filterButtonUrl: allowlist blocks other host", () => {
  assert.equal(
    filterButtonUrl("https://evil.example/join", ["discord.gg"]),
    "",
  );
});

test("filterButtonUrl: allowlist allows listed host", () => {
  const u = "https://Discord.GG/invite/foo";
  assert.equal(filterButtonUrl(u, ["discord.gg"]), u);
});
