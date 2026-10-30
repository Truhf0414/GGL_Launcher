"use strict";

// G-6（Release Gate OD-5）：scripts/check-site.js 發版前檢查——只讀、未知欄位＝Error＝非零結束碼、錯誤指出欄位路徑。
// 只驗工具自己（含它沒有自己的欄位清單、沒寫任何檔）；「清單＝解析函式讀的鍵」在 test/site-format-keys.test.cjs。
// → _notes/plans/release-gate-2026-10.md §5.5

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const { main } = require("../scripts/check-site.js");
const { checkSite } = require("../scripts/lib/check-site.js");

const SCRIPT = path.join(__dirname, "..", "scripts", "check-site.js");

const GOOD = {
  "manifest.json": {
    format: 3,
    gate: "gate.json",
    notice: "notice.json",
    release: "release.json",
    files: "files/",
  },
  "gate.json": {
    maintenance: { enabled: false, message: "維護" },
    minLauncherVersion: "1.0.0",
  },
  "notice.json": {
    notice: {
      title: "t",
      subtitle: "s",
      imageUrl: "https://example.com/a.png",
      logUrl: "https://example.com/c.json",
      log: ["a"],
    },
    notifications: [
      {
        id: "n1",
        title: "t",
        body: "b",
        timeText: "x",
        priority: 1,
        createdAt: "2026-10-08T12:00:00+08:00",
        startsAt: "2026-10-08T12:00:00+08:00",
        expiresAt: "2026-10-08T22:00:00+08:00",
      },
    ],
  },
  "release.json": {
    version: "GGL3.1.02",
    publishedAt: "2026-10-08T12:00:00+08:00",
    minecraft: "1.21.11",
    loader: { type: "fabric", version: "0.19.3" },
    playerEditable: ["config/"],
    files: [{ path: "mods/a.jar", sha256: "a".repeat(64), size: 1 }],
  },
};

