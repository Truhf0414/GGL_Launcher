"use strict";

// 本機同步記錄（sync-record.json）的形狀檢查；readRecord／writeRecord 共用。
// 會打包給玩家；不 require("electron")。欄位的權威 → _notes/plans/instance-sync-v3.md 假設 18-11
// 回 { ok, value } | { ok:false, error }，不丟例外；error 以欄位路徑開頭（同 site-format）。

const { isPlainObject, fileListError } = require("./site-format.js");
const { runtimeFieldsError } = require("../runtime-target.js");

const RECORD_FORMAT = 3;

const fail = (error) => ({ ok: false, error });

// ④ 起的三欄必填，規則只有 runtimeFieldsError 一份；③ 寫的記錄（沒有三欄）不接，讀成沒有記錄（→ phase6c U5）
function validateRuntimeFields(x) {
  const error = runtimeFieldsError(x);
  return error === null ? null : `record.${error}`;
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
