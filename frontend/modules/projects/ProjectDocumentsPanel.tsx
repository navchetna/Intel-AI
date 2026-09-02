"use client";

import { useEffect, useRef, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { fetchDocuments, uploadDocument, deleteDocument, documentFileUrl } from "./documents-api";
import { fetchNotes, createNote, updateNote, deleteNote } from "./notes-api";
import { fetchDiscussionMessages, postDiscussionMessage, deleteDiscussionMessage } from "./discussions-api";
import type { ProjectDocument, ProjectNote, ProjectDiscussionMessage } from "./types";
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

const textAreaStyle: React.CSSProperties = {
  background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)",
};

function NoteCard({ note, onSave, onDelete }: {
  note: ProjectNote; onSave: (patch: { title?: string; body?: string }) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    try {
      await onSave({ title: title.trim() || note.title, body });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-3" style={{ borderTop: "1px solid var(--dm-border-a)" }}>
      {editing ? (
        <div className="space-y-2">
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none" style={textAreaStyle}
          />
          <textarea
            value={body} onChange={e => setBody(e.target.value)} rows={3}
            className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none" style={textAreaStyle}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button" onClick={save} disabled={busy}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white bg-intel-blue hover:bg-intel-dark transition-colors disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button" onClick={() => { setEditing(false); setTitle(note.title); setBody(note.body); }}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ color: "var(--dm-txt-secondary)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => setEditing(true)} className="group flex-1 min-w-0 text-left">
            <span className="block text-sm font-semibold group-hover:underline" style={{ color: "var(--dm-txt-primary)" }}>{note.title}</span>
            {note.body && <span className="block text-[13px] mt-1 whitespace-pre-wrap" style={{ color: "var(--dm-txt-secondary)" }}>{note.body}</span>}
            <span className="block text-[11px] mt-1" style={{ color: "var(--dm-txt-faint)" }}>Updated {timeAgo(note.updated_at)}</span>
          </button>
          <button
            type="button" onClick={onDelete} aria-label={`Delete ${note.title}`}
            className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors hover:text-danger"
            style={{ color: "var(--dm-txt-faint)" }}
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}

function NotesTab({ projectId }: { projectId: number }) {
  const [notes, setNotes] = useState<ProjectNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNotes(null); setError(null);
    fetchNotes(projectId)
      .then(rows => { if (!cancelled) setNotes(rows); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleAdd() {
    const t = title.trim();
    if (!t) return;
    setBusy(true); setError(null);
    try {
      const note = await createNote(projectId, t, body);
      setNotes(prev => [note, ...(prev ?? [])]);
      setTitle(""); setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(note: ProjectNote, patch: { title?: string; body?: string }) {
    const saved = await updateNote(projectId, note.id, patch);
    setNotes(prev => (prev ?? []).map(n => n.id === note.id ? saved : n));
  }

  async function handleDelete(note: ProjectNote) {
    await deleteNote(projectId, note.id);
    setNotes(prev => (prev ?? []).filter(n => n.id !== note.id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-muted)" }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={textAreaStyle} />
        </div>
        <button
          type="button" onClick={handleAdd} disabled={!title.trim() || busy}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-intel-blue hover:bg-intel-dark transition-colors disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add note"}
        </button>
        <textarea
          value={body} onChange={e => setBody(e.target.value)} placeholder="Note body (optional)" rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={textAreaStyle}
        />
      </div>
      {error && <p className="text-xs text-danger mb-3">{error}</p>}
      {notes === null ? (
        <p className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>No notes yet — add one above.</p>
      ) : (
        <ul>
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onSave={patch => handleSave(note, patch)} onDelete={() => handleDelete(note)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DiscussionsTab({ projectId }: { projectId: number }) {
  const [messages, setMessages] = useState<ProjectDiscussionMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMessages(null); setError(null);
    fetchDiscussionMessages(projectId)
      .then(rows => { if (!cancelled) setMessages(rows); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handlePost() {
    const a = author.trim(), m = message.trim();
    if (!a || !m) return;
    setBusy(true); setError(null);
    try {
      const row = await postDiscussionMessage(projectId, a, m);
      setMessages(prev => [...(prev ?? []), row]);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: ProjectDiscussionMessage) {
    await deleteDiscussionMessage(projectId, row.id);
    setMessages(prev => (prev ?? []).filter(m => m.id !== row.id));
  }

  return (
    <div>
      {error && <p className="text-xs text-danger mb-3">{error}</p>}
      <div className="mb-4 max-h-80 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--dm-border-a)" }}>
        {messages === null ? (
          <p className="text-xs p-3" style={{ color: "var(--dm-txt-faint)" }}>Loading discussion…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs p-3" style={{ color: "var(--dm-txt-faint)" }}>No messages yet — start the discussion below.</p>
        ) : (
          <ul>
            {messages.map(row => (
              <li key={row.id} className="flex items-start gap-3 px-3 py-2.5" style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{row.author}</span>
                  <span className="text-[11px] ml-2" style={{ color: "var(--dm-txt-faint)" }}>{timeAgo(row.created_at)}</span>
                  <p className="text-[13px] mt-0.5 whitespace-pre-wrap" style={{ color: "var(--dm-txt-secondary)" }}>{row.message}</p>
                </div>
                <button
                  type="button" onClick={() => handleDelete(row)} aria-label="Delete message"
                  className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sm transition-colors hover:text-danger"
                  style={{ color: "var(--dm-txt-faint)" }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-muted)" }}>Name</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={textAreaStyle} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-muted)" }}>Message</label>
          <input
            value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handlePost(); }}
            placeholder="Add to the discussion" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={textAreaStyle}
          />
        </div>
        <button
          type="button" onClick={handlePost} disabled={!author.trim() || !message.trim() || busy}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-intel-blue hover:bg-intel-dark transition-colors disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

/** Everything related to a project beyond its sizing data: document attachments, free-text
 *  notes, and a flat discussion log — the three sources the Implementation Workflow extractor
 *  reads from (see the "Extract" button on a business process's Implementation Workflow tab). */
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

        {tab === "notes" && <NotesTab projectId={projectId} />}

        {tab === "discussions" && <DiscussionsTab projectId={projectId} />}
      </div>

      {viewing && <PdfViewerModal doc={viewing} projectId={projectId} onClose={() => setViewing(null)} />}
    </section>
  );
}
