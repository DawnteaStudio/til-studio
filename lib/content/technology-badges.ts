export type TechnologyBadge = {
  label: string;
  color: string;
  logo: string;
  logoColor: string;
};

export type TechnologyMetadata = {
  name: string;
  badge?: TechnologyBadge;
};

const presets: Record<string, TechnologyBadge> = {
  c: badge("C", "00599C", "c", "white"),
  "c++": badge("C++", "00599C", "cplusplus", "white"),
  java: badge("Java", "ED8B00", "openjdk", "white"),
  javascript: badge("JavaScript", "F7DF1E", "javascript", "black"),
  typescript: badge("TypeScript", "3178C6", "typescript", "white"),
  python: badge("Python", "3776AB", "python", "white"),
  html5: badge("HTML5", "E34F26", "html5", "white"),
  css3: badge("CSS3", "1572B6", "css3", "white"),
  spring: badge("Spring", "6DB33F", "spring", "white"),
  react: badge("React", "61DAFB", "react", "black"),
  nextjs: badge("Next.js", "000000", "nextdotjs", "white"),
  nodejs: badge("Node.js", "339933", "nodedotjs", "white"),
  git: badge("Git", "F05032", "git", "white"),
};

const aliases: Record<string, string> = {
  cpp: "c++",
  css: "css3",
  html: "html5",
  js: "javascript",
  next: "nextjs",
  node: "nodejs",
  springboot: "spring",
  ts: "typescript",
};

export function recommendTechnologyBadge(name: string): TechnologyMetadata {
  const trimmed = name.trim();
  const normalized = normalizeTechnologyName(trimmed);
  const presetKey = aliases[normalized] ?? normalized;
  const preset = presets[presetKey];

  return preset
    ? { name: trimmed, badge: { ...preset } }
    : { name: trimmed };
}

export function technologyBadgeMarkdown(
  technology: TechnologyMetadata,
): string | null {
  const settings = technology.badge;
  if (
    !settings ||
    !settings.label.trim() ||
    !settings.logo.trim() ||
    !settings.logoColor.trim() ||
    !/^[0-9a-f]{3,8}$/i.test(settings.color)
  ) {
    return null;
  }

  const label = encodeURIComponent(settings.label.trim());
  const logo = encodeURIComponent(settings.logo.trim());
  const logoColor = encodeURIComponent(settings.logoColor.trim());
  const alt = settings.label.trim().replaceAll("]", "\\]");

  return `![${alt}](https://img.shields.io/badge/${label}-${settings.color.toUpperCase()}?logo=${logo}&logoColor=${logoColor}&style=plastic)`;
}

function normalizeTechnologyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9+]/g, "");
}

function badge(
  label: string,
  color: string,
  logo: string,
  logoColor: string,
): TechnologyBadge {
  return { label, color, logo, logoColor };
}
