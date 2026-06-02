import { afterEach, describe, expect, it } from "vitest";
import { getOpenAIModel, parseModelJson } from "@/lib/ai/service";

describe("OpenAI service configuration", () => {
  const originalModel = process.env.OPENAI_MODEL;

  afterEach(() => {
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
  });

  it("uses OPENAI_MODEL when configured", () => {
    process.env.OPENAI_MODEL = "gpt-custom-mini";

    expect(getOpenAIModel()).toBe("gpt-custom-mini");
  });

  it("falls back to a dated gpt-4o-mini model when no model is configured", () => {
    delete process.env.OPENAI_MODEL;

    expect(getOpenAIModel()).toBe("gpt-4o-mini-2024-07-18");
  });

  it("parses JSON returned inside a markdown code fence", () => {
    expect(parseModelJson('```json\n{"title":"KMP"}\n```')).toEqual({ title: "KMP" });
  });
});
