"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileArchive,
  FileText,
  Folder,
  Image as ImageIcon,
  Maximize2,
  X,
  Presentation,
  Search,
  Upload,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LogoutButton } from "@/components/logout-button";
import type { StoredFile } from "@/lib/types";

type FilesResponse = {
  files: StoredFile[];
};

const previewableTextExtensions = new Set(["md", "markdown", "txt", "csv", "json", "log"]);
const officeDocExtensions = new Set(["docx"]);
const presentationExtensions = new Set(["ppt", "pptx"]);
const REFRESH_INTERVAL_MS = 5000;
const categories = [
  { id: "all", label: "All files" },
  { id: "documents", label: "Documents" },
  { id: "presentations", label: "Presentations" },
  { id: "images", label: "Images" },
  { id: "other", label: "Other" },
] as const;

type FileCategory = (typeof categories)[number]["id"];

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}

function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function fileIcon(file: StoredFile) {
  if (presentationExtensions.has(file.extension)) return Presentation;
  if (file.type.startsWith("image/")) return ImageIcon;
  if (previewableTextExtensions.has(file.extension) || officeDocExtensions.has(file.extension)) return FileText;
  return FileArchive;
}

function fileCategory(file: StoredFile): FileCategory {
  if (presentationExtensions.has(file.extension)) return "presentations";
  if (file.type.startsWith("image/")) return "images";
  if (
    previewableTextExtensions.has(file.extension) ||
    officeDocExtensions.has(file.extension) ||
    file.type === "application/pdf"
  ) {
    return "documents";
  }
  return "other";
}

