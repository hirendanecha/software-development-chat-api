const crypto = require("crypto");
const environment = require("../environments/environment");

exports.Encrypt = (strToEncrypt) => {
  try {
    const encryptionKey = environment.EncryptionKey;

    const clearBytes = Buffer.from(strToEncrypt.trim(), "utf16le");
    const salt = Buffer.from([
      0x49, 0x76, 0x61, 0x6e, 0x20, 0x4d, 0x65, 0x64, 0x76, 0x65, 0x64, 0x65,
      0x76,
    ]);

    const key = crypto.pbkdf2Sync(encryptionKey, salt, 10000, 32, "sha1");
    const iv = crypto.pbkdf2Sync(encryptionKey, salt, 10000, 16, "sha1");

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(clearBytes, "utf16le", "base64");
    encrypted += cipher.final("base64");

    return encrypted;
  } catch (error) {
    console.log(error);
  }
};

exports.Decrypt = (strToDecrypt) => {
  try {
    const encryptionKey = environment.EncryptionKey;
    // strToDecrypt = strToDecrypt.trim().replace(/\s/g, "+");
    const cipherBytes = Buffer.from(strToDecrypt.trim(), "base64");

    const salt = Buffer.from([
      0x49, 0x76, 0x61, 0x6e, 0x20, 0x4d, 0x65, 0x64, 0x76, 0x65, 0x64, 0x65,
      0x76,
    ]);

    const key = crypto.pbkdf2Sync(encryptionKey, salt, 10000, 32, "sha1");
    const iv = crypto.pbkdf2Sync(encryptionKey, salt, 10000, 16, "sha1");

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(cipherBytes, "binary", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.log(error);
  }
};
