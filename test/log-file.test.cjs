"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { appendLineSync, rotatedPath } = require("../lib/log-file");

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "log-file-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("rotatedPath: x.log ⇒ x.1.log", () => {
  assert.equal(
    rotatedPath(path.join("a", "ggl-launcher.log")),
    path.join("a", "ggl-launcher.1.log"),
  );
});

test("appendLineSync: creates missing parent dirs", (t) => {
  const p = path.join(tempDir(t), "deep", "er", "x.log");
  appendLineSync(p, "a\n", 1024);
  assert.equal(fs.readFileSync(p, "utf8"), "a\n");
});

test("L10: over the threshold ⇒ rotate before append; main ≤ threshold + one line", (t) => {
  const p = path.join(tempDir(t), "x.log");
  const max = 100;
  const lines = [];
  for (let i = 0; i < 12; i += 1) {
    const line = `line-${String(i).padStart(2, "0")}-${"y".repeat(20)}\n`;
    const before = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
    appendLineSync(p, line, max);
    lines.push(line);
    assert.ok(fs.statSync(p).size <= max + line.length);
    if (Buffer.byteLength(before) > max) {
      assert.equal(fs.readFileSync(rotatedPath(p), "utf8"), before);
      assert.equal(fs.readFileSync(p, "utf8"), line);
    }
  }
  assert.ok(fs.existsSync(rotatedPath(p)), "rotation never happened");
});

test("appendLineSync: rm of the old rotated file fails ⇒ throws, main untouched", (t) => {
  const dir = tempDir(t);
  const p = path.join(dir, "x.log");
  fs.writeFileSync(p, "z".repeat(50));
  fs.mkdirSync(rotatedPath(p));
  assert.throws(() => appendLineSync(p, "new\n", 10));
  assert.equal(fs.readFileSync(p, "utf8"), "z".repeat(50));
});
