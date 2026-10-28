"use strict";

// → _notes/plans/instance-sync-v3-commit4a.md T4、T5、T13–T15（T3 於 ⑤b 刪，→ instance-sync-v3-commit5b.md V2）
const test = require("node:test");
const assert = require("node:assert/strict");

const { libraryArtifact } = require("../lib/library-filter.js");
const fx = require("./helpers/runtime-fixtures.cjs");

test("T4 libraryArtifact：有 artifact ⇒ 用 artifact 的欄位", () => {
  const lib = fx.vanilla().libraries.find((l) => !l.rules);
  const a = lib.downloads.artifact;
  assert.deepEqual(libraryArtifact(lib), {
    rel: a.path,
    url: a.url,
    sha1: a.sha1,
    size: a.size,
  });
});

test("T4 libraryArtifact：沒有 downloads ⇒ 由 name 推 Maven 路徑，url 接在 lib.url 後", () => {
  const lib = {
    name: "net.fabricmc:fabric-loader:0.19.3",
    url: "https://maven.fabricmc.net/",
  };
  const rel = "net/fabricmc/fabric-loader/0.19.3/fabric-loader-0.19.3.jar";
  assert.deepEqual(libraryArtifact(lib), {
    rel,
    url: `https://maven.fabricmc.net/${rel}`,
    sha1: "",
    size: 0,
  });
});

test("T4 libraryArtifact：四段 name 的 classifier 接在檔名後；兩段、帶 @ ⇒ 丟錯", () => {
  assert.equal(
    libraryArtifact({ name: "org.x:y:1.0:natives-windows", url: "https://m/" })
      .rel,
    "org/x/y/1.0/y-1.0-natives-windows.jar",
  );
  assert.throws(
    () => libraryArtifact({ name: "org.x:y", url: "https://m/" }),
    /name 不是/,
  );
  assert.throws(
    () => libraryArtifact({ name: "org.x:y:1.0@zip", url: "https://m/" }),
    /name 不是/,
  );
});

test("T5 libraryArtifact：Fabric fixture 8 支的 rel 與 installer 的 getPath 相同", () => {
  const libs = fx.fabric().libraries;
  assert.equal(libs.length, 8);
  for (const lib of libs) {
    assert.equal(
      libraryArtifact(lib).rel,
      fx.installerLibraryPath(lib.name),
      lib.name,
    );
  }
});

test("T13 libraryArtifact：有 downloads 但沒有 artifact ⇒ 丟錯（不退回由 name 推）", () => {
  assert.throws(
    () =>
      libraryArtifact({
        name: "a:b:1",
        downloads: { classifiers: { "natives-windows": { path: "a/b.jar" } } },
      }),
    /沒有 artifact/,
  );
});

test("T14 libraryArtifact：路徑跳出 libraries/ ⇒ 丟錯", () => {
  const withPath = (p) => ({
    name: "a:b:1",
    downloads: { artifact: { path: p, url: "https://x/", sha1: "", size: 0 } },
  });
  assert.throws(() => libraryArtifact(withPath("../x.jar")), /路徑不合法/);
  assert.throws(() => libraryArtifact(withPath("a/../../x.jar")), /路徑不合法/);
  assert.throws(
    () => libraryArtifact({ name: "..:x:1", url: "https://m/" }),
    /路徑不合法/,
  );
});

test("T14 反向：兩支 fixture 的每一支 library 都不被誤擋", () => {
  for (const lib of [...fx.vanilla().libraries, ...fx.fabric().libraries]) {
    assert.doesNotThrow(() => libraryArtifact(lib), lib.name);
  }
});

test("T15 libraryArtifact：lib.url 結尾有無 / 結果相同；沒有 url ⇒ 丟錯", () => {
  const name = "net.fabricmc:intermediary:1.21.11";
  assert.equal(
    libraryArtifact({ name, url: "https://maven.fabricmc.net" }).url,
    libraryArtifact({ name, url: "https://maven.fabricmc.net/" }).url,
  );
  assert.throws(() => libraryArtifact({ name }), /沒有 url/);
});
