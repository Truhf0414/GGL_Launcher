// account.json：讀寫與給 renderer 的安全快照。
// token 欄位的 envelope 加解密邏輯住 lib/account-secret.js，這裡只負責接電
// （組 deps、決定存哪個路徑、實際寫檔）。
const { app, safeStorage } = require("electron");
const path = require("path");
const fsp = require("fs/promises");
const {
  ACCOUNT_STATE,
  createTokenEnvelope,
  readTokenEnvelope,
  normalizeAccountState,
} = require("../lib/account-secret");

const defaultDeps = {
  safeStorage,
  getAccountPath: () => path.join(app.getPath("userData"), "account.json"),
};

/** @type {typeof defaultDeps} */
let deps = { ...defaultDeps };

/** 測試用：注入假 safeStorage／假路徑，不必真的跑在 Electron 裡。 */
function configureAccountStore(next) {
  deps = { ...defaultDeps, ...next };
}

function emptyAccount() {
  return {
    state: ACCOUNT_STATE.LOGGED_OUT,
    name: "",
    uuid: "",
    avatarUrl: "",
    mcAccessToken: "",
    msRefreshToken: "",
    expiresAt: null,
  };
}

async function readAccount() {
  try {
    const raw = await fsp.readFile(deps.getAccountPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      // 沒有 state 欄位（含舊版 loggedIn 布林 schema）一律 normalize 成 logged-out，
      // 這就是「舊 account.json 直接丟棄、要求重登」裁決的落地方式。
      state: normalizeAccountState(parsed.state),
      name: typeof parsed.name === "string" ? parsed.name : "",
      uuid: typeof parsed.uuid === "string" ? parsed.uuid : "",
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
      mcAccessToken:
        readTokenEnvelope(parsed.mcAccessToken, deps.safeStorage) || "",
      msRefreshToken:
        readTokenEnvelope(parsed.msRefreshToken, deps.safeStorage) || "",
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
    };
  } catch {
    return emptyAccount();
  }
}

function serializeAccountForDisk(next) {
  return {
    state: normalizeAccountState(next.state),
    name: typeof next.name === "string" ? next.name : "",
    uuid: typeof next.uuid === "string" ? next.uuid : "",
    avatarUrl: typeof next.avatarUrl === "string" ? next.avatarUrl : "",
    mcAccessToken: next.mcAccessToken
      ? createTokenEnvelope(next.mcAccessToken, deps.safeStorage)
      : null,
    msRefreshToken: next.msRefreshToken
      ? createTokenEnvelope(next.msRefreshToken, deps.safeStorage)
      : null,
    expiresAt: Number.isFinite(next.expiresAt) ? next.expiresAt : null,
  };
}

/** 同目錄暫存檔寫完再 rename，避免中途崩潰／斷電時把唯一的 credential 寫壞一半。 */
async function writeAccount(next) {
  const filePath = deps.getAccountPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const payload = serializeAccountForDisk(next);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf8");
  await fsp.rename(tmpPath, filePath);
  return next;
}

/** 給 renderer 的帳號快照：白名單，token／到期時間都不外洩；state 本身如實傳出（三態之一）。 */
async function getAccountPayloadForRenderer() {
  const acct = await readAccount();
  return {
    state: acct.state,
    name: acct.name,
    uuid: acct.uuid,
    avatarUrl: acct.avatarUrl,
  };
}

module.exports = {
  configureAccountStore,
  readAccount,
  writeAccount,
  getAccountPayloadForRenderer,
};
