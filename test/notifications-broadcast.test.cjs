"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeBroadcastNotifId,
  parseIsoDateToMs,
  notifKeyFor,
  normalizeBroadcastNotifications,
} = require("../lib/notifications-broadcast.js");

test("computeBroadcastNotifId: explicit id wins", () => {
  assert.equal(computeBroadcastNotifId({ id: "  x  ", title: "a" }), "x");
});

test("computeBroadcastNotifId: hash when id missing", () => {
  const id = computeBroadcastNotifId({ title: "t", body: "b", timeText: "" });
  assert.equal(id.length, 40);
  assert.match(id, /^[a-f0-9]+$/);
});

test("parseIsoDateToMs", () => {
  assert.equal(parseIsoDateToMs(""), null);
  assert.equal(parseIsoDateToMs("not a date"), null);
  assert.equal(typeof parseIsoDateToMs("2020-01-01T00:00:00.000Z"), "number");
});

test("notifKeyFor", () => {
  assert.equal(notifKeyFor({ createdAtMs: 1, id: "a" }), "1:a");
});

test("normalizeBroadcastNotifications: filters empty and expired", () => {
  const now = new Date("2024-06-01T12:00:00.000Z").getTime();
  const items = normalizeBroadcastNotifications(
    [
      { title: " ", body: " " },
      {
        title: "A",
        body: "B",
        priority: 2,
        createdAt: "2024-05-01T00:00:00.000Z",
        expiresAt: "2024-05-02T00:00:00.000Z",
      },
      {
        title: "Live",
        body: "Now",
        priority: 1,
        createdAt: "2024-05-01T00:00:00.000Z",
      },
    ],
    now,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Live");
});

test("normalizeBroadcastNotifications: startsAt vs expiresAt tie clears expires", () => {
  const now = new Date("2024-06-01T12:00:00.000Z").getTime();
  const same = "2024-06-01T10:00:00.000Z";
  const items = normalizeBroadcastNotifications(
    [
      {
        title: "Edge",
        body: "Case",
        startsAt: same,
        expiresAt: same,
      },
    ],
    now,
  );
  assert.equal(items.length, 1);
});
