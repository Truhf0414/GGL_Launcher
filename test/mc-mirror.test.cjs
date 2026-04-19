"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  stripTrailingSlashes,
  buildMcMirrors,
  mcUrlFor,
  rewriteLibraryUrlToMirror,
} = require("../main/mc-mirror.js");

test("stripTrailingSlashes", () => {
  assert.equal(stripTrailingSlashes("https://x/"), "https://x");
  assert.equal(stripTrailingSlashes("  "), "");
});

test("mcUrlFor: kinds", () => {
  const b = "https://bmcl";
  assert.equal(
    mcUrlFor({ mirrorBase: b, kind: "manifestV2", value: "" }),
    "https://bmcl/mc/game/version_manifest_v2.json",
  );
  assert.equal(
    mcUrlFor({ mirrorBase: b, kind: "versionJson", value: "1.21" }),
    "https://bmcl/version/1.21/json",
  );
  assert.equal(
    mcUrlFor({
      mirrorBase: "",
      kind: "versionJson",
      value: "https://piston/x",
    }),
    "https://piston/x",
  );
});

test("rewriteLibraryUrlToMirror", () => {
  assert.equal(
    rewriteLibraryUrlToMirror(
      "https://libraries.minecraft.net/com/foo/bar.jar",
      "https://bmcl",
    ),
    "https://bmcl/maven/com/foo/bar.jar",
  );
  assert.equal(
    rewriteLibraryUrlToMirror("https://other.example/x", "https://bmcl"),
    "https://other.example/x",
  );
});

test("buildMcMirrors: optional env base first", (t) => {
  const prev = process.env.GGL_MC_MIRROR_BASE;
  t.after(() => {
    if (prev === undefined) delete process.env.GGL_MC_MIRROR_BASE;
    else process.env.GGL_MC_MIRROR_BASE = prev;
  });
  process.env.GGL_MC_MIRROR_BASE = "https://custom/";
  const list = buildMcMirrors({});
  assert.equal(list[0].name, "自訂鏡像");
  assert.equal(list[0].base, "https://custom");
});
