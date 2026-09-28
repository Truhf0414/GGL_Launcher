"use strict";

// 發版／退版 CLI。核心在 scripts/lib/publish.js；本檔只負責解析參數、印報告、決定 exit code。
// 規格 → _notes/plans/instance-sync-v3-commit2b.md §介面 scripts/publish.js

const path = require("node:path");
const { parseArgs } = require("node:util");

const USAGE = [
  "用法：",
  "  node scripts/publish.js <版本資料夾> [--site-root <dir>] [--release-root <dir>] [--apply] [--force] [--details]",
  "  node scripts/publish.js --list [--site-root <dir>]",
  "  node scripts/publish.js --rollback [--site-root <dir>]",
  "  node scripts/publish.js --rollback --to <編號> [--site-root <dir>] [--apply] [--details]",
  "預設乾跑；加 --apply 才寫入。報告預設只列數量，加 --details 逐檔列出。",
].join("\n");

const OPTIONS = {
  "site-root": { type: "string" },
  "release-root": { type: "string" },
  apply: { type: "boolean" },
  force: { type: "boolean" },
  list: { type: "boolean" },
  rollback: { type: "boolean" },
  to: { type: "string" },
  details: { type: "boolean" },
};

// 每個模式允許的旗標；不在表內的一律拒絕，免得「--rollback --apply」忘了 --to 時默默變成只列清單
const ALLOWED_FLAGS = {
  publish: ["site-root", "release-root", "apply", "force", "details"],
  list: ["list", "site-root"],
  "rollback-list": ["rollback", "site-root"],
  rollback: ["rollback", "to", "site-root", "apply", "details"],
};

const fail = (error) => ({ ok: false, error, usage: USAGE });

function modeOf(values) {
  if (values.list && values.rollback)
    return fail("--list 與 --rollback 不能同時用");
  if (values.to !== undefined && !values.rollback)
    return fail("--to 只能配 --rollback 使用");
  if (values.list) return { ok: true, mode: "list" };
  if (values.rollback)
    return {
      ok: true,
      mode: values.to === undefined ? "rollback-list" : "rollback",
    };
  return { ok: true, mode: "publish" };
}

/**
 * @param {string[]} argv process.argv.slice(2)
 * @param {{ siteRoot: string, releaseSourceRoot: string }} publishConfig
 * @returns {{ ok: true, mode: "publish" | "list" | "rollback-list" | "rollback",
 *             siteRoot: string, siteRootIsDefault: boolean, releaseRoot: string,
 *             sourceDir?: string, to?: number, dryRun: boolean, force: boolean, details: boolean }
 *         | { ok: false, error: string, usage: string }}
 */
function resolveCliOptions(argv, publishConfig) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    return fail(err.message);
  }
  const { values, positionals } = parsed;

  const mode = modeOf(values);
  if (!mode.ok) return mode;

  for (const flag of Object.keys(values)) {
    if (!ALLOWED_FLAGS[mode.mode].includes(flag))
      return fail(`--${flag} 不能用在 ${mode.mode} 模式`);
  }
  for (const flag of ["site-root", "release-root"]) {
    if (values[flag] === "") return fail(`--${flag} 不能是空字串`);
  }

  const wantPositionals = mode.mode === "publish" ? 1 : 0;
  if (positionals.length !== wantPositionals) {
    return fail(
      mode.mode === "publish"
        ? `要剛好一個版本資料夾，收到 ${positionals.length} 個`
        : `${mode.mode} 模式不收位置參數：${positionals.join(" ")}`,
    );
  }

  let to;
  if (mode.mode === "rollback") {
    if (!/^[1-9]\d*$/.test(values.to))
      return fail(`--to 必須是正整數：${values.to}`);
    to = Number(values.to);
  }

  const siteRootIsDefault = values["site-root"] === undefined;
  const siteRoot = siteRootIsDefault
    ? publishConfig.siteRoot
    : values["site-root"];
  const releaseRoot = values["release-root"] ?? publishConfig.releaseSourceRoot;
  const result = {
    ok: true,
    mode: mode.mode,
    siteRoot,
    siteRootIsDefault,
    releaseRoot,
    dryRun: !values.apply,
    force: Boolean(values.force),
    details: Boolean(values.details),
  };
  if (mode.mode === "publish") {
    const [arg] = positionals;
    // B9：絕對路徑照用；否則接在 release root 底下
    result.sourceDir = path.isAbsolute(arg) ? arg : path.join(releaseRoot, arg);
  }
  if (to !== undefined) result.to = to;
  return result;
}

const MIDWAY_FAILURE_HINT = "站台可能停在中間狀態，重跑同一道指令會收斂。";

const siteRootLine = (o) =>
  `== 目標站台根：${o.siteRoot}${o.siteRootIsDefault ? "（預設值）" : ""}`;

/** @returns {Promise<number>} exit code：成功 0、被拒絕／參數錯／中途失敗 1 */
async function main(
  argv,
  { now = new Date(), print = console.log, printError = console.error } = {},
) {
  const publishConfig = require("./publish-config.js");
  const opts = resolveCliOptions(argv, publishConfig);
  if (!opts.ok) {
    printError(opts.error);
    printError(opts.usage);
    return 1;
  }
  const lib = require("./lib/publish.js");
  const { siteRoot } = opts;
  if (opts.mode === "list" || opts.mode === "rollback-list") {
    const list = await lib.listReleases({ siteRoot });
    const lines =
      opts.mode === "list"
        ? lib.formatReleaseList(list)
        : ["可退（新到舊）：", ...lib.formatRollbackChoices(list.others)];
    print([siteRootLine(opts), ...lines].join("\n"));
    return 0;
  }
  try {
    const result =
      opts.mode === "rollback"
        ? await lib.rollback({
            siteRoot,
            to: opts.to,
            apply: !opts.dryRun,
            details: opts.details,
          })
        : await lib.publish({
            sourceDir: opts.sourceDir,
            siteRoot,
            siteRootIsDefault: opts.siteRootIsDefault,
            publishConfig,
            now,
            apply: !opts.dryRun,
            force: opts.force,
            details: opts.details,
          });
    const lines =
      opts.mode === "rollback"
        ? [siteRootLine(opts), ...result.report]
        : result.report;
    print(lines.join("\n"));
    return result.ok ? 0 : 1;
  } catch (err) {
    printError(`失敗：${err.message}`);
    printError(MIDWAY_FAILURE_HINT);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(err);
      process.exitCode = 1;
    },
  );
}

module.exports = { resolveCliOptions, main, USAGE };
