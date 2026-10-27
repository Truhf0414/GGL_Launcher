"use strict";

// renderer 模組在 node 測試行程載入用的最小假 DOM：只做被測模組實際碰到的那幾個成員。

function makeEl(tag = "div") {
  const classes = new Set();
  const listeners = new Map();
  const el = {
    tagName: tag.toUpperCase(),
    textContent: "",
    disabled: false,
    checked: false,
    type: "",
    value: "",
    title: "",
    style: {
      setProperty(name, value) {
        this[name] = String(value);
      },
    },
    dataset: {},
    attrs: {},
    children: [],
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, force) => {
        const on = force === undefined ? !classes.has(c) : Boolean(force);
        if (on) classes.add(c);
        else classes.delete(c);
        return on;
      },
      contains: (c) => classes.has(c),
    },
    append: (...kids) => {
      el.children.push(...kids);
    },
    appendChild: (kid) => {
      el.children.push(kid);
      return kid;
    },
    replaceChildren: (...kids) => {
      el.children = [...kids];
    },
    querySelectorMap: {},
    querySelector: (sel) => el.querySelectorMap[sel] ?? null,
    setAttribute: (k, v) => {
      el.attrs[k] = String(v);
    },
    removeAttribute: (k) => {
      delete el.attrs[k];
    },
    // <input type="number"> 打了不是數字的字：value 是 ""、badInput 為真（真瀏覽器的語意只能靠實機）
    validity: { badInput: false },
    focus: () => {},
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener: (type, fn) => {
      const list = listeners.get(type) ?? [];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    /** 目前掛著幾個監聽（不分種類）：驗「有沒有新掛」「清理後拔乾淨了沒」 */
    listenerCount: () =>
      [...listeners.values()].reduce((n, list) => n + list.length, 0),
    /** 依序 await 每個 listener（模組的 click handler 是 async） */
    fire: async (type, ev = {}) => {
      for (const fn of listeners.get(type) ?? []) await fn(ev);
    },
  };
  return el;
}

const fakeDocument = {
  createElement: (tag) => makeEl(tag),
  documentElement: makeEl("html"),
};

/** 每個測試重新載入：IIFE 掛在 window 上，require 快取要清掉 */
function loadRendererModule(relPath, windowProps = {}) {
  global.window = { ...windowProps };
  const resolved = require.resolve(relPath);
  delete require.cache[resolved];
  require(resolved);
  return global.window;
}

/** renderer/constants.js 的真值（模組在載入時就讀它，index.html 也先載它） */
function rendererConstants() {
  return loadRendererModule(require.resolve("../../renderer/constants.js"))
    .GglRendererConstants;
}

/** lifetime 的 onDom 同形：直接掛上元素（假元素的 fire 會呼叫它） */
function onDom(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => {};
}

module.exports = {
  makeEl,
  fakeDocument,
  loadRendererModule,
  rendererConstants,
  onDom,
};
