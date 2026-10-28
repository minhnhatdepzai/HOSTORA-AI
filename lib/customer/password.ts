import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyCustomerPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex, extra] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex || extra) return false;
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(actual, expected);
}

export async function consumeDummyPasswordCheck(password: string) {
  await scrypt(password, "hostora-customer-auth-dummy", KEY_LENGTH);
}
