"use strict";

// 假 safeStorage：只提供 async 方法，任何同步方法被呼叫即丟錯（同步版 45 棄用、46 移除）。
// reject 訊息照抄 Electron 44.3.0 shell/browser/api/electron_api_safe_storage.cc。

const TEMPORARILY_UNAVAILABLE_MESSAGE =
  "safeStorage.decryptStringAsync is temporarily unavailable. Please try again.";
const DECRYPT_FAILED_MESSAGE =
  "Error while decrypting the ciphertext provided to safeStorage.decryptStringAsync.";
const ENCRYPT_FAILED_MESSAGE =
  "Error while encrypting the text provided to safeStorage.encryptStringAsync.";

/** 解到這個密文時回「暫時不可用」。 */
const TEMPORARILY_UNAVAILABLE_CIPHERTEXT = "TEMP-UNAVAILABLE";

function forbidSync(name) {
  return () => {
    throw new Error(`同步 safeStorage.${name} 不得被呼叫`);
  };
}

/**
 * 密文格式：`ENC:<明文>`；`TEMP-UNAVAILABLE` 回暫時不可用；其他一律解密失敗。
 * @param {{ encryptRejects?: boolean, shouldReEncrypt?: boolean }} [options]
 */
function makeFakeSafeStorage({
  encryptRejects = false,
  shouldReEncrypt = false,
} = {}) {
  return {
    isEncryptionAvailable: forbidSync("isEncryptionAvailable"),
    encryptString: forbidSync("encryptString"),
    decryptString: forbidSync("decryptString"),
    encryptStringAsync: async (plaintext) => {
      if (encryptRejects) throw new Error(ENCRYPT_FAILED_MESSAGE);
      return Buffer.from(`ENC:${plaintext}`, "utf8");
    },
    decryptStringAsync: async (buf) => {
      // 真 Electron 對空 Buffer 直接 resolve 空字串（.cc decryptStringAsync 的 ciphertext.empty() 分支）
      if (buf.length === 0) return { shouldReEncrypt: false, result: "" };
      const s = buf.toString("utf8");
      if (s === TEMPORARILY_UNAVAILABLE_CIPHERTEXT) {
        throw new Error(TEMPORARILY_UNAVAILABLE_MESSAGE);
      }
      if (!s.startsWith("ENC:")) throw new Error(DECRYPT_FAILED_MESSAGE);
      return { shouldReEncrypt, result: s.slice(4) };
    },
  };
}

function safeStorageEnvelope(ciphertext) {
  return {
    version: 1,
    method: "safeStorage",
    data: Buffer.from(ciphertext, "utf8").toString("base64"),
  };
}

/** 假 safeStorage 解得開、內容為 plaintext 的 envelope。 */
function encryptedEnvelope(plaintext) {
  return safeStorageEnvelope(`ENC:${plaintext}`);
}

/** 模擬搬機器後解不開的 envelope。 */
const UNDECRYPTABLE_ENVELOPE = safeStorageEnvelope("garbage");

/** 解密時回「暫時不可用」的 envelope。 */
const TEMPORARILY_UNAVAILABLE_ENVELOPE = safeStorageEnvelope(
  TEMPORARILY_UNAVAILABLE_CIPHERTEXT,
);

module.exports = {
  TEMPORARILY_UNAVAILABLE_MESSAGE,
  makeFakeSafeStorage,
  encryptedEnvelope,
  UNDECRYPTABLE_ENVELOPE,
  TEMPORARILY_UNAVAILABLE_ENVELOPE,
};
