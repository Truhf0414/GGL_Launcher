"use strict";

// 畫面錯誤送進常駐日誌（2b）：畫面只送事件 ID，main 只收清單裡的。
// plan → _notes/plans/cross-review-2026-10-phase2.md §2b 單元（P1–P3）

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createGglLog } = require("../lib/ggl-structured-log");
const { registerLogIpc } = require("../main/ipc/log-ipc.js");

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "log-ipc-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  const filePath = path.join(dir, "ggl-launcher.log");
  const { gglError } = createGglLog({
    getFilePath: () => filePath,
    homedir: os.homedir(),
    maxBytes: 1024 * 1024,
  });
  const handlers = new Map();
  registerLogIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: { gglError },
  });
  const invoke = (...args) =>
    handlers.get("log:rendererError")({ sender: {} }, ...args);
  const raw = () =>
    fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const records = () =>
    raw()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l.replace(/^\[[^\]]+\] \[GGL\] /, "")));
  return { invoke, raw, records };
}

test("P1: 清單裡的 ID ⇒ 一筆 renderer 事件，不帶 err、不帶 d", (t) => {
  const s = setup(t);
  s.invoke("bootstrap_ctx_factory_missing");
  assert.deepEqual(s.records(), [
    { v: 1, s: "renderer", e: "bootstrap_ctx_factory_missing" },
  ]);
});

test("P2: 不在清單的字串、偽裝成 main 的 ID ⇒ renderer_log_rejected，送來的字串不進檔", (t) => {
  const s = setup(t);
  s.invoke("token=FAKE_P2");
  s.invoke("start_main_failed");
  assert.deepEqual(s.records(), [
    { v: 1, s: "main", e: "renderer_log_rejected", d: { type: "string" } },
    { v: 1, s: "main", e: "renderer_log_rejected", d: { type: "string" } },
  ]);
  assert.ok(!s.raw().includes("FAKE"));
  assert.ok(!s.raw().includes("start_main_failed"));
});

test("P3: 不是字串 ⇒ renderer_log_rejected＋typeof，不拋", (t) => {
  const s = setup(t);
  const payloads = [
    [42, "number"],
    [null, "object"],
    [undefined, "undefined"],
    [{ e: "bootstrap_ctx_factory_missing" }, "object"],
    [["bootstrap_ctx_factory_missing"], "object"],
  ];
  for (const [p] of payloads) assert.doesNotThrow(() => s.invoke(p));
  assert.deepEqual(
    s.records(),
    payloads.map(([, type]) => ({
      v: 1,
      s: "main",
      e: "renderer_log_rejected",
      d: { type },
    })),
  );
});
