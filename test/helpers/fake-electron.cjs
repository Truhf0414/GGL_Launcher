"use strict";

// 測試 main/ 裡用到時才 require("electron") 的檔（main/paths.js 等）：在呼叫的測試檔裡把 electron 換成假的 app。
// getPath 只回測試設過的名字，沒設就丟錯（不會不小心落到真的 userData）；其他 require 照舊交給 forbid-electron。
// dialog.showMessageBox 轉給測試設的 state.showMessageBox，沒設就丟錯（main/ui-dialogs.js 在檔頂取 dialog）。
// 起源 → _notes/plans/cross-review-2026-10-phase4.md §測試手法（4a 的 Module._load 包法）

const Module = require("module");

function installFakeElectron() {
  const state = { paths: {}, getPathThrows: null, showMessageBox: null };
  const fake = {
    app: {
      getPath(name) {
        if (state.getPathThrows) throw state.getPathThrows;
        if (!Object.hasOwn(state.paths, name)) {
          throw new Error(`假 electron 沒設 getPath("${name}")`);
        }
        return state.paths[name];
      },
      isPackaged: false,
    },
    dialog: {
      showMessageBox(...args) {
        if (!state.showMessageBox) {
          throw new Error("假 electron 沒設 showMessageBox");
        }
        return state.showMessageBox(...args);
      },
    },
  };
  const loadBefore = Module._load;
  Module._load = function loadWithFakeElectron(request, ...rest) {
    if (request === "electron") return fake;
    return loadBefore.call(this, request, ...rest);
  };
  return state;
}

module.exports = { installFakeElectron };
