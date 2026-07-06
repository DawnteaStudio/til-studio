import { afterEach, describe, expect, it, vi } from "vitest";

describe("Gemini provider", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  });

  it("sends absent-field and technical-tone instructions in the Gemini request body", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    const fetchMock = vi.fn(async () =>
      Response.json({
        candidates: [{ content: { parts: [{ text: "# Draft" }] } }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { geminiProvider } = await import("@/lib/ai/providers/gemini");

    await geminiProvider.cleanupNote("## 헷갈린 점\n없음\n\n## 확인하고 싶은 것\n없음");

    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const systemText = request.systemInstruction.parts[0].text;
    const userText = request.contents[0].parts[0].text;

    expect(systemText).toContain("섹션이 존재하지 않는 것으로 간주");
    expect(systemText).toContain("상상해서 만들지 마세요");
    expect(systemText).toContain("반말");
    expect(systemText).toContain("`했어`");
    expect(userText).toContain("헷갈린 점이 `없음`이면");
    expect(userText).toContain("확인하고 싶은 것이 `없음`이면");
    expect(userText).toContain("반말이나 일기체로 쓰지 마세요");
    expect(userText).toContain("## 헷갈린 점\n없음");
  });
});
