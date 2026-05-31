import { describe, expect, it } from "vitest";
import {
  buildNotePath,
  buildTheoryPath,
  makeSlug,
  parentReadmePath,
} from "@/lib/content/paths";

describe("content path helpers", () => {
  it("creates stable lowercase slugs", () => {
    expect(makeSlug("@Transactional 롤백 기준")).toBe("transactional-rollback");
    expect(makeSlug("BFS / DFS 기본")).toBe("bfs-dfs");
  });

  it("builds topic-based note paths", () => {
    expect(
      buildNotePath({
        area: "cs",
        topic: "spring",
        source: "inflearn-spring-db",
        title: "@Transactional 롤백 기준",
      }),
    ).toBe("cs/spring/notes/inflearn-spring-db/transactional-rollback.md");
  });

  it("builds theory paths under the selected topic", () => {
    expect(
      buildTheoryPath({
        area: "cs",
        topic: "spring",
        title: "트랜잭션",
      }),
    ).toBe("cs/spring/theory/transaction.md");
  });

  it("points nested documents to the nearest README", () => {
    expect(
      parentReadmePath("cs/spring/notes/inflearn-spring-db/transactional-rollback.md"),
    ).toBe("../README.md");
    expect(parentReadmePath("cs/spring/theory/transaction.md")).toBe("../README.md");
  });
});
