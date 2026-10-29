// 只開三條規則：用到沒定義的變數（多半是打錯字）、宣告了沒人用的東西、空的區塊（catch 要寫為什麼可以吞）。
const globals = require("globals");

// index.html 用 <script> 載入的畫面檔，只有瀏覽器環境
const RENDERER_FILES = ["renderer.js", "renderer/**/*.js"];

module.exports = [
  {
    // .claude/ 底下是殘留的 worktree，不是本 repo 的程式
    ignores: ["dist/**", "assets/**", ".claude/**"],
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "no-undef": "error",
      "no-empty": "error",
      // 放行兩種刻意寫法：`catch (err)` 不用 err；`const { x, ...rest } = o` 拆掉 x 只要 rest
      "no-unused-vars": [
        "error",
        { caughtErrors: "none", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // rpc-helper 的空 catch 等 Discord RPC 去留裁定後再清（cross-review U10）；改它要重 build exe
    files: ["rpc-helper/**"],
    rules: { "no-empty": "off" },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    ignores: RENDERER_FILES,
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
  {
    files: RENDERER_FILES,
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser },
    },
  },
  {
    // preload 同時碰得到 Node 與 window
    files: ["preload.js"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
];
