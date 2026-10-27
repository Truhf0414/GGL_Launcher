"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const {
  configureAccountStore,
  readAccount,
  writeAccount,
  getAccountPayloadForRenderer,
} = require("../main/account-store.js");
const {
  ACCOUNT_STATE,
  CredentialsTemporarilyUnavailableError,
} = require("../lib/account-secret.js");
const {
  makeFakeSafeStorage,
  encryptedEnvelope,
  UNDECRYPTABLE_ENVELOPE,
  TEMPORARILY_UNAVAILABLE_ENVELOPE,
} = require("./helpers/fake-safe-storage.cjs");

async function sha256OfFile(filePath) {
  return crypto
    .createHash("sha256")
    .update(await fsp.readFile(filePath))
    .digest("hex");
}

async function withTempAccountFile(
  t,
  { safeStorage, gglError = () => {} } = {},
) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-account-"));
  t.after(async () => {
    try {
      await fsp.rm(root, { recursive: true, force: true });
    } catch {}
  });
  const filePath = path.join(root, "account.json");
  const fakeSafeStorage = safeStorage ?? makeFakeSafeStorage();
  configureAccountStore({
    getSafeStorage: () => fakeSafeStorage,
    getAccountPath: () => filePath,
    gglError,
  });
  return filePath;
}

test("加密可用：寫入再讀回，token 明文一致；磁碟上不是明文", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeAccount({
    state: ACCOUNT_STATE.ACTIVE,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "https://example.com/a.png",
    mcAccessToken: "mc-secret",
    msRefreshToken: "refresh-secret",
    expiresAt: 123456,
  });
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.ACTIVE);
  assert.equal(acct.name, "Steve");
  assert.equal(acct.mcAccessToken, "mc-secret");
  assert.equal(acct.msRefreshToken, "refresh-secret");
  assert.equal(acct.expiresAt, 123456);

  // 只斷言「不出現」不夠力（漏加密跟寫壞測試可能同形），
  // 用假 safeStorage 的可辨識前綴 "ENC:" 正面確認走過加密路徑。
  const rawOnDisk = await fsp.readFile(filePath, "utf8");
  assert.ok(!rawOnDisk.includes("mc-secret"));
  assert.ok(!rawOnDisk.includes("refresh-secret"));
  const onDiskJson = JSON.parse(rawOnDisk);
  const decodedMc = Buffer.from(
    onDiskJson.mcAccessToken.data,
    "base64",
  ).toString("utf8");
  assert.equal(decodedMc, "ENC:mc-secret");
});

test("encryptStringAsync reject：退明文寫檔成功、讀回 ok，不擋使用者", async (t) => {
  const filePath = await withTempAccountFile(t, {
    safeStorage: makeFakeSafeStorage({ encryptRejects: true }),
  });
  await writeAccount({
    state: ACCOUNT_STATE.ACTIVE,
    name: "Alex",
    uuid: "uuid-2",
    avatarUrl: "",
    mcAccessToken: "mc-plain",
    msRefreshToken: "refresh-plain",
    expiresAt: 999,
  });
  const onDisk = JSON.parse(await fsp.readFile(filePath, "utf8"));
  assert.equal(onDisk.mcAccessToken.method, "plaintext");
  assert.equal(onDisk.msRefreshToken.method, "plaintext");
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.ACTIVE);
  assert.equal(acct.mcAccessToken, "mc-plain");
  assert.equal(acct.msRefreshToken, "refresh-plain");
});

async function writeRawAccountFile(filePath, overrides) {
  await fsp.writeFile(
    filePath,
    JSON.stringify({
      state: ACCOUNT_STATE.ACTIVE,
      name: "Steve",
      uuid: "uuid-1",
      avatarUrl: "",
      mcAccessToken: encryptedEnvelope("mc-secret"),
      msRefreshToken: encryptedEnvelope("refresh-secret"),
      expiresAt: 123,
      ...overrides,
    }),
    "utf8",
  );
}

