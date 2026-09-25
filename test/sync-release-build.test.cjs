"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRelease,
  diffReleases,
  selectBlobsToKeep,
  checkReleaseSanity,
} = require("../scripts/lib/release-build.js");
const { validateRelease } = require("../lib/sync/site-format.js");
const { compileGlob } = require("../lib/sync/glob.js");
const publishConfig = require("../scripts/publish-config.js");

const sha = (c) => c.repeat(64);
const entry = (path, c = "a") => ({ path, sha256: sha(c), size: 1 });
const MMC = { minecraft: "1.21.11", loader: { type: "fabric", version: "0.19.3" } };
const NOW = new Date("2026-09-25T10:20:30Z");

const config = {
  include: ["mods/", "config/", "options.txt", "Saves/"],
  exclude: ["**/.index/**", "**/*.bak"],
  playerEditable: ["config/", "options.txt"],
  protectedPaths: ["saves/", "hotbar.nbt"],
};

function build(entries, overrides = {}) {
  return buildRelease({ version: "v1", mmcPack: MMC, entries, publishConfig: config, now: NOW, ...overrides });
}

function release(files, playerEditable = ["config/"]) {
  return {
    version: "x",
    publishedAt: "2026-09-25T00:00:00+08:00",
    minecraft: "1.21.11",
    loader: { type: "fabric", version: "0.19.3" },
    playerEditable,
    files: files.map(([path, c]) => ({ path, sha256: sha(c), size: 1 })),
  };
}

test("buildRelease：include／exclude；不在 include 的既不收也不算排除", () => {
  const { release: r, excluded, errors } = build([
    entry("mods/b.jar"),
    entry("mods/a.jar"),
    entry("mods/.index/a.pw.toml"),
    entry("config/x.bak"),
    entry("options.txt"),
    entry("logs/latest.log"),
  ]);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    r.files.map((f) => f.path),
    ["mods/a.jar", "mods/b.jar", "options.txt"],
  );
  assert.deepEqual(excluded, [
    { path: "mods/.index/a.pw.toml", rule: "**/.index/**" },
    { path: "config/x.bak", rule: "**/*.bak" },
  ]);
});

test("buildRelease：產出過 validateRelease，版本欄照 mmc-pack，playerEditable 照設定", () => {
  const { release: r } = build([entry("mods/a.jar")]);
  assert.equal(validateRelease(r).ok, true);
  assert.equal(r.version, "v1");
  assert.equal(r.minecraft, "1.21.11");
  assert.deepEqual(r.loader, { type: "fabric", version: "0.19.3" });
  assert.deepEqual(r.playerEditable, ["config/", "options.txt"]);
});

