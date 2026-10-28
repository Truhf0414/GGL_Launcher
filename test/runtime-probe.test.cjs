"use strict";

// 就緒預設 probe 的語意（→ _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」probe；SPR R#23）
const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { makeRuntimeProbe } = require("../main/sync/runtime-probe.js");
const { getPaths } = require("../lib/paths-layout.js");

async function setup(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-probe-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const paths = getPaths({ launcherRootDir: root });
  const put = async (base, rel, content) => {
    const p = path.join(
      base === "root" ? paths.root : paths.gameDir,
      ...rel.split("/"),
    );
    await fsp.mkdir(path.dirname(p), { recursive: true });
    if (content === null) await fsp.mkdir(p, { recursive: true });
    else await fsp.writeFile(p, content);
  };
  return { paths, put, probe: makeRuntimeProbe(paths) };
}

test("isFile：一般檔案 ⇒ true；不存在、上層是檔案 ⇒ false；資料夾佔在那裡 ⇒ false", async (t) => {
  const h = await setup(t);
  await h.put("gameDir", "a/b.jar", "x");
  await h.put("gameDir", "dir.jar", null);
  await h.put("root", "runtime/java-21/bin/java.exe", "");
  assert.equal(await h.probe.isFile("gameDir", "a/b.jar"), true);
  assert.equal(
    await h.probe.isFile("root", "runtime/java-21/bin/java.exe"),
    true,
  );
  assert.equal(await h.probe.isFile("gameDir", "nope.jar"), false);
  assert.equal(await h.probe.isFile("gameDir", "a/b.jar/c"), false);
  assert.equal(await h.probe.isFile("gameDir", "dir.jar"), false);
  assert.equal(await h.probe.isFile("root", "a/b.jar"), false, "兩個基底分開");
});

test("readJson：parse 得過 ⇒ ok；不存在、壞掉、是資料夾 ⇒ ok:false", async (t) => {
  const h = await setup(t);
  await h.put("gameDir", "v/good.json", '{"id":"x"}');
  await h.put("gameDir", "v/bad.json", "{ nope");
  await h.put("gameDir", "v/dir.json", null);
  assert.deepEqual(await h.probe.readJson("gameDir", "v/good.json"), {
    ok: true,
    value: { id: "x" },
  });
  for (const rel of ["v/missing.json", "v/bad.json", "v/dir.json"]) {
    assert.deepEqual(
      await h.probe.readJson("gameDir", rel),
      { ok: false },
      rel,
    );
  }
});

test("其他讀檔錯照丟（帶 syscall，由中樞歸成 local-unreadable）", async () => {
  const eperm = (syscall) =>
    Object.assign(new Error("EPERM"), { code: "EPERM", syscall });
  const probe = makeRuntimeProbe(
    { gameDir: "G", root: "R" },
    {
      fsp: {
        lstat: async () => {
          throw eperm("lstat");
        },
        readFile: async () => {
          throw eperm("open");
        },
      },
    },
  );
  await assert.rejects(
    probe.isFile("gameDir", "a"),
    (e) => e.code === "EPERM" && e.syscall === "lstat",
  );
  await assert.rejects(
    probe.readJson("root", "a"),
    (e) => e.code === "EPERM" && e.syscall === "open",
  );
});
