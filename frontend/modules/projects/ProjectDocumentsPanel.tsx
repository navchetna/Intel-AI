"use client";

import { useEffect, useRef, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { fetchDocuments, uploadDocument, deleteDocument, documentFileUrl } from "./documents-api";
import type { ProjectDocument } from "./types";
import { timeAgo } from "./format";

type Tab = "documents" | "notes" | "discussions";

const TABS: { key: Tab; label: string }[] = [
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
  { key: "discussions", label: "Discussions" },
];

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function docIcon(contentType: string): string {
  if (contentType === "application/pdf") return "📄";
  if (contentType.includes("word")) return "📝";
  if (contentType.includes("sheet") || contentType.includes("excel")) return "📊";
  if (contentType.startsWith("image/")) return "🖼️";
  return "📎";
}

function PdfViewerModal({ doc, projectId, onClose }: { doc: ProjectDocument; projectId: number; onClose: () => void }) {
  const url = documentFileUrl(projectId, doc.id);
  const isPdf = doc.content_type === "application/pdf";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(1,6,18,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl overflow-hidden"
        style={{ background: "var(--dm-card-bg)", border: "1px solid var(--dm-card-border)", boxShadow: "var(--dm-card-depth)" }}
      >
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "var(--dm-border-a)" }}>
          <span className="text-lg">{docIcon(doc.content_type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--dm-txt-primary)" }}>{doc.title}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--dm-txt-faint)" }}>{doc.filename}</p>
          </div>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 text-xs font-semibold rounded-md px-2.5 py-1.5 transition-colors"
            style={{ color: "var(--dm-txt-secondary)", background: "var(--dm-surface-b)" }}
          >
            Open in new tab
          </a>
          <button
            onClick={onClose} aria-label="Close"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none transition-colors"
            style={{ color: "var(--dm-txt-faint)" }}
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {isPdf ? (
            <iframe src={url} title={doc.title} className="w-full h-full border-0" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <p className="text-sm" style={{ color: "var(--dm-txt-secondary)" }}>Preview isn&rsquo;t available for this file type.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline" style={{ color: "#0071c5" }}>
                Download {doc.filename}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadForm({ onUpload }: { onUpload: (title: string, file: File) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      await onUpload(title.trim() || file.name, file);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = { background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" };

  return (
    <div className="flex flex-wrap items-end gap-2 mb-4">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-muted)" }}>Title</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title"
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={inputStyle}
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-muted)" }}>File</label>
        <input
          ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}
        />
      </div>
      <button
        type="button" onClick={submit} disabled={!file || busy}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-intel-blue hover:bg-intel-dark transition-colors disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
      {error && <p className="basis-full text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Placeholder for everything related to a project beyond its sizing data: document
 *  attachments (fully working — upload, list, click-to-view), plus Notes and
 *  Discussions tabs reserved for later (no auth/multi-user system to build real
 *  threaded discussion against yet). */
export function ProjectDocumentsPanel() {
  const { currentProject } = useProject();
  const [tab, setTab] = useState<Tab>("documents");
  const [docs, setDocs] = useState<ProjectDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ProjectDocument | null>(null);

  const projectId = currentProject?.id ?? null;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setDocs(null);
    setError(null);
    fetchDocuments(projectId)
      .then(rows => { if (!cancelled) setDocs(rows); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleUpload(title: string, file: File) {
    if (!projectId) return;
    const doc = await uploadDocument(projectId, title, file);
    setDocs(prev => [doc, ...(prev ?? [])]);
  }

  async function handleDelete(doc: ProjectDocument) {
    if (!projectId) return;
    await deleteDocument(projectId, doc.id);
    setDocs(prev => (prev ?? []).filter(d => d.id !== doc.id));
    if (viewing?.id === doc.id) setViewing(null);
  }

  if (!projectId) return null;

  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-lg font-bold tracking-tight" style={{ color: "var(--dm-txt-primary)" }}>Documents, Notes &amp; Discussions</h2>
        <span className="text-[12px]" style={{ color: "var(--dm-txt-faint)" }}>Everything related to this project, in one place</span>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
        <div className="flex gap-1 mb-4 border-b" style={{ borderColor: "var(--dm-border-a)" }}>
          {TABS.map(t => (
            <button
              key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                color: tab === t.key ? "#0071c5" : "var(--dm-txt-faint)",
                borderBottom: tab === t.key ? "2px solid #0071c5" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "documents" && (
          <div>
            <UploadForm onUpload={handleUpload} />
            {error && <p className="text-xs text-danger mb-3">{error}</p>}
            {docs === null ? (
              <p className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>Loading documents…</p>
            ) : docs.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>No documents yet — upload one above.</p>
            ) : (
              <ul>
                {docs.map(doc => (
                  <li key={doc.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                    <button type="button" onClick={() => setViewing(doc)} className="group flex-1 min-w-0 flex items-center gap-3 text-left">
                      <span className="text-xl flex-shrink-0">{docIcon(doc.content_type)}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold truncate group-hover:underline" style={{ color: "var(--dm-txt-primary)" }}>{doc.title}</span>
                        <span className="block text-[11px] truncate" style={{ color: "var(--dm-txt-faint)" }}>
                          {doc.filename} · {fmtBytes(doc.size_bytes)} · {timeAgo(doc.created_at)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button" onClick={() => handleDelete(doc)} aria-label={`Delete ${doc.title}`}
                      className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors hover:text-danger"
                      style={{ color: "var(--dm-txt-faint)" }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="rounded-xl border border-dashed py-14 text-center" style={{ borderColor: "var(--dm-border-b)" }}>
            <p className="text-sm" style={{ color: "var(--dm-txt-muted)" }}>Notes are coming soon.</p>
          </div>
        )}

        {tab === "discussions" && (
          <div className="rounded-xl border border-dashed py-14 text-center" style={{ borderColor: "var(--dm-border-b)" }}>
            <p className="text-sm" style={{ color: "var(--dm-txt-muted)" }}>Discussions are coming soon.</p>
          </div>
        )}
      </div>

      {viewing && <PdfViewerModal doc={viewing} projectId={projectId} onClose={() => setViewing(null)} />}
    </section>
  );
}
