export interface MarkdownImageSource {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

const externalUrlPattern = /^[a-z][a-z\d+.-]*:/i;

export function resolveMarkdownImageUrl(url: string, source?: MarkdownImageSource): string {
  if (!source || !url || url.startsWith("#") || url.startsWith("/") || externalUrlPattern.test(url)) {
    return url;
  }

  const markdownDirectory = source.path.split("/").slice(0, -1);
  const resolvedPath = normalizePath([...markdownDirectory, ...url.split("/")]);

  return `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(
    source.repo,
  )}/${encodeURIComponent(source.branch)}/${encodePathSegments(resolvedPath)}`;
}

function normalizePath(segments: string[]): string[] {
  const normalized: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(segment);
  }

  return normalized;
}

function encodePathSegments(segments: string[]): string {
  return segments.map(encodeURIComponent).join("/");
}
