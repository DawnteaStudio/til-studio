"use client";

import { makeSlug } from "@/lib/content/paths";
import type { SourceType } from "@/lib/content/source-readme";
import type { StudioSourceOption } from "@/lib/content/studio-workspace";

export type SourceMetadataForm = {
  type: SourceType | "";
  overview: string;
  technologies: string;
  reference: string;
};

export function SourceFolderPicker({
  selectedPath,
  sourceName,
  sources,
  isCreating,
  metadata,
  onSelectExisting,
  onStartCreating,
  onSourceNameChange,
  onMetadataChange,
}: {
  selectedPath: string;
  sourceName: string;
  sources: StudioSourceOption[];
  isCreating: boolean;
  metadata: SourceMetadataForm;
  onSelectExisting(source: string): void;
  onStartCreating(): void;
  onSourceNameChange(source: string): void;
  onMetadataChange(metadata: SourceMetadataForm): void;
}) {
  const slug = makeSlug(sourceName);

  return (
    <section className="mt-5 rounded-3xl bg-[#d8cebd] p-4 text-[#302c24] shadow-inner">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#756b5e]">Source</p>
          <h2 className="mt-1 text-base font-semibold text-[#25221c]">저장 source 폴더</h2>
        </div>
        <p className="rounded-full bg-[#27251f] px-3 py-1.5 text-xs font-medium text-[#efe7d8]">
          {sourceName ? `선택된 source: ${sourceName}` : "source를 선택하세요"}
        </p>
      </div>

      {!selectedPath ? (
        <p className="mt-4 rounded-2xl bg-[#cfc2af] px-4 py-3 text-sm text-[#5a5045]">
          먼저 topic을 선택하면 source 폴더를 고를 수 있습니다.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {sources.length ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-[#62594d]">기존 source</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {sources.map((source) => (
                  <button
                    key={source.path}
                    type="button"
                    onClick={() => onSelectExisting(source.name)}
                    className={[
                      "rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                      !isCreating && sourceName === source.name
                        ? "bg-[#31513a] text-[#f6efe2] shadow-[0_12px_24px_rgba(49,81,58,0.22)]"
                        : "bg-[#e8dfd0] text-[#3c362d] hover:bg-[#f3ebdf]",
                    ].join(" ")}
                  >
                    {source.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-[#cfc2af] px-4 py-3 text-sm text-[#5a5045]">
              아직 source 폴더가 없습니다. 새 source를 만들어 시작하세요.
            </p>
          )}

          <button
            type="button"
            onClick={onStartCreating}
            className={[
              "rounded-2xl border border-dashed px-4 py-3 text-left text-sm font-semibold transition",
              isCreating
                ? "border-[#31513a] bg-[#e8dfd0] text-[#31513a]"
                : "border-[#897d6c] text-[#5a5045] hover:bg-[#e8dfd0]",
            ].join(" ")}
          >
            새 source 만들기
          </button>

          {isCreating ? (
            <div className="grid gap-3 rounded-2xl bg-[#cfc2af] p-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#3f3a31]">새 source 이름</span>
                <input
                  value={sourceName}
                  onChange={(event) => onSourceNameChange(event.target.value)}
                  placeholder="예: 혼자 공부하는 C, Software Maestro"
                  className="h-12 rounded-2xl bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#3f3a31]">자료 유형</span>
                <select
                  value={metadata.type}
                  onChange={(event) =>
                    onMetadataChange({
                      ...metadata,
                      type: event.target.value as SourceMetadataForm["type"],
                    })
                  }
                  className="h-12 rounded-2xl bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none focus:ring-4 focus:ring-[#c7ad6d]/30"
                >
                  <option value="">선택하세요</option>
                  <option value="book">책</option>
                  <option value="lecture">강의</option>
                  <option value="mentoring">멘토링</option>
                  <option value="course">코스</option>
                  <option value="etc">기타</option>
                </select>
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-semibold text-[#3f3a31]">학습 개요</span>
                <textarea
                  value={metadata.overview}
                  onChange={(event) =>
                    onMetadataChange({ ...metadata, overview: event.target.value })
                  }
                  rows={3}
                  placeholder="이 자료에서 무엇을 공부하는지 적어주세요."
                  className="rounded-2xl bg-[#f3ebdf] px-4 py-3 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#3f3a31]">언어 및 기술</span>
                <input
                  value={metadata.technologies}
                  onChange={(event) =>
                    onMetadataChange({ ...metadata, technologies: event.target.value })
                  }
                  placeholder="쉼표로 구분: Java, Spring"
                  className="h-12 rounded-2xl bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#3f3a31]">참고 자료</span>
                <input
                  value={metadata.reference}
                  onChange={(event) =>
                    onMetadataChange({ ...metadata, reference: event.target.value })
                  }
                  placeholder="책 정보 또는 URL"
                  className="h-12 rounded-2xl bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                />
              </label>
            </div>
          ) : null}

          <div className="rounded-2xl bg-[#2b2923] px-4 py-3 font-mono text-xs text-[#e8dcc7]">
            {slug ? `저장 폴더: ${slug}` : "source 이름을 입력하면 저장 폴더가 표시됩니다"}
          </div>
        </div>
      )}
    </section>
  );
}
