/**
 * Cryptographically secure random password generation and CSV formula sanitization utilities.
 */

/**
 * Generates a cryptographically strong temporary password using Web Crypto API.
 */
export function generateSecureTemporaryPassword(length: number = 14): string {
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "23456789";
  const symbols = "!@#$%&*";
  const allChars = lowercase + uppercase + numbers + symbols;

  const array = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for Node environments
    const nodeCrypto = require("crypto");
    const buffer = nodeCrypto.randomBytes(length * 4);
    for (let i = 0; i < length; i++) {
      array[i] = buffer.readUInt32LE(i * 4);
    }
  }

  // Ensure at least one from each character set
  const pass = [
    lowercase[array[0] % lowercase.length],
    uppercase[array[1] % uppercase.length],
    numbers[array[2] % numbers.length],
    symbols[array[3] % symbols.length],
  ];

  for (let i = 4; i < length; i++) {
    pass.push(allChars[array[i] % allChars.length]);
  }

  // Shuffle the password characters using Fisher-Yates and cryptographic values
  for (let i = pass.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [pass[i], pass[j]] = [pass[j], pass[i]];
  }

  return pass.join("");
}

/**
 * Escapes a cell value to prevent CSV Formula Injection (CWE-1236).
 * Prepends a single quote if the value starts with '=', '+', '-', '@', '\t', or '\r'.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Check for dangerous formula starters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes
  return `"${str.replace(/"/g, '""')}"`;
}
