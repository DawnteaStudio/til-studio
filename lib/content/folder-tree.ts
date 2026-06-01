export interface FolderNavNode {
  children: FolderNavNode[];
  documentCount: number;
  name: string;
  path: string;
}

export function buildFolderNav(paths: string[]): FolderNavNode[] {
  const roots: FolderNavNode[] = [];

  for (const path of paths) {
    const folders = path.split("/").slice(0, -1);
    let siblings = roots;

    for (const [index, folder] of folders.entries()) {
      const nodePath = folders.slice(0, index + 1).join("/");
      let node = siblings.find((candidate) => candidate.path === nodePath);

      if (!node) {
        node = { children: [], documentCount: 0, name: folder, path: nodePath };
        siblings.push(node);
      }

      node.documentCount += 1;
      siblings = node.children;
    }
  }

  return sortFolders(roots);
}

export function filterPathsByFolder(paths: string[], folderPath: string): string[] {
  if (folderPath === "all") return paths;
  return paths.filter((path) => path.startsWith(`${folderPath}/`));
}

function sortFolders(nodes: FolderNavNode[]): FolderNavNode[] {
  return nodes
    .map((node) => ({ ...node, children: sortFolders(node.children) }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
