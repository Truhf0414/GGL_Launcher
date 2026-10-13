"use strict";

// → _notes/plans/instance-sync-v3-commit4b.md T8

const test = require("node:test");
const assert = require("node:assert/strict");

const { checkVanillaJson, checkFabricJson } = require("../lib/runtime-json.js");
const fixtures = require("./helpers/runtime-fixtures.cjs");

const MC = "1.21.11";
const LAUNCH_ID = "fabric-loader-0.19.3-1.21.11";
const fabricCtx = { minecraft: MC, launchId: LAUNCH_ID };

test("T8 兩支 fixture 各自 ok", () => {
  assert.deepEqual(checkVanillaJson(fixtures.vanilla(), MC), { ok: true });
  assert.deepEqual(checkFabricJson(fixtures.fabric(), fabricCtx), { ok: true });
});

const sha1Of39 = "a".repeat(39);

const vanillaBreakers = {
  "id 不等": (j) => {
    j.id = "1.21.10";
  },
  "少 javaVersion.component": (j) => {
    delete j.javaVersion.component;
  },
  "majorVersion 為 0": (j) => {
    j.javaVersion.majorVersion = 0;
  },
  'majorVersion 為 "21"': (j) => {
    j.javaVersion.majorVersion = "21";
  },
  "client sha1 39 位": (j) => {
    j.downloads.client.sha1 = sha1Of39;
  },
  "client size 為 -1": (j) => {
    j.downloads.client.size = -1;
  },
  "client url 不是 http(s)": (j) => {
    j.downloads.client.url = "file:///C:/x.jar";
  },
  "assetIndex.id 為 ../29": (j) => {
    j.assetIndex.id = "../29";
  },
  "assetIndex sha1 39 位": (j) => {
    j.assetIndex.sha1 = sha1Of39;
  },
  "libraries 不是陣列": (j) => {
    j.libraries = {};
  },
  "某支 library 只有 classifiers": (j) => {
    j.libraries[0].downloads = {
      classifiers: { "natives-windows": j.libraries[0].downloads.artifact },
    };
  },
  "某支 library 同時有 artifact 與 classifiers（E1）": (j) => {
    j.libraries[0].downloads.classifiers = {
      "natives-windows": j.libraries[0].downloads.artifact,
    };
  },
  "某支 library 的 sha1 不是 40 位 hex": (j) => {
    j.libraries[0].downloads.artifact.sha1 = "z".repeat(40);
  },
};

for (const [name, breakIt] of Object.entries(vanillaBreakers)) {
  test(`T8 原版反例：${name} ⇒ ok: false`, () => {
    const j = fixtures.vanilla();
    breakIt(j);
    const r = checkVanillaJson(j, MC);
    assert.equal(r.ok, false);
    assert.equal(typeof r.error, "string");
  });
}

test("T8 原版：不是物件 ⇒ ok: false、不丟例外", () => {
  for (const bad of [null, [], "x", 1]) {
    assert.equal(checkVanillaJson(bad, MC).ok, false);
  }
});

const fabricBreakers = {
  "mainClass 不在": (j) => {
    delete j.mainClass;
  },
  'mainClass 為 ""': (j) => {
    j.mainClass = "";
  },
  "id 不等於 launchId": (j) => {
    j.id = "fabric-loader-0.19.2-1.21.11";
  },
  "inheritsFrom 不等": (j) => {
    j.inheritsFrom = "1.21.10";
  },
  "某支 library 帶 classifiers": (j) => {
    j.libraries[0].downloads = { classifiers: {} };
  },
  "某支兩段 name": (j) => {
    j.libraries[0].name = "net.fabricmc:intermediary";
  },
  "某支 sha1 不是空字串也不是 40 位 hex": (j) => {
    j.libraries[0].sha1 = sha1Of39;
  },
};

for (const [name, breakIt] of Object.entries(fabricBreakers)) {
  test(`T8 Fabric 反例：${name} ⇒ ok: false`, () => {
    const j = fixtures.fabric();
    breakIt(j);
    const r = checkFabricJson(j, fabricCtx);
    assert.equal(r.ok, false);
    assert.equal(typeof r.error, "string");
  });
}

test("T8 Fabric：不是物件 ⇒ ok: false、不丟例外", () => {
  for (const bad of [null, [], "x", 1]) {
    assert.equal(checkFabricJson(bad, fabricCtx).ok, false);
  }
});

// → _notes/plans/instance-sync-v3-commit5b.md K1、K2：啟動資料在更新時就驗（checkLaunchSpec）
const launchSpecBreakers = {
  vanilla: {
    'logging.client.type 為 "log4j2-json"': (j) => {
      j.logging.client.type = "log4j2-json";
    },
    "jvm 參數多一個 ${foo}": (j) => {
      j.arguments.jvm.push("${foo}");
    },
    'library 的 rule action 為 "maybe"': (j) => {
      j.libraries.find((l) => l.rules).rules[0].action = "maybe";
    },
  },
  fabric: {
    "jvm 參數項是 5": (j) => {
      j.arguments.jvm.push(5);
    },
  },
};

for (const [name, breakIt] of Object.entries(launchSpecBreakers.vanilla)) {
  test(`K1 原版啟動資料：${name} ⇒ ok: false、error 以「啟動資料：」開頭`, () => {
    const j = fixtures.vanilla();
    breakIt(j);
    const r = checkVanillaJson(j, MC);
    assert.equal(r.ok, false);
    assert.match(r.error, /^啟動資料：/);
  });
}

for (const [name, breakIt] of Object.entries(launchSpecBreakers.fabric)) {
  test(`K2 Fabric 啟動資料：${name} ⇒ ok: false、error 以「啟動資料：」開頭`, () => {
    const j = fixtures.fabric();
    breakIt(j);
    const r = checkFabricJson(j, fabricCtx);
    assert.equal(r.ok, false);
    assert.match(r.error, /^啟動資料：/);
  });
}