test("解密失敗（例如密文被搬到別台機器）：記憶體內視為 reauth-required，不假裝沒有 token", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeRawAccountFile(filePath, {
    mcAccessToken: UNDECRYPTABLE_ENVELOPE,
    msRefreshToken: null,
  });
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.REAUTH_REQUIRED);
  assert.equal(acct.mcAccessToken, "");
  assert.equal(acct.name, "Steve"); // 帳號身分照舊帶出，畫面顯示「需要重新登入」而不是登出
});

test("active 但 mc token 為 null：記憶體內視為 reauth-required", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeRawAccountFile(filePath, { mcAccessToken: null });
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.REAUTH_REQUIRED);
});

test("active 且只有 refresh token 為 null：合法狀態，維持 active", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeRawAccountFile(filePath, { msRefreshToken: null });
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.ACTIVE);
  assert.equal(acct.mcAccessToken, "mc-secret");
  assert.equal(acct.msRefreshToken, "");
});

test("token 暫時不可用：readAccount 丟專屬錯誤，錯誤帶不含 token 的帳號快照；不寫檔", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeRawAccountFile(filePath, {
    mcAccessToken: TEMPORARILY_UNAVAILABLE_ENVELOPE,
  });
  const hashBefore = await sha256OfFile(filePath);
  const err = await readAccount().then(
    () => assert.fail("readAccount 應該 reject"),
    (e) => e,
  );
  assert.ok(err instanceof CredentialsTemporarilyUnavailableError);
  assert.deepEqual(err.account, {
    state: ACCOUNT_STATE.ACTIVE,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "",
  });
  assert.equal(await sha256OfFile(filePath), hashBefore);
});

// D2：active 帳號的 name／uuid 不是非空字串 ⇒ 要重新登入；身分壞先於 token 判，token 不解密
// （→ _notes/plans/cross-review-2026-10-phase6c.md §施工前釘清 1）
function countingSafeStorage() {
  const inner = makeFakeSafeStorage();
  const counted = {
    ...inner,
    decrypts: 0,
    decryptStringAsync: async (buf) => {
      counted.decrypts += 1;
      return inner.decryptStringAsync(buf);
    },
  };
  return counted;
}

const BAD_IDENTITIES = [
  ["空名字", { name: "" }],
  ["空 uuid", { uuid: "" }],
  ["缺 name", { name: undefined }],
  ["缺 uuid", { uuid: undefined }],
  ["name 是數字", { name: 5 }],
  ["uuid 是 null", { uuid: null }],
];

for (const [label, identity] of BAD_IDENTITIES) {
  test(`D2 active、${label} ⇒ reauth-required、token 不解密、不記解密失敗、磁碟不變`, async (t) => {
    const safeStorage = countingSafeStorage();
    const errors = [];
    const filePath = await withTempAccountFile(t, {
      safeStorage,
      gglError: (...args) => errors.push(args),
    });
    // mc token 故意解不開：要是有解密，就會記一筆 token_decrypt_failed
    await writeRawAccountFile(filePath, {
      ...identity,
      mcAccessToken: UNDECRYPTABLE_ENVELOPE,
    });
    const hashBefore = await sha256OfFile(filePath);
    const acct = await readAccount();
    assert.equal(acct.state, ACCOUNT_STATE.REAUTH_REQUIRED);
    assert.equal(acct.mcAccessToken, "");
    assert.equal(acct.msRefreshToken, "");
    assert.equal(acct.expiresAt, 123);
    assert.equal(safeStorage.decrypts, 0);
    assert.deepEqual(errors, []);
    assert.equal(await sha256OfFile(filePath), hashBefore);
  });
}

test("D2 壞身分＋token 暫時不可用 ⇒ reauth-required，不丟 CredentialsTemporarilyUnavailableError", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeRawAccountFile(filePath, {
    name: "",
    mcAccessToken: TEMPORARILY_UNAVAILABLE_ENVELOPE,
    msRefreshToken: TEMPORARILY_UNAVAILABLE_ENVELOPE,
  });
  const hashBefore = await sha256OfFile(filePath);
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.REAUTH_REQUIRED);
  assert.equal(await sha256OfFile(filePath), hashBefore);
});

