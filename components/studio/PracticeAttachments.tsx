"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { linkPracticeHref } from "@/lib/content/archive";
import { isArticleFilename } from "@/lib/content/managed-readme";
import { isValidPracticeName } from "@/lib/content/practice-links";

type Props = {
  topic: string;
  sourceName: string;
  sourcePath: string;
  existingSource: boolean;
  available: string[];
  selected: string[];
  paths: string[];
  onToggle(name: string): void;
  onRefresh?(): void;
  refreshing?: boolean;
  markdownError?: string;
  implicitPractice?: string;
};

export function PracticeAttachments({
  topic, sourceName, sourcePath, existingSource, available, selected, paths,
  onToggle, onRefresh, refreshing, markdownError, implicitPractice,
}: Props) {
  const inputHint = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [inputError, setInputError] = useState("");
  const pending = selected.filter((item) => !available.includes(item));
  const linked = selected.filter((item) => available.includes(item));
  const practiceRoot = sourcePath + "/src";
  const noteRoot = sourcePath + "/note/";
  const canLinkPublishedNote = existingSource && available.some(isValidPracticeName)
    && paths.some((path) => path.startsWith(noteRoot) && isArticleFilename(path.slice(noteRoot.length)));
  const previewName = isValidPracticeName(name) ? name : "";

  function add() {
    if (!isValidPracticeName(name)) {
      setInputError(name.includes('"') && name.includes("'")
        ? "코드를 올릴 폴더 이름에는 큰따옴표와 작은따옴표 중 한 종류만 사용할 수 있습니다."
        : "코드를 올릴 폴더 이름 하나를 입력하세요. 앞뒤 공백, 맨 앞의 점, 줄 바꿈, 경로 구분자는 사용할 수 없습니다.");
      return;
    }
    if (paths.includes(practiceRoot) || paths.includes(practiceRoot + "/" + name)) {
      setInputError("같은 이름의 파일이 있습니다. 다른 폴더 이름을 입력하세요.");
      return;
    }
    if (selected.includes(name)) {
      setInputError("이 노트에 이미 추가한 실습입니다.");
      return;
    }
    onToggle(name);
    setInputError("");
    setName("");
  }

  return (
    <section className="min-w-0 rounded-2xl border border-[#204a78]/15 bg-[#f7f1e7] p-4 text-[#302c24]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">이 노트의 실습 코드</h3>
        {onRefresh && (
          <button type="button" disabled={refreshing} onClick={onRefresh}
            className="min-h-11 px-2 text-sm font-semibold underline disabled:opacity-60">
            {refreshing ? "실습 목록 확인 중" : "실습 목록 새로고침"}
          </button>
        )}
      </div>
      {implicitPractice && <p className="mt-2 break-words text-sm">같은 이름으로 자동 연결: {implicitPractice}</p>}
      {linked.length > 0 && <p className="mt-2 break-words text-sm">연결된 소스코드: {linked.join(", ")}</p>}
      {available.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {available.map((item) => (
            <label key={item} className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#204a78]/25 px-3 py-2 text-sm">
              <span className="break-all font-mono">{item}</span>
              <input type="checkbox" aria-label={item + " 소스코드 연결"} checked={selected.includes(item) || item === implicitPractice}
                disabled={Boolean(markdownError) || item === implicitPractice || !isValidPracticeName(item)} onChange={() => onToggle(item)} />
            </label>
          ))}
        </div>
      )}
      <PendingPracticePaths sourcePath={sourcePath} names={pending} onRemove={markdownError ? undefined : onToggle} />
      <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); add(); }}>
        <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold">
          코드를 올릴 폴더 이름
          <input data-practice-focus="folder" className="studio-field min-h-11 min-w-0 scroll-mt-6 rounded-lg bg-white/70 px-3"
            value={name} disabled={Boolean(markdownError)} placeholder="예: 주문-예제"
            aria-invalid={Boolean(inputError)} aria-describedby={inputError ? `${inputHint} ${errorId}` : inputHint}
            onChange={(event) => { setName(event.target.value); setInputError(""); }} />
        </label>
        <button type="submit" disabled={Boolean(markdownError)} className="min-h-11 rounded-lg border border-[#204a78]/30 px-3 text-sm font-semibold">
          이 노트에 폴더 지정
        </button>
      </form>
      <p id={inputHint} className="mt-2 break-words text-sm">
        {previewName ? "코드를 올릴 위치" : "예시"} · <code className="break-all">src/{previewName || "주문-예제"}/</code>
        <span className="mt-1 block">폴더 이름만 먼저 정해 두세요. 나중에 GitHub의 이 위치에 코드 파일을 올리면 됩니다.</span>
      </p>
      {(inputError || markdownError) && <p role="alert" id={errorId} className="mt-2 text-sm text-[#932d28]">{inputError || markdownError}</p>}
      {canLinkPublishedNote && (
        <div className="mt-4 border-t border-[#204a78]/20 pt-2">
          <Link href={linkPracticeHref(topic, sourceName)} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
            이미 쓴 노트에 코드 링크 추가
          </Link>
          <p className="text-sm text-[#504b40]">같은 자료에서 GitHub에 저장한 노트를 골라, 그 노트에서 코드 폴더를 열 수 있게 합니다.</p>
        </div>
      )}
    </section>
  );
}

export function PendingPracticePaths({ sourcePath, names, onRemove }: {
  sourcePath: string;
  names: string[];
  onRemove?(name: string): void;
}) {
  if (!sourcePath || !names.length) return null;
  return (
    <section aria-label="업로드할 실습 폴더" className="mt-4 rounded-lg bg-[#f7f1e7] p-3 text-[#302c24]">
      <h4 className="text-sm font-semibold">코드 업로드 대기</h4>
      <p className="mt-1 text-xs">GitHub에 아래 경로로 파일을 올리면 연결됩니다.</p>
      <ul className="mt-2 space-y-2">
        {names.map((item) => (
          <li key={item} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/50 px-3 py-1">
            <code className="break-all text-xs">{sourcePath}/src/{item}/</code>
            {onRemove && <button type="button" aria-label={item + " 예약 취소"}
              onClick={() => onRemove(item)} className="min-h-11 text-sm underline">예약 취소</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