export function FileRoom({
  initialFiles,
  session,
}: {
  initialFiles: StoredFile[];
  session: { email: string; role: "owner" | "member" };
}) {
  const [files, setFiles] = useState<StoredFile[]>(initialFiles);
  const [selectedId, setSelectedId] = useState<string | null>(initialFiles[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FileCategory>("all");
  const [fullScreenId, setFullScreenId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshSequence = useRef(0);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? files[0] ?? null,
    [files, selectedId],
  );

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return files.filter((file) => {
      const matchesCategory = category === "all" || fileCategory(file) === category;
      const matchesQuery =
        !normalizedQuery ||
        file.name.toLowerCase().includes(normalizedQuery) ||
        file.extension.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, files, query]);

  const fullScreenFile = useMemo(
    () => files.find((file) => file.id === fullScreenId) ?? null,
    [files, fullScreenId],
  );

  const loadFiles = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const sequence = ++refreshSequence.current;

    try {
      const response = await fetch("/api/files", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load files.");
      const payload = (await response.json()) as FilesResponse;

      if (sequence !== refreshSequence.current) {
        return;
      }

      setFiles(payload.files);
      setSelectedId((current) => {
        if (!payload.files.length) return null;
        if (current && payload.files.some((file) => file.id === current)) {
          return current;
        }
        return payload.files[0].id;
      });

      if (silent) {
        setError(null);
      }
    } catch (loadError) {
      if (!silent) {
        setError(loadError instanceof Error ? loadError.message : "Could not load files.");
      }
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadFiles({ silent: true });
      }
    }, REFRESH_INTERVAL_MS);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadFiles({ silent: true });
      }
    }

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadFiles]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFullScreenId(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  async function uploadFile(formData: FormData) {
    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      await loadFiles();
      setSelectedId(payload.file.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#1d2328]">
      <header className="border-b border-[#d9ded6] bg-[#fbfbf8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#597368]">File Vault</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#111816] sm:text-3xl md:text-4xl">
              Read-only document storage
            </h1>
            <p className="mt-2 break-words text-sm text-[#66736c]">
              Signed in as {session.email}
              {session.role === "owner" ? " - owner" : ""}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto">
            <UploadPanel isUploading={isUploading} onUpload={uploadFile} />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              {session.role === "owner" ? (
                <a
                  className="inline-flex h-10 items-center justify-center rounded-sm border border-[#cfd7cf] px-3 text-sm font-semibold text-[#173f35] transition hover:bg-[#f1f5ef]"
                  href="/admin"
                >
                  Admin
                </a>
              ) : null}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-5 sm:py-5 xl:grid-cols-[220px_minmax(0,1fr)_380px]">
        <aside className="min-w-0 border border-[#d9ded6] bg-white">
          <div className="flex h-14 items-center gap-2 border-b border-[#e4e7df] px-4">
            <Folder size={17} className="text-[#597368]" />
            <span className="text-sm font-semibold text-[#2d3631]">Vault</span>
          </div>
          <FolderRail
            active={category}
            files={files}
            onSelect={setCategory}
          />
        </aside>

        <section className="min-h-[420px] min-w-0 border border-[#d9ded6] bg-white xl:min-h-[720px]">
          <div className="flex flex-col gap-3 border-b border-[#e4e7df] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111816]">Files</h2>
              <p className="mt-1 text-xs text-[#66736c]">
                {visibleFiles.length} shown from {files.length} total
              </p>
            </div>
            <label className="relative block w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736c]" size={16} />
              <input
                className="h-10 w-full border border-[#cfd7cf] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#173f35]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files"
                value={query}
              />
            </label>
          </div>
          {error ? <div className="border-b border-[#edd0c8] bg-[#fff4ef] px-4 py-3 text-sm text-[#8c3c26]">{error}</div> : null}
          <FileBrowserTable
            files={visibleFiles}
            selectedId={selectedFile?.id ?? null}
            onOpen={setFullScreenId}
            onSelect={setSelectedId}
          />
        </section>

        <aside className="min-h-[420px] min-w-0 border border-[#d9ded6] bg-white xl:min-h-[720px]">
          {selectedFile ? (
            <FileInspector
              file={selectedFile}
              onCommentSaved={() => loadFiles()}
              onOpen={() => setFullScreenId(selectedFile.id)}
            />
          ) : (
            <EmptyWorkspace />
          )}
        </aside>
      </main>
      {fullScreenFile ? (
        <FullScreenViewer
          file={fullScreenFile}
          onClose={() => setFullScreenId(null)}
          onCommentSaved={() => loadFiles()}
        />
      ) : null}
    </div>
  );
}

function UploadPanel({
  isUploading,
  onUpload,
}: {
  isUploading: boolean;
  onUpload: (formData: FormData) => Promise<void>;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await onUpload(formData);
    form.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full gap-2 rounded-md border border-[#cfd7cf] bg-white p-2 sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_auto]">
      <input
        className="min-w-0 rounded-sm border border-[#dfe4dc] px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-[#173f35] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        name="file"
        type="file"
        required
        accept=".doc,.docx,.ppt,.pptx,.md,.markdown,.txt,.pdf,.png,.jpg,.jpeg,.csv,.json"
      />
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#173f35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f2d26] disabled:cursor-not-allowed disabled:bg-[#8aa197]"
        type="submit"
        disabled={isUploading}
      >
        <Upload size={17} />
        {isUploading ? "Uploading" : "Upload"}
      </button>
    </form>
  );
}

function FolderRail({
  active,
  files,
  onSelect,
}: {
  active: FileCategory;
  files: StoredFile[];
  onSelect: (category: FileCategory) => void;
}) {
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto p-2 xl:block xl:space-y-0 xl:overflow-visible">
      {categories.map((item) => {
        const count =
          item.id === "all"
            ? files.length
            : files.filter((file) => fileCategory(file) === item.id).length;
        const isActive = active === item.id;

        return (
          <button
            className={`flex h-10 min-w-[150px] items-center justify-between gap-3 rounded-sm px-3 text-left text-sm transition xl:w-full ${
              isActive ? "bg-[#eaf1ec] font-semibold text-[#173f35]" : "text-[#36413b] hover:bg-[#f7f8f3]"
            }`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Folder size={15} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-mono text-xs text-[#66736c]">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function FileBrowserTable({
  files,
  selectedId,
  onOpen,
  onSelect,
}: {
  files: StoredFile[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  if (files.length === 0) {
    return <div className="p-6 text-sm text-[#66736c]">No files match this view.</div>;
  }

  return (
    <>
      <div className="divide-y divide-[#edf0e9] md:hidden">
        {files.map((file) => {
          const Icon = fileIcon(file);
          const isSelected = selectedId === file.id;

          return (
            <button
              className={`grid w-full grid-cols-[40px_minmax(0,1fr)] gap-3 px-4 py-3 text-left transition ${
                isSelected ? "bg-[#eaf1ec]" : "hover:bg-[#f7f8f3]"
              }`}
              key={file.id}
              onClick={() => {
                onSelect(file.id);
                onOpen(file.id);
              }}
              type="button"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#dfe7e3] text-[#173f35]">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[#1d2328]">{file.name}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#66736c]">
                  <span>{file.extension.toUpperCase()}</span>
                  <span>{formatBytes(file.size)}</span>
                  <span>{formatTimestamp(file.uploadedAt)}</span>
                  <span>{file.comments.length} comments</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#edf0e9] text-left text-xs uppercase tracking-[0.12em] text-[#66736c]">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Size</th>
            <th className="px-4 py-3 font-semibold">Modified</th>
            <th className="px-4 py-3 text-right font-semibold">Comments</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const Icon = fileIcon(file);
            const isSelected = selectedId === file.id;

            return (
              <tr
                className={`cursor-pointer border-b border-[#edf0e9] transition ${
                  isSelected ? "bg-[#eaf1ec]" : "hover:bg-[#f7f8f3]"
                }`}
                key={file.id}
                onDoubleClick={() => onOpen(file.id)}
                onClick={() => onSelect(file.id)}
              >
                <td className="px-4 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#dfe7e3] text-[#173f35]">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#1d2328]">{file.name}</span>
                      <span className="mt-0.5 block text-xs text-[#66736c]">{fileCategory(file)}</span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#66736c]">{file.extension.toUpperCase()}</td>
                <td className="px-4 py-3 text-[#36413b]">{formatBytes(file.size)}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#66736c]">{formatTimestamp(file.uploadedAt)}</td>
                <td className="px-4 py-3 text-right text-[#36413b]">{file.comments.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

function FileInspector({
  file,
  onCommentSaved,
  onOpen,
}: {
  file: StoredFile;
  onCommentSaved: () => Promise<void>;
  onOpen: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col xl:min-h-[720px]">
      <div className="border-b border-[#e4e7df]">
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[#111816]">{file.name}</h2>
            <p className="mt-1 text-xs text-[#66736c]">
              Uploaded {formatTimestamp(file.uploadedAt)} UTC - {formatBytes(file.size)}
            </p>
          </div>
          <button
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-sm border border-[#cfd7cf] px-3 text-sm font-semibold text-[#173f35] transition hover:bg-[#f1f5ef]"
            onClick={onOpen}
            type="button"
          >
            <Maximize2 size={16} />
            Open full screen
          </button>
        </div>
      </div>
      <div className="max-h-[300px] overflow-auto border-b border-[#e4e7df] xl:max-h-[360px]">
        <DocumentPreview key={file.id} file={file} compact />
      </div>
      <CommentPanel file={file} onCommentSaved={onCommentSaved} />
    </div>
  );
}

function FullScreenViewer({
  file,
  onClose,
  onCommentSaved,
}: {
  file: StoredFile;
  onClose: () => void;
  onCommentSaved: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f7f7f2] text-[#1d2328]">
      <header className="flex min-h-16 flex-col gap-3 border-b border-[#d9ded6] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#597368]">File preview</p>
          <h2 className="truncate text-xl font-semibold text-[#111816]">{file.name}</h2>
          <p className="mt-1 text-xs text-[#66736c]">
            {file.extension.toUpperCase()} - {formatBytes(file.size)} - uploaded {formatTimestamp(file.uploadedAt)} UTC
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[#cfd7cf] px-3 text-sm font-semibold text-[#173f35] transition hover:bg-[#f1f5ef]"
            href={file.url}
            rel="noreferrer"
            target="_blank"
          >
            <Download size={16} />
            Original
          </a>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#173f35] px-3 text-sm font-semibold text-white transition hover:bg-[#0f2d26]"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
            Close
          </button>
        </div>
      </header>
      <main className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-0 overflow-auto bg-white">
          <DocumentPreview key={file.id} file={file} fullScreen />
        </section>
        <aside className="min-h-[360px] border-t border-[#d9ded6] bg-white lg:min-h-0 lg:border-l lg:border-t-0">
          <CommentPanel file={file} onCommentSaved={onCommentSaved} />
        </aside>
      </main>
    </div>
  );
}

function DocumentPreview({
  file,
  compact = false,
  fullScreen = false,
}: {
  file: StoredFile;
  compact?: boolean;
  fullScreen?: boolean;
}) {
  const [content, setContent] = useState<string>("");
  const [status, setStatus] = useState<string>("Loading preview...");

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      try {
        if (previewableTextExtensions.has(file.extension)) {
          const response = await fetch(file.url);
          const text = await response.text();
          if (isMounted) setContent(text);
          return;
        }

        if (officeDocExtensions.has(file.extension)) {
          const mammoth = await import("mammoth/mammoth.browser");
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (isMounted) setContent(result.value);
          return;
        }

        if (isMounted) setStatus("No inline renderer is available for this format.");
      } catch {
        if (isMounted) setStatus("Preview failed. Open the original file instead.");
      }
    }

    loadPreview();
    return () => {
      isMounted = false;
    };
  }, [file]);

  if (presentationExtensions.has(file.extension)) {
    if (file.url.startsWith("http")) {
      return (
        <iframe
          className={`${fullScreen ? "h-[70vh] lg:h-[calc(100vh-5rem)]" : "h-[650px]"} w-full bg-[#f8faf7]`}
          title={file.name}
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
        />
      );
    }

    return <PreviewMessage compact={compact} message="PowerPoint previews need a public Vercel Blob URL. Local files can still be opened from the original link." />;
  }

  if (file.type.startsWith("image/")) {
    return (
      <div className={`flex items-center justify-center bg-[#f8faf7] p-4 sm:p-6 ${fullScreen ? "min-h-[70vh] lg:min-h-[calc(100vh-5rem)]" : compact ? "min-h-[280px] sm:min-h-[320px]" : "min-h-[650px]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${fullScreen ? "max-h-[65vh] lg:max-h-[calc(100vh-8rem)]" : "max-h-[610px]"} max-w-full border border-[#e4e7df] bg-white object-contain`} src={file.url} alt={file.name} />
      </div>
    );
  }

  if (file.type === "application/pdf") {
    return <iframe className={`${fullScreen ? "h-[70vh] lg:h-[calc(100vh-5rem)]" : compact ? "h-[320px]" : "h-[650px]"} w-full bg-[#f8faf7]`} title={file.name} src={file.url} />;
  }

  if (!content) {
    return <PreviewMessage compact={compact} message={status} />;
  }

  if (officeDocExtensions.has(file.extension)) {
    return (
      <article
        className={`document-body ${fullScreen ? "mx-auto max-w-5xl px-4 py-5 sm:px-8 lg:px-10 lg:py-8" : compact ? "px-4 py-4 text-sm" : "px-6 py-5"}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  if (file.extension === "json") {
    return <pre className={`m-0 overflow-auto bg-[#f8faf7] p-4 font-mono text-sm text-[#24302a] sm:p-5 ${fullScreen ? "min-h-[70vh] lg:min-h-[calc(100vh-5rem)]" : compact ? "min-h-[320px]" : "min-h-[650px]"}`}>{content}</pre>;
  }

  return (
    <article className={`document-body ${fullScreen ? "mx-auto max-w-5xl px-4 py-5 sm:px-8 lg:px-10 lg:py-8" : compact ? "px-4 py-4 text-sm" : "px-6 py-5"}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}

function PreviewMessage({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center bg-[#f8faf7] px-6 text-center text-sm text-[#66736c] ${compact ? "min-h-[280px] sm:min-h-[320px]" : "min-h-[650px]"}`}>
      {message}
    </div>
  );
}

function CommentPanel({ file, onCommentSaved }: { file: StoredFile; onCommentSaved: () => Promise<void> }) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/files/${file.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, body }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Comment could not be saved.");
      }

      setBody("");
      await onCommentSaved();
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Comment could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="flex min-h-[360px] flex-col">
      <div className="border-b border-[#e4e7df] px-4 py-4">
        <h3 className="text-sm font-semibold text-[#111816]">Comments</h3>
        <p className="mt-1 text-xs text-[#66736c]">Read-only files, review-only discussion.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {file.comments.length === 0 ? (
          <p className="text-sm text-[#66736c]">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {file.comments.map((comment) => (
              <div key={comment.id} className="border border-[#e3e7df] bg-[#fbfbf8] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-[#1d2328]">{comment.author}</span>
                  <span className="shrink-0 font-mono text-[11px] text-[#66736c]">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#36413b]">{comment.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={submitComment} className="border-t border-[#e4e7df] p-4">
        <input
          className="mb-2 h-10 w-full border border-[#cfd7cf] px-3 text-sm outline-none focus:border-[#173f35]"
          placeholder="Name"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        />
        <textarea
          className="min-h-24 w-full resize-y border border-[#cfd7cf] px-3 py-2 text-sm outline-none focus:border-[#173f35]"
          placeholder="Add a comment"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />
        {error ? <p className="mt-2 text-sm text-[#8c3c26]">{error}</p> : null}
        <button
          className="mt-3 h-10 w-full rounded-sm bg-[#c75832] text-sm font-semibold text-white transition hover:bg-[#9f4226] disabled:cursor-not-allowed disabled:bg-[#d6a997]"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Saving" : "Add comment"}
        </button>
      </form>
    </aside>
  );
}

function EmptyWorkspace() {
  return (
    <div className="flex min-h-[420px] items-center justify-center bg-[#f8faf7] px-6 text-center xl:min-h-[720px]">
      <div>
        <FileText className="mx-auto text-[#597368]" size={34} />
        <p className="mt-3 text-sm text-[#66736c]">
          Upload a file to preview it and collect comments.
        </p>
      </div>
    </div>
  );
}
