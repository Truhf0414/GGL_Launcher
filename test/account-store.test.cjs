"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const {
  configureAccountStore,
  readAccount,
  writeAccount,
  getAccountPayloadForRenderer,
} = require("../main/account-store.js");
const { ACCOUNT_STATE } = require("../lib/account-secret.js");

function makeFakeSafeStorage({ available = true } = {}) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s) => Buffer.from(`ENC:${s}`, "utf8"),
    decryptString: (buf) => {
      const s = buf.toString("utf8");
      if (!s.startsWith("ENC:")) throw new Error("解密失敗");
      return s.slice(4);
    },
  };
}

async function withTempAccountFile(t, { safeStorage } = {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-account-"));
  t.after(async () => {
    try {
      await fsp.rm(root, { recursive: true, force: true });
    } catch {}
  });
  const filePath = path.join(root, "account.json");
  configureAccountStore({
    safeStorage: safeStorage ?? makeFakeSafeStorage(),
    getAccountPath: () => filePath,
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

test("加密不可用：退明文仍可運作，不擋使用者", async (t) => {
  await withTempAccountFile(t, {
    safeStorage: makeFakeSafeStorage({ available: false }),
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
  const acct = await readAccount();
  assert.equal(acct.mcAccessToken, "mc-plain");
  assert.equal(acct.msRefreshToken, "refresh-plain");
});

test("解密失敗（例如密文被搬到別台機器）：該欄位視為沒有 token，不炸掉整個讀取", async (t) => {
  const filePath = await withTempAccountFile(t);
  // 直接寫一個「用別把 safeStorage 加密」的 envelope，模擬搬機器後解不開
  await fsp.writeFile(
    filePath,
    JSON.stringify({
      state: ACCOUNT_STATE.ACTIVE,
      name: "Steve",
      uuid: "uuid-1",
      avatarUrl: "",
      mcAccessToken: {
        version: 1,
        method: "safeStorage",
        data: Buffer.from("garbage").toString("base64"),
      },
      msRefreshToken: null,
      expiresAt: 123,
    }),
    "utf8",
  );
  const acct = await readAccount();
  assert.equal(acct.mcAccessToken, "");
  assert.equal(acct.state, ACCOUNT_STATE.ACTIVE); // state 本身不受 token 解密失敗影響
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
