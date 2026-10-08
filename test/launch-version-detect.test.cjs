"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { detectLaunchVersionId } = require("../main/launch-version-detect.js");

async function writeJson(p, body) {
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.writeFile(p, JSON.stringify(body), "utf8");
}

test("detectLaunchVersionId: prefers fabric matching preferred MC version", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-detect-"));
  t.after(async () => {
    try {
      await fsp.rm(root, { recursive: true, force: true });
    } catch {}
  });
  const gameDir = path.join(root, "g");
  const vdir = path.join(gameDir, "versions");
  await writeJson(
    path.join(
      vdir,
      "fabric-loader-0.19.1-1.21.11",
      "fabric-loader-0.19.1-1.21.11.json",
    ),
    {},
  );
  await writeJson(path.join(vdir, "1.21.11", "1.21.11.json"), {});

  const id = await detectLaunchVersionId(gameDir, "1.21.11");
  assert.equal(id, "fabric-loader-0.19.1-1.21.11");
});

test("detectLaunchVersionId: empty when no valid json files", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-detect2-"));
  t.after(async () => {
    try {
      await fsp.rm(root, { recursive: true, force: true });
    } catch {}
  });
  const gameDir = path.join(root, "g");
  await fsp.mkdir(path.join(gameDir, "versions", "ghost"), { recursive: true });
  const id = await detectLaunchVersionId(gameDir, "1.21.11");
  assert.equal(id, "");
});
