import Link from "next/link";
import { articleHref, type ArchiveArticle } from "@/lib/content/archive";

const topicNames: Record<string, string> = {
  c: "C", cpp: "C++", java: "Java", javascript: "JavaScript", typescript: "TypeScript", python: "Python",
};

export function topicLabel(topic: string) {
  return topicNames[topic.toLowerCase()] ?? topic;
}

export function blogHref(topic: string, source?: string | null) {
  const params = new URLSearchParams({ topic });
  if (source) params.set("source", source);
  return `/blog?${params}`;
}

export function ArticleDate({ article }: { article: ArchiveArticle }) {
  const date = article.created ?? article.updated;
  if (!date) return <span>날짜 미상</span>;
  return <span>{article.created ? "작성 " : "수정 "}<time dateTime={date}>{date.slice(0, 10)}</time></span>;
}

export function ArchiveArticleRow({ article }: { article: ArchiveArticle }) {
  const chapter = article.source && article.path.split("/").at(-1)?.match(/^(?:ch(?:apter)?[._ -]*)(\d+)(?=[._ -]|$)/i)?.[1];
  return (
    <li className="grid gap-2 border-t border-[#211f1a]/15 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <Link href={articleHref(article.path)} className="break-words text-lg font-bold leading-snug text-[#242325] underline-offset-4 hover:underline">
          {article.title}
        </Link>
        <p className="mt-1 break-words text-sm text-[#605a50]">
          {article.kind === "note" ? "학습 노트" : "개념 정리"} · {topicLabel(article.topic)}{article.source && ` · ${article.source}`}{chapter && ` · ${Number(chapter)}장`}
        </p>
      </div>
      <p className="text-xs leading-6 text-[#645d52]"><ArticleDate article={article} /></p>
    </li>
  );
}
