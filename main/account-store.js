// account.json：讀寫與給 renderer 的安全快照（不含 mcAccessToken）
const { app } = require("electron");
const path = require("path");
const fsp = require("fs/promises");

function getAccountPath() {
  return path.join(app.getPath("userData"), "account.json");
}

async function readAccount() {
  try {
    const raw = await fsp.readFile(getAccountPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      loggedIn: Boolean(parsed.loggedIn),
      name: typeof parsed.name === "string" ? parsed.name : "",
      uuid: typeof parsed.uuid === "string" ? parsed.uuid : "",
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
      mcAccessToken:
        typeof parsed.mcAccessToken === "string" ? parsed.mcAccessToken : "",
    };
  } catch {
    return {
      loggedIn: false,
      name: "",
      uuid: "",
      avatarUrl: "",
      mcAccessToken: "",
    };
  }
}

async function writeAccount(next) {
  await fsp.mkdir(path.dirname(getAccountPath()), { recursive: true });
  await fsp.writeFile(getAccountPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

/** 給 renderer 的帳號快照（不含 mcAccessToken）；與 account:get 共用 */
async function getAccountPayloadForRenderer() {
  const acct = await readAccount();
  const { mcAccessToken, ...safe } = acct;
  return safe;
}

module.exports = {
  readAccount,
  writeAccount,
  getAccountPayloadForRenderer,
};