test("D2 非 active 的帳號身分不完整 ⇒ 狀態照舊，不新增轉換", async (t) => {
  const filePath = await withTempAccountFile(t);
  for (const state of [
    ACCOUNT_STATE.LOGGED_OUT,
    ACCOUNT_STATE.REAUTH_REQUIRED,
  ]) {
    await writeRawAccountFile(filePath, { state, name: "", uuid: "" });
    assert.equal((await readAccount()).state, state);
  }
});

test("token 暫時不可用：renderer 快照照存檔狀態回傳，不顯示成登出", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeRawAccountFile(filePath, {
    msRefreshToken: TEMPORARILY_UNAVAILABLE_ENVELOPE,
  });
  const payload = await getAccountPayloadForRenderer();
  assert.deepEqual(payload, {
    state: ACCOUNT_STATE.ACTIVE,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "",
  });
});

test("shouldReEncrypt 為 true：照樣讀回 token，讀取路徑不寫檔", async (t) => {
  const filePath = await withTempAccountFile(t, {
    safeStorage: makeFakeSafeStorage({ shouldReEncrypt: true }),
  });
  await writeRawAccountFile(filePath);
  const hashBefore = await sha256OfFile(filePath);
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.ACTIVE);
  assert.equal(acct.mcAccessToken, "mc-secret");
  assert.equal(await sha256OfFile(filePath), hashBefore);
});

test("JSON 壞掉：logged-out（與 token 分類分開處理）", async (t) => {
  const filePath = await withTempAccountFile(t);
  await fsp.writeFile(filePath, "{ not json", "utf8");
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.LOGGED_OUT);
});

test("檔案不存在：logged-out", async (t) => {
  await withTempAccountFile(t);
  const acct = await readAccount();
  assert.equal(acct.state, ACCOUNT_STATE.LOGGED_OUT);
});

test("舊明文 account.json（loggedIn 布林 + 裸字串 token）：讀回視為 logged-out、token 皆空", async (t) => {
  const filePath = await withTempAccountFile(t);
  await fsp.writeFile(
    filePath,
    JSON.stringify({
      loggedIn: true,
      name: "OldSteve",
      uuid: "uuid-old",
      avatarUrl: "",
      mcAccessToken: "raw-plaintext-token-from-before",
    }),
    "utf8",
  );
  const acct = await readAccount();
  // 裸字串 token 屬 unreadable，但只有 active 會被降成 reauth-required；logged-out 維持原判
  assert.equal(acct.state, ACCOUNT_STATE.LOGGED_OUT);
  assert.equal(acct.mcAccessToken, "");
});

test("renderer 快照：只有白名單四個欄位（state／name／uuid／avatarUrl），不含 token／到期時間", async (t) => {
  await withTempAccountFile(t);
  await writeAccount({
    state: ACCOUNT_STATE.ACTIVE,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "https://example.com/a.png",
    mcAccessToken: "mc-secret",
    msRefreshToken: "refresh-secret",
    expiresAt: 123456,
  });
  const payload = await getAccountPayloadForRenderer();
  assert.deepEqual(Object.keys(payload).sort(), [
    "avatarUrl",
    "name",
    "state",
    "uuid",
  ]);
  assert.equal(payload.state, ACCOUNT_STATE.ACTIVE);
});

test("renderer 快照如實傳出 reauth-required，不再壓成一個布林", async (t) => {
  await withTempAccountFile(t);
  await writeAccount({
    state: ACCOUNT_STATE.REAUTH_REQUIRED,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "",
    mcAccessToken: "",
    msRefreshToken: "old-refresh-still-on-disk",
    expiresAt: null,
  });
  const payload = await getAccountPayloadForRenderer();
  assert.equal(payload.state, ACCOUNT_STATE.REAUTH_REQUIRED);
  // reauth-required 不刪 credential：確認 msRefreshToken 仍在磁碟上讀得到
  const acct = await readAccount();
  assert.equal(acct.msRefreshToken, "old-refresh-still-on-disk");
});

test("寫檔用暫存檔＋rename：完成後目錄底下不會留下 .tmp 檔案", async (t) => {
  const filePath = await withTempAccountFile(t);
  await writeAccount({
    state: ACCOUNT_STATE.ACTIVE,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "",
    mcAccessToken: "mc-secret",
    msRefreshToken: "",
    expiresAt: 1,
  });
  const files = await fsp.readdir(path.dirname(filePath));
  assert.deepEqual(files, [path.basename(filePath)]);
});

