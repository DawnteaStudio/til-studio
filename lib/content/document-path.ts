export function documentPathCandidates(path: string): string[] {
  const cleanPath = decodeURIComponent(path).replace(/^\/+|\/+$/g, "");

  if (!cleanPath) return ["README.md"];
  if (cleanPath.endsWith(".md")) return [cleanPath];

  return [`${cleanPath}/README.md`, `${cleanPath}.md`];
}
