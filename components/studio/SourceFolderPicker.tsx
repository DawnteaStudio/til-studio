"use client";

import { useState } from "react";
import { makeSlug } from "@/lib/content/paths";
import type { SourceType } from "@/lib/content/source-readme";
import {
  recommendTechnologyBadge,
  technologyBadgeMarkdown,
  type TechnologyMetadata,
} from "@/lib/content/technology-badges";
import type { StudioSourceOption } from "@/lib/content/studio-workspace";

export type SourceMetadataForm = {
  type: SourceType | "";
  overview: string;
  technologies: TechnologyMetadata[];
  reference: string;
};

export function SourceFolderPicker({
  selectedPath,
  savePath,
  sourceName,
  sources,
  isCreating,
  metadata,
  onSelectExisting,
  onStartCreating,
  onShowExisting,
  onSourceNameChange,
  onMetadataChange,
  onCreateSourceWorkspace,
  isCreatingWorkspace = false,
}: {
  selectedPath: string;
  savePath: string;
  sourceName: string;
  sources: StudioSourceOption[];
  isCreating: boolean;
  metadata: SourceMetadataForm;
  onSelectExisting(source: string): void;
  onStartCreating(): void;
  onShowExisting(): void;
  onSourceNameChange(source: string): void;
  onMetadataChange(metadata: SourceMetadataForm): void;
  onCreateSourceWorkspace(): void;
  isCreatingWorkspace?: boolean;
}) {
  const [technologyName, setTechnologyName] = useState("");
  const slug = makeSlug(sourceName);
  const displayedPath =
    savePath ||
    (selectedPath && slug
      ? `${selectedPath}/notes/${slug}/`
      : "학습 자료와 제목을 선택하면 전체 경로가 표시됩니다.");

  function addTechnology() {
    const name = technologyName.trim();
    if (!name) return;
    onMetadataChange({
      ...metadata,
      technologies: [
        ...metadata.technologies,
        recommendTechnologyBadge(name),
      ],
    });
    setTechnologyName("");
  }

  function updateTechnology(
    index: number,
    update: (technology: TechnologyMetadata) => TechnologyMetadata,
  ) {
    onMetadataChange({
      ...metadata,
      technologies: metadata.technologies.map((technology, currentIndex) =>
        currentIndex === index ? update(technology) : technology,
      ),
    });
  }

  return (
    <section className="mt-5 rounded-lg bg-[#d8cebd] p-4 text-[#302c24] shadow-inner">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[#756b5e]">
            Note destination
          </p>
          <h2 className="mt-1 text-base font-semibold text-[#25221c]">
            학습 자료 선택
          </h2>
        </div>
        <p className="rounded-full bg-[#27251f] px-3 py-1.5 text-xs font-medium text-[#efe7d8]">
          {isCreating
            ? "새 학습 자료 작성 중"
            : sourceName
              ? `선택한 학습 자료: ${sourceName}`
              : "기존 학습 자료를 선택하세요"}
        </p>
      </div>

      {!selectedPath ? (
        <p className="mt-4 rounded-lg bg-[#cfc2af] px-4 py-3 text-sm text-[#5a5045]">
          먼저 topic을 선택하면 학습 자료를 고를 수 있습니다.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#c8baa5] p-1">
            <button
              type="button"
              aria-pressed={!isCreating}
              onClick={onShowExisting}
              className={[
                "h-11 rounded-md px-3 text-sm font-semibold transition",
                !isCreating
                  ? "bg-[#31513a] text-[#f6efe2] shadow-sm"
                  : "text-[#5a5045] hover:bg-[#ded3c2]",
              ].join(" ")}
            >
              기존 학습 자료
            </button>
            <button
              type="button"
              aria-pressed={isCreating}
              onClick={onStartCreating}
              className={[
                "h-11 rounded-md px-3 text-sm font-semibold transition",
                isCreating
                  ? "bg-[#31513a] text-[#f6efe2] shadow-sm"
                  : "text-[#5a5045] hover:bg-[#ded3c2]",
              ].join(" ")}
            >
              새 학습 자료 만들기
            </button>
          </div>

          {!isCreating ? (
            <div className="grid transition-opacity duration-200">
              {sources.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {sources.map((source) => (
                    <button
                      key={source.path}
                      type="button"
                      onClick={() => onSelectExisting(source.name)}
                      className={[
                        "min-h-12 rounded-lg px-4 py-3 text-left text-sm font-semibold transition",
                        sourceName === source.name
                          ? "bg-[#31513a] text-[#f6efe2] shadow-[0_12px_24px_rgba(49,81,58,0.22)]"
                          : "bg-[#e8dfd0] text-[#3c362d] hover:bg-[#f3ebdf]",
                      ].join(" ")}
                    >
                      {source.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-[#cfc2af] px-4 py-3 text-sm text-[#5a5045]">
                  아직 등록된 학습 자료가 없습니다. 새 학습 자료를 만들어
                  시작하세요.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 rounded-lg bg-[#cfc2af] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#3f3a31]">
                    새 학습 자료 이름
                  </span>
                  <input
                    value={sourceName}
                    onChange={(event) => onSourceNameChange(event.target.value)}
                    placeholder="예: 혼자 공부하는 C, Software Maestro"
                    className="h-12 rounded-lg bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#3f3a31]">
                    자료 유형
                  </span>
                  <select
                    value={metadata.type}
                    onChange={(event) =>
                      onMetadataChange({
                        ...metadata,
                        type: event.target
                          .value as SourceMetadataForm["type"],
                      })
                    }
                    className="h-12 rounded-lg bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none focus:ring-4 focus:ring-[#c7ad6d]/30"
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
                  <span className="text-sm font-semibold text-[#3f3a31]">
                    학습 개요
                  </span>
                  <textarea
                    value={metadata.overview}
                    onChange={(event) =>
                      onMetadataChange({
                        ...metadata,
                        overview: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="이 자료에서 무엇을 공부하는지 적어주세요."
                    className="rounded-lg bg-[#f3ebdf] px-4 py-3 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                  />
                </label>
                <div className="grid gap-3 sm:col-span-2">
                  <div>
                    <span className="text-sm font-semibold text-[#3f3a31]">
                      언어 및 기술
                    </span>
                    <div className="mt-2 flex gap-2">
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">기술 이름</span>
                        <input
                          value={technologyName}
                          onChange={(event) =>
                            setTechnologyName(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addTechnology();
                            }
                          }}
                          placeholder="예: Java, Spring"
                          className="h-12 w-full rounded-lg bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={addTechnology}
                        className="h-12 shrink-0 rounded-lg bg-[#31513a] px-4 text-sm font-semibold text-[#f6efe2] transition hover:bg-[#294632]"
                      >
                        기술 추가
                      </button>
                    </div>
                  </div>

                  {metadata.technologies.length ? (
                    <div className="grid gap-3">
                      {metadata.technologies.map((technology, index) => (
                        <TechnologyEditor
                          key={`${technology.name}-${index}`}
                          technology={technology}
                          onChange={(next) =>
                            updateTechnology(index, () => next)
                          }
                          onRemove={() =>
                            onMetadataChange({
                              ...metadata,
                              technologies: metadata.technologies.filter(
                                (_, currentIndex) => currentIndex !== index,
                              ),
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-[#3f3a31]">
                    참고 자료
                  </span>
                  <input
                    value={metadata.reference}
                    onChange={(event) =>
                      onMetadataChange({
                        ...metadata,
                        reference: event.target.value,
                      })
                    }
                    placeholder="책 정보 또는 URL"
                    className="h-12 rounded-lg bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-[#e8dfd0] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#342f28]">
                    note 없이 학습 공간만 먼저 만들 수 있습니다
                  </p>
                  <p className="mt-1 text-xs text-[#71685c]">
                    README, note 폴더, src 폴더를 먼저 준비합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCreateSourceWorkspace}
                  disabled={isCreatingWorkspace}
                  className="h-11 shrink-0 rounded-lg bg-[#31513a] px-4 text-sm font-semibold text-[#f6efe2] transition hover:bg-[#294632] disabled:opacity-60"
                >
                  {isCreatingWorkspace ? "학습 공간 생성 중" : "학습 공간 만들기"}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-[#2b2923] px-4 py-3 text-[#e8dcc7]">
            <p className="text-xs font-semibold text-[#bdb19d]">
              이 글이 저장될 위치
            </p>
            <p className="mt-1 break-all font-mono text-xs leading-5">
              {displayedPath}
            </p>
            {isCreating && slug ? (
              <p className="mt-2 text-xs text-[#bdb19d]">
                폴더 이름: <span className="font-mono">{slug}</span>
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function TechnologyEditor({
  technology,
  onChange,
  onRemove,
}: {
  technology: TechnologyMetadata;
  onChange(technology: TechnologyMetadata): void;
  onRemove(): void;
}) {
  const badgeMarkdown = technologyBadgeMarkdown(technology);
  const badgeUrl = badgeMarkdown?.match(/\]\((.+)\)$/)?.[1];
  const badgeEnabled = Boolean(technology.badge);
  const displayLabel = technology.badge?.label || technology.name;

  function updateBadge(
    field: "label" | "color" | "logo" | "logoColor",
    value: string,
  ) {
    if (!technology.badge) return;
    onChange({
      ...technology,
      badge: { ...technology.badge, [field]: value },
    });
  }

  return (
    <div className="rounded-lg bg-[#e9dfd0] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#342f28]">
            {technology.name}
          </p>
          {badgeUrl ? (
            // Shields previews are tiny external images and do not benefit from Next image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={badgeUrl}
              alt={`${displayLabel} badge preview`}
              className="mt-2 h-5 max-w-full"
            />
          ) : (
            <p className="mt-2 text-xs text-[#71685c]">
              일반 텍스트로 README에 저장됩니다.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={`${technology.name} 기술 삭제`}
          title="기술 삭제"
          onClick={onRemove}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-lg text-[#756b5e] transition hover:bg-[#d7c9b5] hover:text-[#7d3829]"
        >
          ×
        </button>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#50483e]">
        <input
          type="checkbox"
          checked={badgeEnabled}
          onChange={(event) => {
            if (event.target.checked) {
              onChange(recommendTechnologyBadge(technology.name));
            } else {
              onChange({ name: technology.name });
            }
          }}
          className="size-4"
        />
        {technology.name} badge 사용
      </label>

      {technology.badge ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <BadgeField
            label={`${technology.name} badge 라벨`}
            value={technology.badge.label}
            onChange={(value) => updateBadge("label", value)}
          />
          <BadgeField
            label={`${technology.name} badge 색상`}
            value={technology.badge.color}
            onChange={(value) => updateBadge("color", value)}
          />
          <BadgeField
            label={`${technology.name} badge 로고`}
            value={technology.badge.logo}
            onChange={(value) => updateBadge("logo", value)}
          />
          <BadgeField
            label={`${technology.name} badge 로고 색상`}
            value={technology.badge.logoColor}
            onChange={(value) => updateBadge("logoColor", value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function BadgeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-[#62594d]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md bg-[#f7f0e5] px-3 text-xs text-[#302c24] outline-none focus:ring-2 focus:ring-[#31513a]/25"
      />
    </label>
  );
}
