import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import crypto from "node:crypto";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const ENCRYPTION_VERSION = "v1";

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localPath(key: string) {
  return path.join(LOCAL_DATA_DIR, key.replaceAll("/", path.sep));
}

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

function encryptJson<T>(value: T) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    version: ENCRYPTION_VERSION,
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    data: ciphertext.toString("base64url"),
  });
}

function decryptJson<T>(raw: string): T {
  const envelope = JSON.parse(raw) as {
    version: string;
    iv: string;
    tag: string;
    data: string;
  };

  if (envelope.version !== ENCRYPTION_VERSION) {
    throw new Error("Unsupported encrypted data version.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(envelope.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64url")),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as T;
}

export async function readPrivateJson<T>(key: string, fallback: T): Promise<T> {
  if (isBlobConfigured()) {
    const result = await get(key, { access: "public" });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return fallback;
    }

    return decryptJson<T>(await new Response(result.stream).text());
  }

  try {
    return JSON.parse(await readFile(localPath(key), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writePrivateJson<T>(key: string, value: T) {
  if (isBlobConfigured()) {
    await put(key, encryptJson(value), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });
    return;
  }

  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(value, null, 2), "utf8");
}