// ── L-SILENT 5：console 與常駐檔都不得出現 token／密文／envelope／原始錯誤訊息（→ _notes/plans/cross-review-2026-10-phase6c.md §L-SILENT）──

test("L-SILENT 5 加密退明文、解密失敗各記一筆：console 與常駐檔只有事件名、field、cause；陽性對照抓得到", async (t) => {
  const { createGglLog } = require("../lib/ggl-structured-log.js");
  const MC = "FAKE_TOKEN_6c_mc_access";
  const MS = "FAKE_TOKEN_6c_ms_refresh";
  const CIPHER = "FAKE_CIPHERTEXT_6c_disk";
  const leaky = {
    encryptStringAsync: async (plaintext) => {
      throw new Error(`encrypt failed for ${plaintext}`);
    },
    decryptStringAsync: async (buf) => {
      throw new Error(`decrypt failed: ${buf.toString("utf8")}`);
    },
  };
  const logDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-6c3-log-"));
  t.after(() => fsp.rm(logDir, { recursive: true, force: true }));
  const logFile = path.join(logDir, "ggl-launcher.log");
  const log = createGglLog({
    getFilePath: () => logFile,
    homedir: os.homedir(),
    maxBytes: 1 << 20,
  });
  const filePath = await withTempAccountFile(t, {
    safeStorage: leaky,
    gglError: log.gglError,
  });

  const captured = [];
  const original = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };
  const capture = (...a) => captured.push(a.map(String).join(" "));
  console.error = console.log = console.warn = capture;
  try {
    await writeAccount({
      state: ACCOUNT_STATE.ACTIVE,
      name: "Steve",
      uuid: "uuid-1",
      avatarUrl: "",
      mcAccessToken: MC,
      msRefreshToken: MS,
      expiresAt: 1,
    });
    const cipher = Buffer.from(CIPHER, "utf8").toString("base64");
    await writeRawAccountFile(filePath, {
      mcAccessToken: { version: 1, method: "safeStorage", data: cipher },
      msRefreshToken: { version: 1, method: "safeStorage", data: cipher },
    });
    const acct = await readAccount();
    assert.equal(acct.state, ACCOUNT_STATE.REAUTH_REQUIRED);
  } finally {
    Object.assign(console, original);
  }

  const consoleText = captured.join("\n");
  const fileText = await fsp.readFile(logFile, "utf8");
  const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
  for (const bad of [
    MC,
    MS,
    CIPHER,
    b64(MC),
    b64(MS),
    b64(CIPHER),
    "FAKE_",
    "encrypt failed",
    "decrypt failed",
    "safeStorage",
    "envelope",
    "stack",
  ]) {
    assert.ok(!consoleText.includes(bad), `console 含 ${bad}`);
    assert.ok(!fileText.includes(bad), `常駐檔含 ${bad}`);
  }
  const events = fileText
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l.slice(l.indexOf("{"))));
  assert.deepEqual(
    events.map((e) => [e.e, e.d]),
    [
      [
        "token_encrypt_fallback_plaintext",
        { field: "mcAccessToken", cause: "rejected" },
      ],
      [
        "token_encrypt_fallback_plaintext",
        { field: "msRefreshToken", cause: "rejected" },
      ],
      ["token_decrypt_failed", { field: "mcAccessToken", cause: "rejected" }],
      ["token_decrypt_failed", { field: "msRefreshToken", cause: "rejected" }],
    ],
  );
  assert.ok(
    events.every((e) => e.s === "account" && !("err" in e) && !("st" in e)),
  );
  assert.equal(captured.length, 4);

  // 陽性對照：把原始錯誤直接交給 gglError 時，同一套收集手段確實抓得到敏感字串
  const probe = [];
  console.error = (...a) => probe.push(a.map(String).join(" "));
  try {
    log.gglError(
      "account",
      "probe_raw_err",
      new Error(`decrypt failed for ${MC}`),
    );
  } finally {
    Object.assign(console, original);
  }
  assert.ok(probe.join("\n").includes(MC));
});
