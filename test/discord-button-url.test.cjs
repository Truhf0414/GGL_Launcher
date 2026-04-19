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
  assert.equal(filterButtonUrl(u, null), u);
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