/** 站台根：GOOD 的四支檔，edit(files) 可改成壞的；文字值原樣寫入 */
async function makeSite(t, edit = () => {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-check-site-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const files = structuredClone(GOOD);
  edit(files);
  for (const [name, doc] of Object.entries(files)) {
    if (doc === null) continue;
    const text = typeof doc === "string" ? doc : JSON.stringify(doc, null, 2);
    await fsp.writeFile(path.join(root, name), text);
  }
  return root;
}

async function run(root) {
  const out = [];
  const err = [];
  const code = await main([root], {
    print: (s) => out.push(s),
    printError: (s) => err.push(s),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

/** 站台根底下每個檔（含子資料夾）的名稱、內容 sha256、mtime、大小 */
async function snapshot(root) {
  const rows = [];
  for (const name of (await fsp.readdir(root, { recursive: true })).sort()) {
    const abs = path.join(root, name);
    const st = await fsp.stat(abs);
    rows.push([
      name,
      st.isFile()
        ? crypto
            .createHash("sha256")
            .update(await fsp.readFile(abs))
            .digest("hex")
        : "dir",
      st.mtimeMs,
      st.size,
    ]);
  }
  return rows;
}

test("C1 合法的完整站台：沒有問題、結束碼 0", async (t) => {
  const root = await makeSite(t);
  assert.deepEqual(await checkSite(root), []);
  const r = await run(root);
  assert.equal(r.code, 0);
  assert.match(r.out, /通過/);
  assert.equal(r.err, "");
});

test("C2 六種錯字各自：結束碼非零、訊息帶檔名與正確的欄位路徑", async (t) => {
  const cases = [
    [
      "gate.json",
      (f) => {
        f["gate.json"].maintenence = f["gate.json"].maintenance;
        delete f["gate.json"].maintenance;
      },
      "gate.maintenence",
    ],
    [
      "gate.json",
      (f) => {
        f["gate.json"].maintenance.mesage = "x";
        delete f["gate.json"].maintenance.message;
      },
      "gate.maintenance.mesage",
    ],
    [
      "gate.json",
      (f) => {
        f["gate.json"].minLaucherVersion = "1.0.0";
        delete f["gate.json"].minLauncherVersion;
      },
      "gate.minLaucherVersion",
    ],
    [
      "notice.json",
      (f) => {
        f["notice.json"].notcie = f["notice.json"].notice;
        delete f["notice.json"].notice;
      },
      "notice.notcie",
    ],
    [
      "notice.json",
      (f) => {
        f["notice.json"].notice.titel = "x";
        delete f["notice.json"].notice.title;
      },
      "notice.notice.titel",
    ],
    [
      "notice.json",
      (f) => {
        f["notice.json"].notifications[0].bodi = "x";
        delete f["notice.json"].notifications[0].body;
      },
      "notice.notifications[0].bodi",
    ],
  ];
  for (const [file, edit, where] of cases) {
    const root = await makeSite(t, edit);
    const r = await run(root);
    assert.equal(r.code, 1, where);
    assert.ok(
      r.err.split("\n").some((l) => l.startsWith(`${file}: ${where}: `)),
      `${where}\n${r.err}`,
    );
    // 剛好一個問題：錯字沒有連帶別的錯
    assert.equal((await checkSite(root)).length, 1, where);
  }
});

test("C3 manifest 的錯字與既有 validator 的錯誤也報；release.json 的多餘欄位不算錯（由發版工具寫）", async (t) => {
  const typo = await makeSite(t, (f) => {
    f["manifest.json"].fils = f["manifest.json"].files;
  });
  assert.deepEqual(
    (await checkSite(typo)).map((p) => `${p.file}: ${p.message.split(":")[0]}`),
    ["manifest.json: index.fils"],
  );

  const bad = await makeSite(t, (f) => {
    f["gate.json"].maintenance.enabled = "yes";
  });
  const problems = await checkSite(bad);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].file, "gate.json");
  assert.match(problems[0].message, /^gate\.maintenance\.enabled: /);

  const extra = await makeSite(t, (f) => {
    f["release.json"].anythingElse = 1;
  });
  assert.deepEqual(await checkSite(extra), []);
});

test("C4 檔案不存在、JSON 壞掉、檔案是資料夾都報在對應的檔名下，不丟例外", async (t) => {
  const root = await makeSite(t, (f) => {
    f["notice.json"] = null;
    f["gate.json"] = "{ 壞掉";
    f["release.json"] = null;
  });
  await fsp.mkdir(path.join(root, "release.json"));
  const problems = await checkSite(root);
  assert.deepEqual(problems.map((p) => p.file).sort(), [
    "gate.json",
    "notice.json",
    "release.json",
  ]);
  assert.match(
    problems.find((p) => p.file === "notice.json").message,
    /不存在/,
  );
  assert.match(
    problems.find((p) => p.file === "gate.json").message,
    /JSON 解析失敗/,
  );
  assert.match(
    problems.find((p) => p.file === "release.json").message,
    /讀取失敗/,
  );
  assert.equal((await run(root)).code, 1);
});

test("C5 只讀：有問題與沒問題的站台，檢查前後每個檔的 sha256、mtime、大小、檔案清單都相同，沒有新檔", async (t) => {
  for (const edit of [
    () => {},
    (f) => {
      f["gate.json"].maintenence = 1;
      f["notice.json"].notifications[0].bodi = "x";
    },
  ]) {
    const root = await makeSite(t, edit);
    await fsp.mkdir(path.join(root, "files"));
    await fsp.writeFile(path.join(root, "files", "x"), "blob");
    const before = await snapshot(root);
    assert.ok(before.length >= 6, "抽取手段壞了");
    await run(root);
    assert.deepEqual(await snapshot(root), before);
  }
});

test("C6 參數錯誤（零個、兩個、空字串、不認得的旗標）⇒ 結束碼 2、印用法、不碰檔案系統", async () => {
  for (const argv of [[], ["a", "b"], [""], ["--fix", "x"]]) {
    const err = [];
    const code = await main(argv, {
      print: () => {},
      printError: (s) => err.push(s),
    });
    assert.equal(code, 2, JSON.stringify(argv));
    assert.match(err.join("\n"), /用法/);
  }
});

test("C7 真的跑 CLI 行程：有問題 ⇒ 行程結束碼 1 並在 stderr 列路徑；通過 ⇒ 0", async (t) => {
  const bad = await makeSite(t, (f) => {
    f["gate.json"].minLaucherVersion = "1.0.0";
  });
  const r = spawnSync(process.execPath, [SCRIPT, bad], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /gate\.json: gate\.minLaucherVersion: /);
  const ok = spawnSync(process.execPath, [SCRIPT, await makeSite(t)], {
    encoding: "utf8",
  });
  assert.equal(ok.status, 0);
});

test("C8 工具沒有自己的欄位清單：欄位名只出現在 lib/sync/site-format.js", () => {
  for (const f of ["scripts/check-site.js", "scripts/lib/check-site.js"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    for (const key of [
      "minLauncherVersion",
      "timeText",
      "imageUrl",
      "expiresAt",
    ]) {
      assert.ok(!src.includes(key), `${f} 出現 ${key}`);
    }
    assert.match(
      src,
      /require\("(\.\.\/)*\.\.\/lib\/sync\/site-format\.js"\)|require\("\.\/lib\/check-site\.js"\)/,
    );
  }
  const lib = fs.readFileSync(
    path.join(__dirname, "..", "scripts/lib/check-site.js"),
    "utf8",
  );
  assert.ok(
    !/writeFile|rename|unlink|rm\(|mkdir|appendFile|copyFile|truncate/.test(
      lib,
    ),
  );
});