test("buildRelease：publishedAt 帶時區偏移，解析回來等於 now", () => {
  const { release: r } = build([entry("mods/a.jar")]);
  assert.match(r.publishedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  assert.equal(Date.parse(r.publishedAt), NOW.getTime());
});

test("buildRelease：保護名單路徑（含大小寫變體）出現在來源 ⇒ error", () => {
  for (const p of ["Saves/x", "saves/world/level.dat", "hotbar.nbt"]) {
    const { release: r, errors } = build([entry("mods/a.jar"), entry(p)]);
    assert.equal(r, null);
    assert.deepEqual(
      errors.map((e) => [e.code, e.path]),
      [["protected-path", p]],
    );
  }
});

test("buildRelease：大小寫衝突、路徑不合法 ⇒ error", () => {
  const collision = build([entry("mods/A.jar"), entry("mods/a.jar")]);
  assert.equal(collision.release, null);
  assert.deepEqual(collision.errors.map((e) => e.code), ["casefold-collision"]);

  const bad = build([entry("mods/a?.jar")]);
  assert.equal(bad.release, null);
  assert.deepEqual(bad.errors.map((e) => e.code), ["invalid-path"]);
});

test("buildRelease：版本名只擋不能當檔名的（假設 A4）", () => {
  for (const v of ["../x", "a:b", "", ".hidden", "a/b"]) {
    const { release: r, errors } = build([entry("mods/a.jar")], { version: v });
    assert.equal(r, null, v);
    assert.deepEqual(errors.map((e) => e.code), ["invalid-version"], v);
  }
  assert.notEqual(build([entry("mods/a.jar")], { version: "GGL3 測試版" }).release, null);
  assert.notEqual(build([entry("mods/a.jar")], { version: "GGL3.1.02" }).release, null);
});

test("diffReleases：新增／變更／刪除／不變", () => {
  const prev = release([["mods/a.jar", "a"], ["mods/b.jar", "b"], ["mods/c.jar", "c"]]);
  const next = release([["mods/a.jar", "a"], ["mods/b.jar", "d"], ["mods/e.jar", "e"]]);
  const d = diffReleases(prev, next);
  assert.deepEqual(d.added, ["mods/e.jar"]);
  assert.deepEqual(d.changed, ["mods/b.jar"]);
  assert.deepEqual(d.removed, ["mods/c.jar"]);
  assert.equal(d.unchanged, 1);
});

test("diffReleases：playerEditableTouched 只含清單內且新增或變更者", () => {
  const prev = release([["config/a.toml", "a"], ["config/b.toml", "b"], ["mods/x.jar", "a"]]);
  const next = release([["config/a.toml", "c"], ["config/b.toml", "b"], ["config/new.toml", "d"], ["mods/x.jar", "e"]]);
  assert.deepEqual(diffReleases(prev, next).playerEditableTouched, ["config/new.toml", "config/a.toml"]);
});

test("diffReleases：玩家可改清單的變化；首發全部算新增", () => {
  const prev = release([], ["config/", "servers.dat"]);
  const next = release([], ["config/", "options.txt"]);
  assert.deepEqual(diffReleases(prev, next).playerEditableListChanged, {
    added: ["options.txt"],
    removed: ["servers.dat"],
  });
  const first = diffReleases(null, release([["mods/a.jar", "a"]]));
  assert.deepEqual(first.added, ["mods/a.jar"]);
  assert.deepEqual(first.playerEditableListChanged, { added: [], removed: [] });
});

test("selectBlobsToKeep：各版 sha256 聯集", () => {
  const keep = selectBlobsToKeep([
    release([["mods/a.jar", "a"], ["mods/b.jar", "b"]]),
    null,
    release([["mods/a.jar", "a"], ["mods/c.jar", "c"]]),
  ]);
  assert.deepEqual([...keep].sort(), [sha("a"), sha("b"), sha("c")]);
});

test("checkReleaseSanity：空清單、刪超過一半 ⇒ 不過；首發 ⇒ 過（假設 16-1）", () => {
  const four = release([["a", "a"], ["b", "b"], ["c", "c"], ["d", "d"]]);
  assert.deepEqual(checkReleaseSanity(four, release([])), { ok: false, reasons: ["empty", "removes-over-half"] });
  assert.deepEqual(checkReleaseSanity(four, release([["a", "a"]])), { ok: false, reasons: ["removes-over-half"] });
  assert.deepEqual(checkReleaseSanity(four, release([["a", "a"], ["b", "b"]])), { ok: true, reasons: [] });
  assert.deepEqual(checkReleaseSanity(null, release([["a", "a"]])), { ok: true, reasons: [] });
  assert.deepEqual(checkReleaseSanity(null, release([])), { ok: false, reasons: ["empty"] });
});

test("publish-config：playerEditable 每項被 include 某項涵蓋（假設 A7）", () => {
  const includes = publishConfig.include.map((p) => compileGlob(p));
  for (const item of publishConfig.playerEditable) {
    const probe = item.endsWith("/") ? `${item}x` : item;
    assert.ok(
      includes.some((m) => m(probe)),
      `${item} 沒有被任何 include 涵蓋`,
    );
  }
});
