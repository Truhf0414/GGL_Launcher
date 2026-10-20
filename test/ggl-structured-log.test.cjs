"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createGglLog } = require("../lib/ggl-structured-log");
const samples = require("./fixtures/ggl-log-errors.js");

const LINE_RE =
  /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[GGL\] (.*)$/;
const WRITE_FAILED = "[GGL] log file write failed";

// 暫存資料夾＋替身 console；檔裡的每一行拆回 JSON
function setup(t, { homedir = os.homedir(), maxBytes = 1024 * 1024 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-log-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, "ggl-launcher.log");
  const out = t.mock.method(console, "log", () => {});
  const errOut = t.mock.method(console, "error", () => {});
  const log = createGglLog({
    getFilePath: () => filePath,
    homedir,
    maxBytes,
  });
  const raw = () =>
    fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const records = () =>
    raw()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const m = LINE_RE.exec(line);
        assert.ok(m, `bad line: ${line}`);
        return JSON.parse(m[1]);
      });
  return { dir, filePath, log, raw, records, out, errOut };
}

function lastConsoleJson(spy) {
  const args = spy.mock.calls.at(-1).arguments;
  assert.equal(args[0], "[GGL]");
  return JSON.parse(args[1]);
}

test("createGglLog: missing deps throw at creation", () => {
  const ok = {
    getFilePath: () => "x.log",
    homedir: "C:\\Users\\a",
    maxBytes: 1,
  };
  assert.throws(() => createGglLog({ ...ok, getFilePath: undefined }));
  assert.throws(() => createGglLog({ ...ok, homedir: "" }));
  assert.throws(() => createGglLog({ ...ok, maxBytes: 0 }));
});

test("L1: gglEvent writes one prefixed JSON line without any debug setting", (t) => {
  const s = setup(t);
  s.log.gglEvent("main", "start_main_begin", { node: "v1" });
  const lines = s.raw().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  assert.match(lines[0], LINE_RE);
  assert.deepEqual(s.records()[0], {
    v: 1,
    s: "main",
    e: "start_main_begin",
    d: { node: "v1" },
  });
  assert.deepEqual(lastConsoleJson(s.out), {
    v: 1,
    s: "main",
    e: "start_main_begin",
    d: { node: "v1" },
  });
});

test("L2: TypeError ⇒ name kept, st relative and ≤4; console line unchanged", (t) => {
  const s = setup(t);
  const err = samples.typeError();
  s.log.gglError("main", "boom", err, {});
  const rec = s.records()[0];
  assert.deepEqual(rec.err, { name: "TypeError" });
  assert.ok(Array.isArray(rec.st) && rec.st.length >= 1 && rec.st.length <= 4);
  assert.match(rec.st[0], /^test\/fixtures\/ggl-log-errors\.js:\d+:\d+$/);
  for (const f of rec.st) assert.match(f, /^[A-Za-z0-9_./-]+\.js:\d+:\d+$/);
  assert.ok(!("message" in rec.err));
  const c = lastConsoleJson(s.errOut);
  assert.equal(c.err, err.message);
  assert.equal(
    c.st,
    String(err.stack)
      .split("\n")
      .slice(0, 4)
      .map((l) => l.trim())
      .join(" | "),
  );
});

test("L3: multi-line message and rewritten stack leak nothing", (t) => {
  const s = setup(t);
  s.log.gglError("main", "a2", samples.multiLineMessage(), {});
  s.log.gglError("main", "a3", samples.rewrittenStack(), {});
  assert.ok(!s.raw().includes("FAKE_"));
  const [a2, a3] = s.records();
  assert.ok(a2.st.length >= 1);
  for (const f of a2.st)
    assert.match(f, /^test\/fixtures\/ggl-log-errors\.js:/);
  assert.ok(!("st" in a3));
});

