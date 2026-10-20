"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("events");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createGglLog } = require("../lib/ggl-structured-log");
const { attachRendererFailureLog } = require("../main/renderer-failure-log.js");

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "renderer-fail-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  const filePath = path.join(dir, "ggl-launcher.log");
  const { gglError } = createGglLog({
    getFilePath: () => filePath,
    homedir: os.homedir(),
    maxBytes: 1024 * 1024,
  });
  const wc = new EventEmitter();
  attachRendererFailureLog(wc, gglError);
  const raw = () =>
    fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const records = () =>
    raw()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l.replace(/^\[[^\]]+\] \[GGL\] /, "")));
  return { wc, raw, records };
}

test("L14: preload-error ⇒ preload_error without the preload path", (t) => {
  const s = setup(t);
  const preloadPath = "C:\\Somewhere\\GGL Launcher\\preload.js";
  s.wc.emit(
    "preload-error",
    {},
    preloadPath,
    new Error(`Cannot find module '${preloadPath}'`),
  );
  const recs = s.records();
  assert.equal(recs.length, 1);
  assert.equal(recs[0].s, "main");
  assert.equal(recs[0].e, "preload_error");
  assert.deepEqual(recs[0].d, {});
  assert.equal(recs[0].err.name, "Error");
  assert.ok(!s.raw().includes("Somewhere"));
});

test("L14: render-process-gone ⇒ crashed logged, clean-exit not", (t) => {
  const s = setup(t);
  s.wc.emit("render-process-gone", {}, { reason: "clean-exit", exitCode: 0 });
  s.wc.emit("render-process-gone", {}, { reason: "crashed", exitCode: 2 });
  const recs = s.records();
  assert.equal(recs.length, 1);
  assert.deepEqual(recs[0], {
    v: 1,
    s: "main",
    e: "render_process_gone",
    d: { reason: "crashed", exitCode: 2 },
  });
});
