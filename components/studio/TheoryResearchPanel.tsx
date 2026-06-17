import { useState } from "react";

export interface TheoryResearchSource {
  title: string;
  url: string;
}

export interface TheoryResearchResult {
  title: string;
  concept: string;
  keyPoints: string[];
  cautions: string[];
  sources: TheoryResearchSource[];
}

interface TheoryResearchPanelProps {
  keyword: string;
  result: TheoryResearchResult | null;
  isResearching: boolean;
  onKeywordChange(keyword: string): void;
  onResearch(keyword: string): Promise<TheoryResearchResult | null>;
  onCreateDraft(result: TheoryResearchResult): void;
}

export function TheoryResearchPanel({
  keyword,
  result,
  isResearching,
  onKeywordChange,
  onResearch,
  onCreateDraft,
}: TheoryResearchPanelProps) {
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const [localResult, setLocalResult] = useState<TheoryResearchResult | null>(result);
  const visibleResult = localResult ?? result;

  async function research() {
    const nextResult = await onResearch(localKeyword);
    setLocalResult(nextResult);
  }

  return (
    <section className="studio-panel space-y-3 rounded-[1.75rem] p-4">
      <h2 className="text-sm font-semibold text-[#f4efe4]">Concept Research</h2>
      <label className="block space-y-2 text-sm">
        <span className="font-semibold text-[#f4efe4]">정리할 개념 키워드</span>
        <input
          value={localKeyword}
          onChange={(event) => {
            setLocalKeyword(event.target.value);
            onKeywordChange(event.target.value);
          }}
          className="studio-field h-11 w-full rounded-2xl bg-[#111827] px-4 text-sm text-[#f4efe4] outline-none placeholder:text-[#918a79] focus:ring-4 focus:ring-[#5de7ff]/25"
          placeholder="예: KMP failure function"
        />
      </label>
      <button
        type="button"
        className="studio-action w-full rounded-2xl bg-[#5de7ff] px-3 py-3 text-sm font-semibold text-[#111827] disabled:opacity-50"
        disabled={isResearching || !localKeyword.trim()}
        onClick={research}
      >
        {isResearching ? "조사하는 중" : "웹에서 조사하기"}
      </button>

      {visibleResult ? (
        <div className="space-y-3 rounded-3xl bg-[#111827] p-4 text-sm text-[#d8d0bd]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d9a7b]">Research Result</p>
            <h3 className="mt-2 text-lg font-semibold text-[#f4efe4]">{visibleResult.title}</h3>
          </div>
          <p className="leading-6">{visibleResult.concept}</p>
          <div>
            <p className="font-semibold text-[#f4efe4]">핵심 내용</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {visibleResult.keyPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-[#f4efe4]">주의할 점</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {visibleResult.cautions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {visibleResult.sources.length ? (
            <div>
              <p className="font-semibold text-[#f4efe4]">참고 자료</p>
              <ul className="mt-2 space-y-1">
                {visibleResult.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      className="break-all text-[#d8c69a] underline"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            className="studio-action w-full rounded-2xl bg-[#204a78] px-3 py-3 text-sm font-semibold text-white"
            onClick={() => onCreateDraft(visibleResult)}
          >
            Theory 초안 만들기
          </button>
        </div>
      ) : null}
    </section>
  );
}
