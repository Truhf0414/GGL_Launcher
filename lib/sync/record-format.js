"use strict";

// 本機同步記錄（sync-record.json）的形狀檢查；readRecord／writeRecord 共用。
// 會打包給玩家；不 require("electron")。欄位的權威 → _notes/plans/instance-sync-v3.md 假設 18-11
// 回 { ok, value } | { ok:false, error }，不丟例外；error 以欄位路徑開頭（同 site-format）。

const { isPlainObject, fileListError } = require("./site-format.js");

const RECORD_FORMAT = 3;

const fail = (error) => ({ ok: false, error });

// ④ 起的三欄：=== undefined 算缺（③ 寫的記錄本來就沒有）；存在就必須型別正確，null 也算錯
function validateRuntimeFields(x) {
  if (x.minecraft !== undefined && typeof x.minecraft !== "string") {
    return "record.minecraft: 必須是字串";
  }
  if (x.loader !== undefined) {
    const l = x.loader;
    if (
      !isPlainObject(l) ||
      typeof l.type !== "string" ||
      typeof l.version !== "string"
    ) {
      return "record.loader: 必須是 { type, version } 皆字串";
    }
  }
  if (
    x.javaMajor !== undefined &&
    !(Number.isSafeInteger(x.javaMajor) && x.javaMajor > 0)
  ) {
    return "record.javaMajor: 必須是正整數";
  }
  return null;
}

function validateRecord(x) {
  if (!isPlainObject(x)) return fail("record: 不是物件");
  if (x.format !== RECORD_FORMAT)
    return fail(`record.format: 必須是 ${RECORD_FORMAT}`);
  if (typeof x.version !== "string") return fail("record.version: 必須是字串");
  if (typeof x.appliedAt !== "string")
    return fail("record.appliedAt: 必須是字串");
  const error =
    fileListError(x.files, "record.files", { withSize: false }) ??
    validateRuntimeFields(x);
  if (error) return fail(error);
  return { ok: true, value: x };
}

module.exports = {
  RECORD_FORMAT,
  validateRecord,
};
