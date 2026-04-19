"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  summarizeManifestFetchFailure,
} = require("../lib/manifest-network.js");

test("summarizeManifestFetchFailure: timeout-ish", () => {
  const r = summarizeManifestFetchFailure(new Error("ETIMEDOUT"));
  assert.equal(r.code, "timeout_or_abort");
  assert.ok(r.hint.length > 0);
});

test("summarizeManifestFetchFailure: network-ish", () => {
  const r = summarizeManifestFetchFailure(
    new Error("getaddrinfo ENOTFOUND example.invalid"),
  );
  assert.equal(r.code, "network");
});

test("summarizeManifestFetchFailure: http-ish", () => {
  const r = summarizeManifestFetchFailure(new Error("HTTP 503"));
  assert.equal(r.code, "http");
});

test("summarizeManifestFetchFailure: statuscode pattern", () => {
  const r = summarizeManifestFetchFailure(new Error("StatusCode: 404"));
  assert.equal(r.code, "http");
});

test("summarizeManifestFetchFailure: unknown trims long message", () => {
  const long = "x".repeat(200);
  const r = summarizeManifestFetchFailure(new Error(long));
  assert.equal(r.code, "unknown");
  assert.ok(r.hint.length <= 165);
});
