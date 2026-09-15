// npm test 以 --require 預載：測試行程裡任何 require("electron") 直接丟錯。
// electron 套件的 index.js 在 require 當下檢查執行檔，缺 dist 就同步下載並等它跑完，
// 新 clone／CI 上的 npm test 會無聲卡住；這裡把「卡住」換成「立刻紅」。
// main/ 的檔若要被測，electron 一律在用到的地方才 require，或經注入的 deps 取得。
const Module = require("module");

const originalLoad = Module._load;

Module._load = function loadForbiddingElectron(request, parent, isMain) {
  if (request === "electron") {
    const from = parent && parent.filename ? parent.filename : "(unknown)";
    throw new Error(
      `測試行程不准 require("electron")（來自 ${from}）。` +
        "請改成用到時才 require，或在測試中注入 deps。",
    );
  }
  return originalLoad.apply(this, arguments);
};
