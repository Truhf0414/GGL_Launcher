"use strict";

// → _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」、§測試 C1（SPR R#14、R#23）
// ⑤b：K5、K8 → _notes/plans/instance-sync-v3-commit5b.md
const test = require("node:test");
const assert = require("node:assert/strict");

const { checkRuntimeReady } = require("../lib/runtime-readiness.js");
const { runtimeNeeds } = require("../lib/runtime-needs.js");
const fx = require("./helpers/runtime-fixtures.cjs");

const LAUNCH_ID = "fabric-loader-0.19.3-1.21.11";
const JAVA_REL = "runtime/java-21/bin/java.exe";
const ABSENT = Symbol("檔不存在");
const LOG_REL = "assets/log_configs/client-1.21.2.xml";
const ENV = Object.freeze({
  os: { name: "windows", arch: "x86_64", version: "10.0.26200" },
  features: {},
});

const record = (over = {}) => ({
  format: 3,
  version: "v1",
  appliedAt: "2026-10-11T00:00:00+08:00",
  files: [],
  minecraft: "1.21.11",
  loader: { type: "fabric", version: "0.19.3" },
  javaMajor: 21,
  ...over,
});

/** 裝好的樣子：兩份 json、runtimeNeeds 列的每個檔、java.exe；用參數拿掉或換掉其中幾個 */
function installed({
  target = fx.fabric(),
  vanilla = fx.vanilla(),
  drop = [],
  dirs = [],
} = {}) {
  const json = new Map([
    [`gameDir:versions/${LAUNCH_ID}/${LAUNCH_ID}.json`, target],
    ["gameDir:versions/1.21.11/1.21.11.json", vanilla],
  ]);
  const files = new Set([`root:${JAVA_REL}`]);
  const ok = (value) => ({ ok: true, value });
  for (const f of runtimeNeeds({
    record: record(),
    target: ok(fx.fabric()),
    vanilla: ok(fx.vanilla()),
    env: ENV,
  }).files) {
    files.add(`gameDir:${f.rel}`);
  }
  for (const k of drop) files.delete(k);
  const calls = [];
  return {
    calls,
    probe: {
      readJson: async (base, rel) => {
        calls.push(["readJson", base, rel]);
        const k = `${base}:${rel}`;
        return json.get(k) === ABSENT
          ? { ok: false }
          : { ok: true, value: json.get(k) };
      },
      isFile: async (base, rel) => {
        calls.push(["isFile", base, rel]);
        const k = `${base}:${rel}`;
        return files.has(k) && !dirs.includes(k);
      },
    },
  };
}

const check = (rec, inst) =>
  checkRuntimeReady({ record: rec, probe: inst.probe, env: ENV });
/** 就緒：ready／missing 之外帶著成品（⑤c P2′）；成品內容由 N1、N2 驗 */
const assertReady = (r) => {
  assert.deepEqual(
    { ready: r.ready, missing: r.missing },
    { ready: true, missing: [] },
  );
  assert.equal(typeof r.launch, "object");
};

test("C1 全部在 ⇒ ready；java 問的是 root 底下那支", async () => {
  const inst = installed();
  assertReady(await check(record(), inst));
  assert.ok(
    inst.calls.some(
      ([fn, base, rel]) =>
        fn === "isFile" && base === "root" && rel === JAVA_REL,
    ),
  );
});

// U5：不完整的四種在讀檔邊界就讀成 null，就緒只會收到 null（→ _notes/plans/cross-review-2026-10-phase6c.md U5）
test("C1 沒有記錄 ⇒ 只有 record、不丟錯、probe 一支都沒被呼叫", async () => {
  const throwing = {
    readJson: async () => {
      throw new Error("readJson 不該被呼叫");
    },
    isFile: async () => {
      throw new Error("isFile 不該被呼叫");
    },
  };
  assert.deepEqual(
    await checkRuntimeReady({ record: null, probe: throwing, env: ENV }),
    { ready: false, missing: ["record"] },
  );
});

