import { DocumentView } from "@/components/public/DocumentView";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  return (
    <DocumentView
      document={{
        path,
        title: path.split("/").at(-1)?.replace(/\.md$/, "") ?? "Document",
        kind: path.includes("/theory/") ? "theory" : "note",
        headings: ["학습 출처", "오늘 배운 것", "헷갈린 점"],
        body: `# ${path}\n\n동기화된 Markdown 문서가 여기에 렌더링됩니다.`,
        keywords: [],
      }}
    />
  );
}
