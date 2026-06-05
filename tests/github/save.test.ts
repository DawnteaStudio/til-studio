import { describe, expect, it } from "vitest";
import { buildTopicReadmeChanges, recommendSaveMode } from "@/lib/github/save";

describe("save mode recommendation", () => {
  it("quick-saves ordinary notes", () => {
    expect(recommendSaveMode(["cs/network/notes/book-network/network-layer.md"])).toBe("quick");
  });

  it("review-saves theory files", () => {
    expect(recommendSaveMode(["cs/network/theory/network-layer.md"])).toBe("review");
  });

  it("review-saves readme and structural changes", () => {
    expect(recommendSaveMode(["cs/network/README.md"])).toBe("review");
    expect(recommendSaveMode(["cs/network/notes/book-network/.keep"])).toBe("review");
  });

  it("adds topic README updates for note and theory changes", () => {
    const changes = buildTopicReadmeChanges({
      existingPaths: ["cs/network/notes/book-network/network-layer.md"],
      incomingChanges: [
        {
          path: "cs/network/notes/etc/tcp.md",
          content: "# TCP",
        },
        {
          path: "cs/network/theory/udp.md",
          content: "# UDP",
        },
      ],
      existingReadmes: {
        "cs/network/README.md": "# Network\n\nIntro",
      },
    });

    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe("cs/network/README.md");
    expect(changes[0].content).toContain("- [network-layer](notes/book-network/network-layer.md)");
    expect(changes[0].content).toContain("- [tcp](notes/etc/tcp.md)");
    expect(changes[0].content).toContain("- [udp](theory/udp.md)");
  });
});
