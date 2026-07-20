import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // sem 0/o/1/l/i — evita ambiguidade visual

export function generateShortCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