test("L3b: anonymous async frames are kept as relative locations", async (t) => {
  const s = setup(t);
  const err = await samples.anonymousAsync();
  const fixtureFrames = err.stack
    .split("\n")
    .filter((l) => l.includes("ggl-log-errors.js"));
  // 對照：真的有「at async <路徑>:行:欄」這種 frame，否則這個測試沒測到東西
  assert.ok(fixtureFrames.some((l) => /^\s*at async [A-Za-z]:\\/.test(l)));
  s.log.gglError("main", "anon", err, {});
  const rec = s.records()[0];
  assert.equal(rec.st.length, fixtureFrames.length);
  for (const f of rec.st) {
    assert.match(f, /^test\/fixtures\/ggl-log-errors\.js:\d+:\d+$/);
  }
  assert.ok(!s.raw().includes("FAKE"));
});

test("L3c: forged async-looking lines leak nothing", (t) => {
  const s = setup(t);
  const { inMessage, rewritten } = samples.forgedAsyncFrames();
  s.log.gglError("main", "am", inMessage, {});
  s.log.gglError("main", "as", rewritten, {});
  assert.ok(!s.raw().includes("FAKE"));
  assert.ok(!s.raw().includes("evil"));
  const [am, as] = s.records();
  for (const f of am.st)
    assert.match(f, /^test\/fixtures\/ggl-log-errors\.js:/);
  assert.ok(!("st" in as));
});

test("L4: non-errno codes (incl. any GGL_ code) are never written", (t) => {
  const s = setup(t);
  s.log.gglError("main", "a4", samples.withCode("FAKE_SECRET_TOKEN", "x"), {});
  s.log.gglError(
    "main",
    "owner",
    samples.withCode("GGL_TOKEN_FAKE_SECRET", "x"),
    {},
  );
  s.log.gglError(
    "main",
    "a5",
    samples.withCode(
      "GGL_SYNC_BLOCKED_BY_LINK",
      "C:\\Users\\someone\\game\\mods token=FAKE_A5",
    ),
    {},
  );
  for (const rec of s.records()) assert.deepEqual(rec.err, { name: "Error" });
  assert.ok(!s.raw().includes("FAKE"));
  assert.ok(!s.raw().includes("GGL_"));
  assert.ok(!s.raw().includes("someone"));
});

