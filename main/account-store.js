// account.json：讀寫與給 renderer 的安全快照。
// token 欄位的 envelope 加解密邏輯住 lib/account-secret.js，這裡只負責接電
// （組 deps、決定存哪個路徑、實際寫檔）。
const path = require("path");
const fsp = require("fs/promises");
const {
  ACCOUNT_STATE,
  TOKEN_READ,
  CredentialsTemporarilyUnavailableError,
  createTokenEnvelope,
  readTokenEnvelope,
  normalizeAccountState,
  resolveAccountAfterTokenRead,
} = require("../lib/account-secret");

// electron 只在 getter 被呼叫時才 require：測試注入假 deps，就不會載入 electron（見 test/helpers/forbid-electron.cjs）
const defaultDeps = {
  getSafeStorage: () => require("electron").safeStorage,
  getAccountPath: () =>
    path.join(require("electron").app.getPath("userData"), "account.json"),
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

/**
 * 讀檔失敗、JSON 壞掉 → logged-out。token 解不開不走這條：由 token 分類決定
 * 記憶體內的 state（見 resolveAccountAfterTokenRead），磁碟維持原樣。
 * token 暫時不可用 → 丟 CredentialsTemporarilyUnavailableError（帶不含 token 的快照）。
 */
async function readAccount() {
  let parsed;
  try {
    parsed = JSON.parse(await fsp.readFile(deps.getAccountPath(), "utf8"));
  } catch {
    return emptyAccount();
  }
  if (!parsed || typeof parsed !== "object") return emptyAccount();

  const profile = {
    // 沒有 state 欄位（含舊版 loggedIn 布林 schema）一律 normalize 成 logged-out，
    // 這就是「舊 account.json 直接丟棄、要求重登」裁決的落地方式。
    state: normalizeAccountState(parsed.state),
    name: typeof parsed.name === "string" ? parsed.name : "",
    uuid: typeof parsed.uuid === "string" ? parsed.uuid : "",
    avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
  };
  const safeStorage = deps.getSafeStorage();
  const mcRead = await readTokenEnvelope(parsed.mcAccessToken, safeStorage);
  const msRead = await readTokenEnvelope(parsed.msRefreshToken, safeStorage);
  const resolved = resolveAccountAfterTokenRead(profile.state, mcRead, msRead);
  if (resolved.temporarilyUnavailable) {
    throw new CredentialsTemporarilyUnavailableError(profile);
  }
  return {
    ...profile,
    state: resolved.state,
    mcAccessToken: mcRead.kind === TOKEN_READ.OK ? mcRead.value : "",
    msRefreshToken: msRead.kind === TOKEN_READ.OK ? msRead.value : "",
    expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
  };
}

async function serializeAccountForDisk(next) {
  const safeStorage = deps.getSafeStorage();
  return {
    state: normalizeAccountState(next.state),
    name: typeof next.name === "string" ? next.name : "",
    uuid: typeof next.uuid === "string" ? next.uuid : "",
    avatarUrl: typeof next.avatarUrl === "string" ? next.avatarUrl : "",
    mcAccessToken: next.mcAccessToken
      ? await createTokenEnvelope(next.mcAccessToken, safeStorage)
      : null,
    msRefreshToken: next.msRefreshToken
      ? await createTokenEnvelope(next.msRefreshToken, safeStorage)
      : null,
    expiresAt: Number.isFinite(next.expiresAt) ? next.expiresAt : null,
  };
}

/** 同目錄暫存檔寫完再 rename，避免中途崩潰／斷電時把唯一的 credential 寫壞一半。 */
async function writeAccount(next) {
  const filePath = deps.getAccountPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const payload = await serializeAccountForDisk(next);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf8");
  await fsp.rename(tmpPath, filePath);
  return next;
}

/**
 * 給 renderer 的帳號快照：白名單，token／到期時間都不外洩；state 本身如實傳出（三態之一）。
 * token 暫時不可用時回存檔裡的狀態——renderer 遇錯一律靜默顯示登出，不能讓錯誤丟到那邊。
 */
async function getAccountPayloadForRenderer() {
  let acct;
  try {
    acct = await readAccount();
  } catch (e) {
    if (!(e instanceof CredentialsTemporarilyUnavailableError)) throw e;
    acct = e.account;
  }
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
