"use strict";

// 兩支畫面檢查腳本不准無聲跳過（G1、G3）：在暫存目錄放真 index.html／styles.css 的副本、只施加一個突變，用子行程照正式指令跑。
// → _notes/plans/cross-review-2026-10-phase6a.md §驗收 A1–A7

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const RENDERER_SCRIPTS = path.join(
  REPO,
  "scripts",
  "check-renderer-scripts.cjs",
);
const UI_CSS = path.join(REPO, "scripts", "check-ui-css.cjs");
const REAL_HTML = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const REAL_CSS = fs.readFileSync(path.join(REPO, "styles.css"), "utf8");

// 突變必須剛好命中一次：沒命中就讓測試自己爆，不讓紅燈來自別的原因、也不讓綠燈來自沒改到
function mutate(text, from, to) {
  const parts = text.split(from);
  assert.equal(parts.length, 2, `fixture 突變要剛好命中一次：${from}`);
  return parts.join(to);
}

function fixtureDir(t, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-ui-check-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), text);
  }
  return dir;
}

// 腳本用 process.cwd() 找檔；UI_CSS_STRICT 從環境拿掉，一般模式才是真的一般模式
function run(script, cwd, ...args) {
  const env = { ...process.env };
  delete env.UI_CSS_STRICT;
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd,
    env,
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

const NO_RENDERER_JS = mutate(
  REAL_HTML,
  '    <script src="./renderer.js"></script>\n',
  "",
);

test("A1 check-renderer-scripts：index.html 沒有 ./renderer.js ⇒ exit 1", (t) => {
  const dir = fixtureDir(t, { "index.html": NO_RENDERER_JS });
  const r = run(RENDERER_SCRIPTS, dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\.\/renderer\.js/);
});

test("A2 check-renderer-scripts：載入順序錯 ⇒ exit 1", (t) => {
  const swapped = mutate(
    REAL_HTML,
    '<script src="./renderer/bootstrap-ctx.js"></script>\n    <script src="./renderer/bootstrap.js"></script>',
    '<script src="./renderer/bootstrap.js"></script>\n    <script src="./renderer/bootstrap-ctx.js"></script>',
  );
  const dir = fixtureDir(t, { "index.html": swapped });
  const r = run(RENDERER_SCRIPTS, dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /order mismatch/);
});

test("A3 check-renderer-scripts：真的 repo ⇒ exit 0", () => {
  const r = run(RENDERER_SCRIPTS, REPO);
  assert.equal(r.code, 0, r.out);
});

for (const id of ["settingsModal", "notifOverlay"]) {
  for (const args of [[], ["--strict"]]) {
    test(`A4 check-ui-css ${args.join(" ") || "（一般）"}：index.html 沒有 ${id} ⇒ exit 1`, (t) => {
      const renamed = mutate(REAL_HTML, `id="${id}"`, `id="${id}Renamed"`);
      const dir = fixtureDir(t, {
        "index.html": renamed,
        "styles.css": REAL_CSS,
      });
      const r = run(UI_CSS, dir, ...args);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, new RegExp(`id="${id}"`));
    });
  }
}

test("A5 check-ui-css：讀不到 index.html ⇒ exit 1", (t) => {
  const dir = fixtureDir(t, { "styles.css": REAL_CSS });
  const r = run(UI_CSS, dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /index\.html/);
});

test("A6 check-ui-css：id 在、沒有 no-drag ⇒ 一般模式警告 exit 0；--strict exit 1", (t) => {
  const noDrag = mutate(
    REAL_HTML,
    'id="settingsModal"\n      class="modal hidden no-drag"',
    'id="settingsModal"\n      class="modal hidden"',
  );
  const dir = fixtureDir(t, { "index.html": noDrag, "styles.css": REAL_CSS });
  const msg = /id="settingsModal" to include class "no-drag"/;

  const normal = run(UI_CSS, dir);
  assert.equal(normal.code, 0, normal.out);
  assert.match(normal.out, /\[ui-css-check\] warnings:/);
  assert.match(normal.out, msg);

  const strict = run(UI_CSS, dir, "--strict");
  assert.equal(strict.code, 1, strict.out);
  assert.match(strict.out, msg);
});

test("A7 check-ui-css：真的 repo ⇒ 一般與 --strict 都 exit 0", () => {
  for (const args of [[], ["--strict"]]) {
    const r = run(UI_CSS, REPO, ...args);
    assert.equal(r.code, 0, r.out);
  }
});