test("L5: fs errors keep code/syscall, never the path", async (t) => {
  const s = setup(t);
  const missing = path.join(s.dir, "nope-B-zz9");
  const b1 = samples.readMissingSync(missing);
  const b6 = await samples.mkdirMissingAsync(path.join(missing, "deeper"));
  // Electron 內建的 Node（24.20.0）給 B6 的 stack 只有開頭那行；系統 Node 24.14.1 會多 async frame。
  // 「沒有 frame」用固定形狀測，不綁跑測試的 Node 版本
  const noFrames = Object.assign(new Error(b6.message), {
    code: "ENOENT",
    syscall: "mkdir",
  });
  noFrames.stack = String(noFrames);
  s.log.gglError("main", "b1", b1, {});
  s.log.gglError("main", "b6", b6, {});
  s.log.gglError("main", "b6-electron", noFrames, {});
  const [r1, r6, r6e] = s.records();
  assert.deepEqual(r1.err, { name: "Error", code: "ENOENT", syscall: "open" });
  assert.match(r1.st[0], /^test\/fixtures\/ggl-log-errors\.js:/);
  assert.deepEqual(r6.err, { name: "Error", code: "ENOENT", syscall: "mkdir" });
  for (const f of r6.st ?? []) assert.match(f, /^test\/fixtures\//);
  assert.deepEqual(r6e.err, {
    name: "Error",
    code: "ENOENT",
    syscall: "mkdir",
  });
  assert.ok(!("st" in r6e));
  assert.ok(!s.raw().includes("nope-B-zz9"));
});

test("L6: network error message (URL with token) never written", (t) => {
  const s = setup(t);
  s.log.gglError("main", "c1", samples.netError(), {});
  assert.ok(!s.raw().includes("FAKE"));
  assert.ok(!s.raw().includes("http"));
  assert.ok(!s.raw().includes("ggl.example"));
});

test("L7: non-Error values ⇒ only type", (t) => {
  const s = setup(t);
  s.log.gglError("main", "e1", "token=FAKE_E1", {});
  s.log.gglError("main", "e2", { message: "token=FAKE_E2" }, {});
  s.log.gglError("main", "e3", null, {});
  assert.deepEqual(
    s.records().map((r) => r.err),
    [{ type: "string" }, { type: "object" }, { type: "null" }],
  );
  assert.ok(!s.raw().includes("FAKE"));
});

test("L8: name outside the allowlist ⇒ OtherError", (t) => {
  const s = setup(t);
  const err = new Error("x");
  err.name = "token=FAKE";
  s.log.gglError("main", "l8", err, {});
  assert.equal(s.records()[0].err.name, "OtherError");
  assert.ok(!s.raw().includes("FAKE"));
});

test("err undefined ⇒ err omitted in file and console", (t) => {
  const s = setup(t);
  s.log.gglError("main", "gone", undefined, { reason: "crashed" });
  assert.deepEqual(s.records()[0], {
    v: 1,
    s: "main",
    e: "gone",
    d: { reason: "crashed" },
  });
  assert.ok(!("err" in lastConsoleJson(s.errOut)));
});

test("L9: homedir → ~ only at a path boundary, any case, both slashes", (t) => {
  const s = setup(t, { homedir: "C:\\Users\\Mochi" });
  s.log.gglEvent("main", "l9", {
    a: "C:\\Users\\Mochi\\a",
    b: "C:/Users/Mochi/b",
    c: "c:\\users\\MOCHI\\c",
    d: "C:\\Users\\MochiX\\c",
    e: "C:\\Users\\Mochi",
  });
  assert.deepEqual(s.records()[0].d, {
    a: "~\\a",
    b: "~/b",
    c: "~\\c",
    d: "C:\\Users\\MochiX\\c",
    e: "~",
  });
});

test("L11: rotation fails ⇒ no throw, entry dropped, one console.error", (t) => {
  const s = setup(t, { maxBytes: 16 });
  fs.writeFileSync(s.filePath, "x".repeat(64));
  fs.mkdirSync(path.join(s.dir, "ggl-launcher.1.log"));
  s.log.gglEvent("main", "dropped", {});
  assert.equal(s.raw(), "x".repeat(64));
  assert.equal(s.errOut.mock.callCount(), 1);
  assert.deepEqual(s.errOut.mock.calls[0].arguments, [WRITE_FAILED]);
});

test("L12: write failures ⇒ no throw, exactly one fixed console.error, no recursion", async (t) => {
  const cases = {
    "path is a directory": (dir) => {
      const p = path.join(dir, "is-dir.log");
      fs.mkdirSync(p);
      return () => p;
    },
    "parent is a file": (dir) => {
      const parent = path.join(dir, "parent-file");
      fs.writeFileSync(parent, "");
      return () => path.join(parent, "x.log");
    },
    "getFilePath throws": () => () => {
      throw new Error("userData unavailable");
    },
  };
  for (const [name, make] of Object.entries(cases)) {
    await t.test(name, (tt) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-log-"));
      tt.after(() => fs.rmSync(dir, { recursive: true, force: true }));
      tt.mock.method(console, "log", () => {});
      const errOut = tt.mock.method(console, "error", () => {});
      const log = createGglLog({
        getFilePath: make(dir),
        homedir: os.homedir(),
        maxBytes: 1024,
      });
      log.gglEvent("main", "ev", {});
      assert.equal(errOut.mock.callCount(), 1);
      assert.deepEqual(errOut.mock.calls[0].arguments, [WRITE_FAILED]);
      log.gglError("main", "er", new Error("x"), {});
      // 一次是紀錄本身、一次是寫檔失敗；遞迴的話會更多
      assert.equal(errOut.mock.callCount(), 3);
      assert.deepEqual(errOut.mock.calls[2].arguments, [WRITE_FAILED]);
    });
  }
});

test("L13: circular detail ⇒ no throw, log_serialize_failed", (t) => {
  const s = setup(t);
  const d = {};
  d.self = d;
  s.log.gglEvent("main", "c", d);
  s.log.gglError("main", "c2", new Error("x"), d);
  const [r1, r2] = s.records();
  assert.equal(r1.d, "log_serialize_failed");
  assert.equal(r2.d, "log_serialize_failed");
  assert.equal(r2.e, "c2");
});
