import { describe, expect, it } from "vitest";
import {
  recommendTechnologyBadge,
  technologyBadgeMarkdown,
} from "@/lib/content/technology-badges";

describe("technology badge recommendations", () => {
  it("recommends a Java badge", () => {
    expect(recommendTechnologyBadge("Java")).toEqual({
      name: "Java",
      badge: {
        label: "Java",
        color: "ED8B00",
        logo: "openjdk",
        logoColor: "white",
      },
    });
  });

  it.each([
    ["c", "C"],
    ["C++", "C++"],
    ["javascript", "JavaScript"],
    ["TypeScript", "TypeScript"],
    ["python", "Python"],
    ["HTML", "HTML5"],
    ["css3", "CSS3"],
    ["spring boot", "Spring"],
    ["react", "React"],
    ["nextjs", "Next.js"],
    ["node", "Node.js"],
    ["git", "Git"],
  ])("matches %s to the %s preset", (input, label) => {
    expect(recommendTechnologyBadge(input).badge?.label).toBe(label);
  });

  it("keeps unknown technologies as plain text", () => {
    expect(recommendTechnologyBadge("Custom VM")).toEqual({
      name: "Custom VM",
    });
  });

  it("renders encoded Shields Markdown for edited badge values", () => {
    expect(
      technologyBadgeMarkdown({
        name: "C++",
        badge: {
          label: "Modern C++",
          color: "00599C",
          logo: "cplusplus",
          logoColor: "white smoke",
        },
      }),
    ).toBe(
      "![Modern C++](https://img.shields.io/badge/Modern%20C%2B%2B-00599C?logo=cplusplus&logoColor=white%20smoke&style=plastic)",
    );
  });

  it("rejects invalid badge colors and incomplete badge settings", () => {
    expect(
      technologyBadgeMarkdown({
        name: "Java",
        badge: {
          label: "Java",
          color: "#ED8B00",
          logo: "openjdk",
          logoColor: "white",
        },
      }),
    ).toBeNull();
  });
});
