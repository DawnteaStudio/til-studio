"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SaveMode } from "@/lib/content/types";

type DeleteResult = {
  mode: SaveMode;
  pullRequestUrl?: string;
};

export function NoteDeleteControl({
  title,
  path,
}: {
  title: string;
  path: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SaveMode>("review");
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<DeleteResult | null>(null);
  const [error, setError] = useState("");

  function close() {
    if (isDeleting) return;
    setIsOpen(false);
    setMode("review");
    setResult(null);
    setError("");
  }

  async function removeNote() {
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/github/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          path,
          message: "Delete TIL note from til-studio",
        }),
      });
      const data = (await response.json()) as DeleteResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "GitHub 삭제 요청에 실패했습니다.");
      }

      setResult(data);
      if (mode === "quick") {
        router.push("/blog");
        router.refresh();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "GitHub 삭제 요청에 실패했습니다.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-[#b66f59]/45 px-3 py-2 text-sm font-semibold text-[#8f4938] transition hover:bg-[#b66f59]/10"
      >
        글 삭제
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171711]/65 px-4 py-8 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="글 삭제"
            className="w-full max-w-lg rounded-lg border border-[#c8bba7] bg-[#f1eadc] p-6 text-[#211f1a] shadow-[0_28px_90px_rgba(0,0,0,0.34)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#9a5948]">
                  Delete note
                </p>
                <h2 className="mt-2 text-xl font-semibold">글 삭제</h2>
              </div>
              <button
                type="button"
                aria-label="삭제 창 닫기"
                onClick={close}
                disabled={isDeleting}
                className="flex size-8 items-center justify-center rounded-full text-xl text-[#6b6257] transition hover:bg-[#ded2bf] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-lg bg-[#e4d9c8] p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-[#6b6257]">
                {path}
              </p>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#5f574c]">
              관련 README 목록도 함께 업데이트됩니다.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#ded2bf] p-1">
              {(["quick", "review"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
                  disabled={isDeleting || Boolean(result)}
                  className={[
                    "h-10 rounded-md text-sm font-semibold transition",
                    mode === option
                      ? "bg-[#31513a] text-[#f6efe2] shadow-sm"
                      : "text-[#62594d] hover:bg-[#eee5d7]",
                  ].join(" ")}
                >
                  {option === "quick" ? "Quick" : "Review"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-[#71685c]">
              {mode === "review"
                ? "Draft PR을 만들어 병합 전에 변경 내용을 확인합니다."
                : "기본 브랜치에서 note를 즉시 삭제합니다."}
            </p>

            {isDeleting ? (
              <div role="status" className="mt-5 flex items-center gap-3 text-sm">
                <span className="size-4 animate-spin rounded-full border-2 border-[#31513a]/25 border-t-[#31513a]" />
                GitHub 삭제 변경을 준비하고 있습니다.
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-5 rounded-lg bg-[#edd4cc] px-4 py-3 text-sm text-[#7d3829]">
                {error}
              </p>
            ) : null}

            {result?.pullRequestUrl ? (
              <div className="mt-5 rounded-lg bg-[#dce5d8] px-4 py-3 text-sm text-[#31513a]">
                <p className="font-semibold">삭제 검토 PR이 생성되었습니다.</p>
                <a
                  href={result.pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex font-semibold underline underline-offset-4"
                >
                  Draft PR 열기
                </a>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={isDeleting}
                className="h-11 rounded-lg border border-[#b8aa95] px-4 text-sm font-semibold text-[#5f574c] transition hover:bg-[#e5dac9] disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={removeNote}
                disabled={isDeleting || Boolean(result)}
                className="h-11 rounded-lg bg-[#994d3b] px-4 text-sm font-semibold text-white transition hover:bg-[#843f31] disabled:opacity-50"
              >
                삭제 요청
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
