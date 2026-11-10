export function documentPathCandidates(path: string): string[] {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return ["README.md"];
  const candidates = (value: string) => value.endsWith(".md") ? [value] : [`${value}/README.md`, `${value}.md`];
  const exact = candidates(clean);
  try {
    const decoded = decodeURIComponent(clean);
    return decoded === clean ? exact : [...exact, ...candidates(decoded)];
  } catch {
    // A literal percent sign is a valid Git filename.
    return exact;
  }
}
