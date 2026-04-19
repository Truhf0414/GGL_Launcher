"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const {
  replacePlaceholders,
  buildClasspath,
  buildGameArgsFromVersionJson,
  ensureRequiredGameArgs,
  resolveVersionChain,
  findAssetIndexUrlFromChain,
} = require("../main/minecraft-version-json.js");

const ph = {
  auth_player_name: "Steve",
  game_directory: "D:\\mc",
  assets_root: "D:\\mc\\assets",
  assets_index_name: "1.21",
  auth_uuid: "u1",
  auth_access_token: "tok",
  user_type: "msa",
  version_name: "1.21.11",
};

test("replacePlaceholders: known keys and unknown preserved", () => {
  assert.equal(
    replacePlaceholders("a ${auth_player_name} ${missing} b", ph),
    "a Steve ${missing} b",
  );
});

test("buildClasspath: artifact path + maven name + version jar", () => {
  const gameDir = "G:\\game";
  const vjar = "G:\\game\\versions\\1.21\\1.21.jar";
  const cp = buildClasspath({
    gameDir,
    versionJarPath: vjar,
    libraries: [
      { downloads: { artifact: { path: "com/foo/bar/1.jar" } } },
      { name: "com.demo:artifact:2.0.0" },
    ],
  });
  assert.ok(cp.includes(path.join(gameDir, "libraries", "com/foo/bar/1.jar")));
  assert.ok(
    cp.includes(
      path.join(
        gameDir,
        "libraries",
        "com/demo/artifact/2.0.0/artifact-2.0.0.jar",
      ),
    ),
  );
  assert.ok(cp.endsWith(";" + vjar));
});

test("buildGameArgsFromVersionJson: modern arguments.game", () => {
  const args = buildGameArgsFromVersionJson(
    {
      arguments: {
        game: [
          "--foo",
          "${version_name}",
          { value: ["--bar", "${auth_player_name}"] },
        ],
      },
    },
    ph,
  );
  assert.deepEqual(args, ["--foo", "1.21.11", "--bar", "Steve"]);
});

test("buildGameArgsFromVersionJson: legacy minecraftArguments", () => {
  const args = buildGameArgsFromVersionJson(
    {
      minecraftArguments:
        "--user ${auth_player_name} --token ${auth_access_token}",
    },
    ph,
  );
  assert.deepEqual(args, ["--user", "Steve", "--token", "tok"]);
});

test("buildGameArgsFromVersionJson: empty legacy falls back to required set", () => {
  const args = buildGameArgsFromVersionJson({ minecraftArguments: "  " }, ph);
  assert.ok(args.includes("--username"));
  assert.ok(args.includes("Steve"));
});

test("ensureRequiredGameArgs: fills missing flags", () => {
  const out = ensureRequiredGameArgs(["--username", "X"], ph);
  assert.ok(out.includes("--gameDir"));
  assert.ok(out.includes("D:\\mc"));
});

test("resolveVersionChain: inheritsFrom merges mainClass and libraries", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-mcver-"));
  t.after(async () => {
    try {
      await fsp.rm(root, { recursive: true, force: true });
    } catch {}
  });
  const gameDir = path.join(root, "g");
  const v1 = path.join(gameDir, "versions", "1.21", "1.21.json");
  const vf = path.join(gameDir, "versions", "fabric", "fabric.json");
  await fsp.mkdir(path.dirname(v1), { recursive: true });
  await fsp.mkdir(path.dirname(vf), { recursive: true });
  await fsp.writeFile(
    v1,
    JSON.stringify({
      id: "1.21",
      mainClass: "net.minecraft.client.Main",
      libraries: [{ name: "base:lib:1" }],
    }),
    "utf8",
  );
  await fsp.writeFile(
    vf,
    JSON.stringify({
      id: "fabric",
      inheritsFrom: "1.21",
      mainClass: "net.fabricmc.loader.impl.launch.knot.KnotClient",
      libraries: [{ name: "fabric:api:1" }],
    }),
    "utf8",
  );

  const merged = await resolveVersionChain({ gameDir, versionId: "fabric" });
  assert.equal(
    merged.mainClass,
    "net.fabricmc.loader.impl.launch.knot.KnotClient",
  );
  assert.equal(merged.libraries.length, 2);
});

test("findAssetIndexUrlFromChain: walks inheritsFrom", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-assetidx-"));
  const gameDir = path.join(root, "g");
  const parentPath = path.join(gameDir, "versions", "p", "p.json");
  const childPath = path.join(gameDir, "versions", "c", "c.json");
  await fsp.mkdir(path.dirname(parentPath), { recursive: true });
  await fsp.mkdir(path.dirname(childPath), { recursive: true });
  await fsp.writeFile(
    parentPath,
    JSON.stringify({
      id: "p",
      assetIndex: {
        url: "https://assets.example/index.json",
        sha1: "deadbeef",
      },
    }),
    "utf8",
  );
  await fsp.writeFile(
    childPath,
    JSON.stringify({ id: "c", inheritsFrom: "p" }),
    "utf8",
  );

  const r = await findAssetIndexUrlFromChain(gameDir, "c");
  assert.deepEqual(r, {
    url: "https://assets.example/index.json",
    sha1: "deadbeef",
  });

  await fsp.rm(root, { recursive: true, force: true });
});