test("C1 每一個缺項各一案 ⇒ missing 指出那一項", async () => {
  const anyLib = `gameDir:libraries/${fx.vanillaWindowsArtifactPaths(fx.vanilla())[0]}`;
  const cases = [
    [{ target: ABSENT }, ["version-json"]],
    [{ vanilla: ABSENT }, ["vanilla-json"]],
    [{ drop: ["gameDir:versions/1.21.11/1.21.11.jar"] }, ["version-jar"]],
    [{ drop: [anyLib] }, ["library"]],
    [{ drop: ["gameDir:assets/indexes/29.json"] }, ["asset-index"]],
    [{ drop: [`gameDir:${LOG_REL}`] }, ["log-config"]],
    [{ drop: [`root:${JAVA_REL}`] }, ["java"]],
  ];
  for (const [opt, missing] of cases) {
    assert.deepEqual(
      await check(record(), installed(opt)),
      { ready: false, missing },
      JSON.stringify(opt),
    );
  }
});

test("C1 缺兩支 library ⇒ library 只列一次", async () => {
  const [a, b] = fx.vanillaWindowsArtifactPaths(fx.vanilla());
  const r = await check(
    record(),
    installed({ drop: [`gameDir:libraries/${a}`, `gameDir:libraries/${b}`] }),
  );
  assert.deepEqual(r, { ready: false, missing: ["library"] });
});

test("C1 osx／linux-only library 本機沒有 ⇒ 仍就緒（installed 本來就只放 windows 那些）", async () => {
  const osx = fx
    .vanilla()
    .libraries.filter((l) => l.rules?.some((x) => x.os?.name === "osx"));
  assert.ok(osx.length > 0);
  assertReady(await check(record(), installed()));
});

test("C1 Fabric 以 name 推的路徑缺一支 ⇒ library", async () => {
  const fabricRels = fx
    .fabric()
    .libraries.map(
      (l) => `gameDir:libraries/${fx.installerLibraryPath(l.name)}`,
    );
  const r = await check(record(), installed({ drop: [fabricRels[0]] }));
  assert.deepEqual(r, { ready: false, missing: ["library"] });
});

test("C1 目標 json inheritsFrom 不是記錄的、少 mainClass ⇒ version-json", async () => {
  const { mainClass, ...noMain } = fx.fabric();
  void mainClass;
  for (const target of [{ ...fx.fabric(), inheritsFrom: "1.21.10" }, noMain]) {
    assert.deepEqual(await check(record(), installed({ target })), {
      ready: false,
      missing: ["version-json"],
    });
  }
});

test("C1 版本 jar 的位置是資料夾 ⇒ 不算存在", async () => {
  const k = "gameDir:versions/1.21.11/1.21.11.jar";
  assert.deepEqual(await check(record(), installed({ dirs: [k] })), {
    ready: false,
    missing: ["version-jar"],
  });
});

test("checkRuntimeReady：輸入沒有 release（多帶鍵 ⇒ TypeError）", async () => {
  await assert.rejects(
    checkRuntimeReady({ record: null, probe: installed().probe, release: {} }),
    TypeError,
  );
});

test("K5 log4j 設定檔的位置是資料夾 ⇒ log-config", async () => {
  assert.deepEqual(
    await check(record(), installed({ dirs: [`gameDir:${LOG_REL}`] })),
    {
      ready: false,
      missing: ["log-config"],
    },
  );
});

test("K8 checkRuntimeReady 沒給 env ⇒ TypeError：記錄是 null（一個檔都不碰就 return 的路）也一樣", async () => {
  for (const rec of [record(), null]) {
    await assert.rejects(
      checkRuntimeReady({ record: rec, probe: installed().probe }),
      TypeError,
    );
  }
});

// → _notes/plans/instance-sync-v3-commit5c.md N2（P2′：就緒交出成品）
test("N2 就緒 ⇒ 帶 launch（runtimeNeeds 那份、env 原物件）；不就緒 ⇒ 整包只有 ready／missing", async () => {
  const r = await check(record(), installed());
  assertReady(r);
  assert.equal(r.launch.merged.id, LAUNCH_ID);
  assert.equal(r.launch.env, ENV);
  assert.deepEqual(
    await check(record(), installed({ drop: [`gameDir:${LOG_REL}`] })),
    {
      ready: false,
      missing: ["log-config"],
    },
  );
});
