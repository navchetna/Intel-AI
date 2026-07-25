import type { ProjectSummary } from "./types";

/**
 * Projects have no backend-persisted folder/parent field — the tree is derived
 * purely from the project name, using "/" as a folder separator (e.g.
 * "Retail Bank/Fraud Detection" nests under a virtual "Retail Bank" folder).
 * Flat, "/"-free names remain top-level leaves, so this is fully backward
 * compatible with every project created before this convention existed.
 */

export interface ProjectTreeFolder {
  type: "folder";
  name: string;
  path: string;
  children: ProjectTreeNode[];
}

export interface ProjectTreeLeaf {
  type: "project";
  name: string;
  project: ProjectSummary;
}

export type ProjectTreeNode = ProjectTreeFolder | ProjectTreeLeaf;

export function buildProjectTree(projects: ProjectSummary[]): ProjectTreeNode[] {
  const root: ProjectTreeFolder = { type: "folder", name: "", path: "", children: [] };

  for (const p of projects) {
    const parts = p.name.split("/").map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    let cursor = root;
    let pathSoFar = "";
    for (let i = 0; i < parts.length - 1; i++) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${parts[i]}` : parts[i];
      let folder = cursor.children.find((c): c is ProjectTreeFolder => c.type === "folder" && c.name === parts[i]);
      if (!folder) {
        folder = { type: "folder", name: parts[i], path: pathSoFar, children: [] };
        cursor.children.push(folder);
      }
      cursor = folder;
    }
    cursor.children.push({ type: "project", name: parts[parts.length - 1], project: p });
  }

  sortTree(root);
  return root.children;
}

function sortTree(node: ProjectTreeFolder): void {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const c of node.children) if (c.type === "folder") sortTree(c);
}

/** Every folder path present in the tree — used to default-expand the whole tree on first render. */
export function allFolderPaths(nodes: ProjectTreeNode[]): string[] {
  const paths: string[] = [];
  function walk(list: ProjectTreeNode[]) {
    for (const n of list) {
      if (n.type === "folder") { paths.push(n.path); walk(n.children); }
    }
  }
  walk(nodes);
  return paths;
}
