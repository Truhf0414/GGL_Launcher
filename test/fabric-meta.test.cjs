"use strict";

// → _notes/plans/instance-sync-v3-commit4a.md T6
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  profileJsonUrls,
  mavenUrlCandidates,
} = require("../lib/fabric-meta.js");

test("T6 profileJsonUrls：meta → meta2 → meta3", () => {
  assert.deepEqual(profileJsonUrls("1.21.11", "0.19.3"), [
    "https://meta.fabricmc.net/v2/versions/loader/1.21.11/0.19.3/profile/json",
    "https://meta2.fabricmc.net/v2/versions/loader/1.21.11/0.19.3/profile/json",
    "https://meta3.fabricmc.net/v2/versions/loader/1.21.11/0.19.3/profile/json",
  ]);
});

test("T6 mavenUrlCandidates：Fabric maven 換三台主機、路徑不變；其他網址只有自己", () => {
  assert.deepEqual(mavenUrlCandidates("https://maven.fabricmc.net/a/b.jar"), [
    "https://maven.fabricmc.net/a/b.jar",
    "https://maven2.fabricmc.net/a/b.jar",
    "https://maven3.fabricmc.net/a/b.jar",
  ]);
  assert.deepEqual(
    mavenUrlCandidates("https://libraries.minecraft.net/x.jar"),
    ["https://libraries.minecraft.net/x.jar"],
  );
});
