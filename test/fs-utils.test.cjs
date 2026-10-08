"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const fsUtils = require("../main/fs-utils.js");

test("hashFile: known content gives known sha256", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-fsutils-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "a.txt");
  await fsp.writeFile(file, "abc");
  assert.equal(
    await fsUtils.hashFile(file, "sha256"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("net-fetch and bundled-java load after the import move", () => {
  assert.equal(typeof require("../main/net-fetch.js").downloadToFile, "function");
  assert.equal(
    typeof require("../main/bundled-java.js").ensureBundledJava,
    "function",
  );
});
