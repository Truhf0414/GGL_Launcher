"use strict";

// 兩支畫面檢查腳本不准無聲跳過（G1、G3）：在暫存目錄放真 index.html／styles.css 的副本、只施加一個突變，用子行程照正式指令跑。
// → _notes/plans/cross-review-2026-10-phase6a.md §驗收 A1–A7
// C2（var() 都要有定義）、L1（@layer 契約）→ _notes/plans/css-2026-10.md §六-4

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

// 腳本用 process.cwd() 找檔
function run(script, cwd, ...args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd,
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

// 突變錨點都在 utilities 層與檔頭——後續樣式修改不會碰到的地方
const HIDDEN_RULE = "  .hidden {\n    display: none;\n  }\n";
const UTILITIES_BLOCK = `@layer utilities {\n${HIDDEN_RULE}}`;
const COMPONENTS_END = `\n}\n\n${UTILITIES_BLOCK}`;

function runCss(t, css, html = REAL_HTML) {
  const dir = fixtureDir(t, { "index.html": html, "styles.css": css });
  return run(UI_CSS, dir);
}

for (const [label, value, code] of [
  ["var(--nope, 1px)：沒定義、有 fallback ⇒ exit 1", "var(--nope, 1px)", 1],
  ["var(--nope)：沒定義、沒 fallback ⇒ exit 1", "var(--nope)", 1],
  [
    "var(--design-radius, 1px)：有定義、有 fallback ⇒ exit 0",
    "var(--design-radius, 1px)",
    0,
  ],
]) {
  test(`C2 check-ui-css：${label}`, (t) => {
    const css = mutate(
      REAL_CSS,
      HIDDEN_RULE,
      `  .hidden {\n    display: none;\n    width: ${value};\n  }\n`,
    );
    const r = runCss(t, css);
    assert.equal(r.code, code, r.out);
    if (code === 1) {
      assert.match(r.out, /"--nope" but it is not defined/);
      assert.match(r.out, /default in :root/);
    }
  });
}

test("L1 check-ui-css：多一份樣式表 <link> ⇒ exit 1", (t) => {
  const html = mutate(
    REAL_HTML,
    '<link rel="stylesheet" href="./styles.css" />',
    '<link rel="stylesheet" href="./styles.css" />\n    <link rel="stylesheet" href="./extra.css" />',
  );
  const r = runCss(t, REAL_CSS, html);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /exactly one stylesheet <link>.*found 2/);
});

test("L1 check-ui-css：唯一的 <link> 連到別的檔 ⇒ exit 1", (t) => {
  const html = mutate(REAL_HTML, 'href="./styles.css"', 'href="./other.css"');
  const r = runCss(t, REAL_CSS, html);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /exactly one stylesheet <link>.*found 1/);
});

test("L1 check-ui-css：層的順序反過來 ⇒ exit 1", (t) => {
  const css = mutate(
    REAL_CSS,
    "@layer components, utilities;",
    "@layer utilities, components;",
  );
  const r = runCss(t, css);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /first rule must be "@layer components, utilities;"/);
});

test("L1 check-ui-css：層外寫一條規則 ⇒ exit 1", (t) => {
  const r = runCss(t, `${REAL_CSS}\n.launch-btn {\n  display: flex;\n}\n`);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /"\.launch-btn" is outside any @layer/);
});

test("L1 check-ui-css：多一個層 ⇒ exit 1", (t) => {
  const r = runCss(
    t,
    `${REAL_CSS}\n@layer extras {\n  .launch-btn {\n    display: flex;\n  }\n}\n`,
  );
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /unknown layer "extras"/);
});

test("L1 check-ui-css：components 層裡再定義一次 .hidden ⇒ exit 1", (t) => {
  const css = mutate(
    REAL_CSS,
    COMPONENTS_END,
    `\n  .notif-panel.hidden {\n    display: none;\n  }${COMPONENTS_END}`,
  );
  const r = runCss(t, css);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /"\.hidden" must be defined once, in @layer utilities/);
});

test("L1 check-ui-css：utilities 層裡定義兩次 .hidden ⇒ exit 1", (t) => {
  const css = mutate(
    REAL_CSS,
    UTILITIES_BLOCK,
    `@layer utilities {\n${HIDDEN_RULE}${HIDDEN_RULE}}`,
  );
  const r = runCss(t, css);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /"\.hidden" must be defined once, in @layer utilities/);
});

test("L1 check-ui-css：.hidden 搬到 components 層 ⇒ exit 1", (t) => {
  const css = mutate(
    REAL_CSS,
    COMPONENTS_END,
    `\n${HIDDEN_RULE}}\n\n@layer utilities {\n}`,
  );
  const r = runCss(t, css);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /"\.hidden" must be defined once, in @layer utilities/);
});
