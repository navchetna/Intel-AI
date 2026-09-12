"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/ProjectContext";
import { useSidebarForceCollapsed } from "@/contexts/SidebarCollapseContext";
import { buildProjectTree, allFolderPaths, type ProjectTreeNode, type ProjectTreeFolder } from "@/modules/projects/tree";
import { timeAgo } from "@/modules/projects/format";

const COLLAPSE_KEY = "intel-ai-project-sidebar-collapsed";

function FolderTreeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
    </svg>
  );
}

function TreeNodeRow({ node, depth, expanded, onToggleFolder, currentId, onDelete }: {
  node: ProjectTreeNode; depth: number;
  expanded: Set<string>; onToggleFolder: (path: string) => void; currentId: number | null;
  onDelete: (id: number, name: string) => void;
}) {
  const padLeft = 10 + depth * 14;

  if (node.type === "folder") {
    const isOpen = expanded.has(node.path);
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          aria-expanded={isOpen}
          className="nav-menu-item w-full flex items-center gap-1.5 py-1.5 pr-3 text-left text-[12.5px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40"
          style={{ paddingLeft: padLeft, color: "var(--dm-txt-secondary)" }}
        >
          <span
            className="inline-block text-[9px] flex-shrink-0 transition-transform"
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", color: "var(--dm-txt-muted)" }}
          >
            ▶
          </span>
          <span className="truncate font-semibold">{node.name}</span>
        </button>
        {isOpen && node.children.map(c => (
          <TreeNodeRow
            key={c.type === "folder" ? c.path : c.project.id}
            node={c} depth={depth + 1} expanded={expanded} onToggleFolder={onToggleFolder} currentId={currentId}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  const active = node.project.id === currentId;
  return (
    <div
      className="nav-menu-item group flex items-center gap-1.5 py-1.5 pr-2 text-[12.5px] transition-colors"
      style={{
        background: active ? "var(--dm-nav-active-bg)" : undefined,
        color: active ? "var(--dm-nav-active-text)" : "var(--dm-txt-secondary)",
      }}
    >
      <Link
        href={`/projects/${node.project.id}`}
        className="flex items-center gap-1.5 flex-1 min-w-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40"
        style={{ paddingLeft: padLeft + 14 }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: active ? "#22c55e" : "transparent", border: active ? "none" : "1px solid var(--dm-border-b)" }}
        />
        <span className="truncate flex-1 min-w-0 font-medium">{node.name}</span>
        <span className="text-[10px] flex-shrink-0" style={{ color: "var(--dm-txt-faint)" }}>{timeAgo(node.project.updated_at)}</span>
      </Link>
      <button
        type="button"
        onClick={() => onDelete(node.project.id, node.name)}
        aria-label={`Delete ${node.name}`} title="Delete project"
        className="nav-icon-btn flex-shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function ProjectSidebar() {
  const { projects, currentProject, projectsLoading, listError, createProject, deleteProject } = useProject();
  const router = useRouter();
  const forceCollapsed = useSidebarForceCollapsed();
  const [manualCollapsed, setCollapsed] = useState(false);
  const collapsed = manualCollapsed || forceCollapsed;
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tree = useMemo(() => buildProjectTree(projects), [projects]);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(COLLAPSE_KEY, manualCollapsed ? "1" : "0");
  }, [manualCollapsed, hydrated]);

  // Default-expand every folder the first time it appears, without clobbering user collapses afterward.
  useEffect(() => {
    const all = allFolderPaths(tree);
    if (all.length === 0) return;
    setExpanded(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const p of all) if (!next.has(p)) { next.add(p); changed = true; }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  function toggleFolder(path: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setErr(null);
    try {
      const wasCurrent = currentProject?.id === id;
      await deleteProject(id);
      if (wasCurrent) router.push("/projects");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true); setErr(null);
    try {
      await createProject(name);
      setNewName(""); setCreating(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 w-11 border-r flex flex-col items-center pt-3 gap-3"
        style={{ borderColor: "var(--dm-nav-border)", background: "var(--dm-nav-bg)" }}
      >
        <button
          type="button" onClick={() => setCollapsed(false)}
          aria-label="Expand projects sidebar" title="Projects"
          className="nav-icon-btn w-8 h-8 flex items-center justify-center rounded-md transition-colors"
        >
          <FolderTreeIcon />
        </button>
        {currentProject && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0" title={currentProject.name} />
        )}
      </div>
    );
  }

  return (
    <aside
      className="flex-shrink-0 w-64 border-r flex flex-col"
      style={{ borderColor: "var(--dm-nav-border)", background: "var(--dm-nav-bg)" }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "var(--dm-nav-border)" }}>
        <div className="flex items-center gap-2 min-w-0" style={{ color: "var(--dm-nav-text)" }}>
          <FolderTreeIcon />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-nav-text-dim)" }}>Projects</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button" onClick={() => setCreating(v => !v)}
            aria-label="New project" title="New project"
            className="nav-icon-btn w-6 h-6 flex items-center justify-center rounded transition-colors text-base leading-none"
          >
            +
          </button>
          <button
            type="button" onClick={() => setCollapsed(true)}
            aria-label="Collapse projects sidebar" title="Collapse"
            className="nav-icon-btn w-6 h-6 flex items-center justify-center rounded transition-colors text-xs"
          >
            «
          </button>
        </div>
      </div>

      {creating && (
        <div className="px-3 py-2 border-b flex gap-1.5" style={{ borderColor: "var(--dm-nav-border)" }}>
          <input
            autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder="e.g. Retail Bank/Fraud Model"
            className="flex-1 min-w-0 rounded-md border px-2 py-1.5 text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            style={{ borderColor: "var(--dm-input-border)", background: "var(--dm-input-bg)", color: "var(--dm-input-color)" }}
          />
          <button
            type="button" onClick={handleCreate} disabled={busy || !newName.trim()}
            className="flex-shrink-0 rounded-md bg-intel-blue px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
          >
            Add
          </button>
        </div>
      )}
      {err && <p className="px-3 pt-1.5 text-[11px] text-danger">{err}</p>}
      {!creating && (
        <p className="px-3 pt-1.5 text-[10px]" style={{ color: "var(--dm-txt-faint)" }}>
          Use &ldquo;/&rdquo; in a name to nest it in a folder.
        </p>
      )}

      <div className="flex-1 overflow-y-auto py-1.5">
        {projectsLoading && (
          <div className="px-3 py-1 space-y-1.5" aria-label="Loading projects">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-6 rounded animate-pulse" style={{ background: "var(--dm-surface-b)" }} />
            ))}
          </div>
        )}
        {!projectsLoading && listError && <p className="px-3 py-2 text-xs text-danger">{listError}</p>}
        {!projectsLoading && !listError && projects.length === 0 && (
          <p className="px-3 py-4 text-xs text-center leading-relaxed" style={{ color: "var(--dm-txt-muted)" }}>
            No projects yet.<br />Use the + above to create one.
          </p>
        )}
        {!projectsLoading && !listError && tree.map(node => (
          <TreeNodeRow
            key={node.type === "folder" ? (node as ProjectTreeFolder).path : node.project.id}
            node={node} depth={0} expanded={expanded} onToggleFolder={toggleFolder}
            currentId={currentProject?.id ?? null} onDelete={handleDelete}
          />
        ))}
      </div>
    </aside>
  );
}
