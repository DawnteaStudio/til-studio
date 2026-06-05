import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  responsesCreate: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: mocks.responsesCreate,
    };
  },
}));

describe("OpenAI provider", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    mocks.responsesCreate.mockReset();
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  });

  it("sends note cleanup markdown inside the strict drafting prompt", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mocks.responsesCreate.mockResolvedValue({ output_text: "# Draft" });
    const { openAIProvider } = await import("@/lib/ai/providers/openai");

    await openAIProvider.cleanupNote("## 헷갈린 점\n의존 역전에서 '역전'이라는 단어의 의미를 혼동했다.");

    const request = mocks.responsesCreate.mock.calls[0][0];
    const userInput = request.input.find((item: { role: string }) => item.role === "user");

    expect(userInput.content).toContain("원본 메모를 그대로 복사하지 마세요");
    expect(userInput.content).toContain("헷갈린 점의 각 문장");
    expect(userInput.content).toContain("의존 역전에서 '역전'이라는 단어의 의미를 혼동했다");
    expect(userInput.content).toContain("코드 예시");
  });
});
