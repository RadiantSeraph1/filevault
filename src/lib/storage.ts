import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { readPrivateJson, writePrivateJson } from "@/lib/private-json-store";
import type { FileComment, StoredFile } from "@/lib/types";

const INDEX_KEY = "file-room/index.json";
const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const LOCAL_UPLOAD_DIR = path.join(LOCAL_DATA_DIR, "uploads");
const LOCAL_INDEX_PATH = path.join(LOCAL_DATA_DIR, "index.json");

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function normalizeExtension(name: string) {
  return path.extname(name).replace(".", "").toLowerCase() || "file";
}

function safeName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

async function readLocalIndex(): Promise<StoredFile[]> {
  try {
    const raw = await readFile(LOCAL_INDEX_PATH, "utf8");
    return JSON.parse(raw) as StoredFile[];
  } catch {
    return [];
  }
}

export async function listStoredFiles() {
  const files = isBlobConfigured()
    ? await readPrivateJson<StoredFile[]>(INDEX_KEY, [])
    : await readLocalIndex();

  return files.sort(
    (left, right) =>
      new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime(),
  );
}

export async function saveStoredFile(file: File) {
  const id = crypto.randomUUID();
  const extension = normalizeExtension(file.name);
  const filename = `${id}-${safeName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  let stored: StoredFile;

  if (isBlobConfigured()) {
    const blob = await put(`file-room/uploads/${filename}`, bytes, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    stored = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      extension,
      url: blob.url,
      storagePath: blob.pathname,
      uploadedAt: new Date().toISOString(),
      comments: [],
    };
  } else {
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const storagePath = path.join(LOCAL_UPLOAD_DIR, filename);
    await writeFile(storagePath, bytes);

    stored = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      extension,
      url: `/api/files/${id}/content`,
      storagePath,
      uploadedAt: new Date().toISOString(),
      comments: [],
    };
  }

  const files = await listStoredFiles();
  await persistFiles([stored, ...files]);
  return stored;
}

export async function findStoredFile(id: string) {
  const files = await listStoredFiles();
  return files.find((file) => file.id === id) ?? null;
}

export async function addFileComment(
  fileId: string,
  input: { author?: string; body?: string },
) {
  const body = input.body?.trim();
  if (!body) {
    throw new Error("Comment text is required.");
  }

  const files = await listStoredFiles();
  const file = files.find((item) => item.id === fileId);

  if (!file) {
    throw new Error("File not found.");
  }

  const comment: FileComment = {
    id: crypto.randomUUID(),
    author: input.author?.trim() || "Anonymous",
    body,
    createdAt: new Date().toISOString(),
  };

  file.comments = [...file.comments, comment];
  await persistFiles(files);

  return comment;
}

export async function readLocalFileBytes(file: StoredFile) {
  if (isBlobConfigured()) {
    return null;
  }

  return readFile(file.storagePath);
}

async function persistFiles(files: StoredFile[]) {
  if (isBlobConfigured()) {
    await writePrivateJson(INDEX_KEY, files);
    return;
  }

  await mkdir(LOCAL_DATA_DIR, { recursive: true });
  await writeFile(LOCAL_INDEX_PATH, JSON.stringify(files, null, 2), "utf8");
}
