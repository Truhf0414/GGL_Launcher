"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { readVersionsFromMmcPack } = require("../scripts/lib/mmc-pack.js");

// 形狀照 H:\PrismLauncher\instances\GGL3.0\mmc-pack.json（2026-09-25 現查）；cached* 值是假的
const component = (uid, version) => ({
  cachedName: uid,
  cachedVersion: version,
  cachedVolatile: true,
  dependencyOnly: false,
  uid,
  version,
});
const realShape = () => ({
  formatVersion: 1,
  components: [
    component("org.lwjgl3", "3.3.3"),
    component("net.minecraft", "1.21.11"),
    component("net.fabricmc.intermediary", "1.21.11"),
    component("net.fabricmc.fabric-loader", "0.19.3"),
  ],
});

test("mmc-pack：真實形狀 ⇒ Minecraft 與 Fabric loader 版本", () => {
  assert.deepEqual(readVersionsFromMmcPack(realShape()), {
    ok: true,
    value: {
      minecraft: "1.21.11",
      loader: { type: "fabric", version: "0.19.3" },
    },
  });
});

test("mmc-pack：缺 loader、缺 minecraft、components 非陣列 ⇒ 各自 error", () => {
  const noLoader = realShape();
  noLoader.components = noLoader.components.filter(
    (c) => c.uid !== "net.fabricmc.fabric-loader",
  );
  const r1 = readVersionsFromMmcPack(noLoader);
  assert.equal(r1.ok, false);
  assert.match(r1.error, /net\.fabricmc\.fabric-loader/);

  const noMinecraft = realShape();
  noMinecraft.components = noMinecraft.components.filter(
    (c) => c.uid !== "net.minecraft",
  );
  const r2 = readVersionsFromMmcPack(noMinecraft);
  assert.equal(r2.ok, false);
  assert.match(r2.error, /net\.minecraft /);

  for (const bad of [{}, { components: {} }, null]) {
    const r = readVersionsFromMmcPack(bad);
    assert.equal(r.ok, false);
    assert.match(r.error, /components/);
  }
});
