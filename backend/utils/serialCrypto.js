const crypto = require('crypto');
const ENCRYPTION_KEY = Buffer.from(process.env.SERIAL_ENCRYPT_KEY, 'hex'); // 32 bytes hex string
const HASH_SECRET = process.env.SERIAL_HASH_KEY;
const IV_LENGTH = 16; // AES block size

function encryptSerial(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptSerial(encryptedText) {
  const [ivHex, tagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function hashSerial(plainText) {
  return crypto.createHmac('sha256', HASH_SECRET).update(plainText).digest('hex');
}

module.exports = { encryptSerial, decryptSerial, hashSerial };
