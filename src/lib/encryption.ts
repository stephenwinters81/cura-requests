import { prisma } from "@/lib/db";

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error("FATAL: FIELD_ENCRYPTION_KEY environment variable is not set. Cannot encrypt PHI.");
}

/**
 * Encrypt a string value using pgcrypto's PGP symmetric encryption.
 * Returns the encrypted value as a hex-encoded string.
 */
export async function encryptField(plaintext: string): Promise<string> {
  const result = await prisma.$queryRawUnsafe<{ encrypted: string }[]>(
    `SELECT encode(pgp_sym_encrypt($1, $2), 'hex') as encrypted`,
    plaintext,
    ENCRYPTION_KEY
  );
  return result[0].encrypted;
}

/**
 * Decrypt a hex-encoded pgcrypto PGP symmetric encrypted value.
 * Returns the original plaintext string.
 */
export async function decryptField(encryptedHex: string): Promise<string> {
  const result = await prisma.$queryRawUnsafe<{ decrypted: string }[]>(
    `SELECT pgp_sym_decrypt(decode($1, 'hex'), $2) as decrypted`,
    encryptedHex,
    ENCRYPTION_KEY
  );
  return result[0].decrypted;
}

/**
 * Encrypt a JSON object by serializing to string first.
 */
export async function encryptJson(data: unknown): Promise<string> {
  return encryptField(JSON.stringify(data));
}

/**
 * Decrypt a hex-encoded value and parse as JSON.
 */
export async function decryptJson<T = unknown>(encryptedHex: string): Promise<T> {
  const decrypted = await decryptField(encryptedHex);
  return JSON.parse(decrypted) as T;
}
