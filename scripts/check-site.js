"use strict";

// 站台發版前檢查 CLI：node scripts/check-site.js <站台根目錄>。核心在 scripts/lib/check-site.js。
// 只讀；有任何問題結束碼 1，參數錯 2，全部通過 0。

const { parseArgs } = require("node:util");

const USAGE = [
  "用法：node scripts/check-site.js <站台根目錄>",
  "只讀：檢查 manifest.json、gate.json、notice.json、release.json，不寫、不修、不重排任何檔。",
  "有任何問題結束碼 1；參數錯誤 2。",
].join("\n");

/** @returns {Promise<number>} exit code */
async function main(
  argv,
  { print = console.log, printError = console.error } = {},
) {
  let positionals;
  try {
    ({ positionals } = parseArgs({
      args: argv,
      options: {},
      allowPositionals: true,
      strict: true,
    }));
  } catch (err) {
    printError(err.message);
    printError(USAGE);
    return 2;
  }
  if (positionals.length !== 1 || positionals[0] === "") {
    printError(`要剛好一個站台根目錄，收到 ${positionals.length} 個`);
    printError(USAGE);
    return 2;
  }
  const { checkSite, SITE_FILES } = require("./lib/check-site.js");
  const [siteRoot] = positionals;
  const problems = await checkSite(siteRoot);
  if (problems.length === 0) {
    print(`通過：${siteRoot} 的 ${SITE_FILES.length} 支檔都沒有問題`);
    return 0;
  }
  for (const { file, message } of problems) printError(`${file}: ${message}`);
  printError(`共 ${problems.length} 個問題：${siteRoot}（未修改任何檔）`);
  return 1;
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

module.exports = { main, USAGE };
