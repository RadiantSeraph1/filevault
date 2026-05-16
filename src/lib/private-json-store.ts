import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localPath(key: string) {
  return path.join(LOCAL_DATA_DIR, key.replaceAll("/", path.sep));
}

export async function readPrivateJson<T>(key: string, fallback: T): Promise<T> {
  if (isBlobConfigured()) {
    const result = await get(key, { access: "private" });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return fallback;
    }

    return JSON.parse(await new Response(result.stream).text()) as T;
  }

  try {
    return JSON.parse(await readFile(localPath(key), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writePrivateJson<T>(key: string, value: T) {
  if (isBlobConfigured()) {
    await put(key, JSON.stringify(value, null, 2), {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
    });
    return;
  }

  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(value, null, 2), "utf8");
}
