import type { ReactNode } from "react";

interface MarkdownArticleProps {
  markdown: string;
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string };

export function MarkdownArticle({ markdown }: MarkdownArticleProps) {
  const blocks = parseMarkdown(markdown);

  return (
    <div className="space-y-6 text-[17px] leading-8 text-[#2e2a22]">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const id = block.text.replace(/\s+/g, "-");
          if (block.level === 1) {
            return (
              <h1 key={index} id={id} className="text-4xl font-semibold leading-tight text-[#211f1a]">
                {renderInline(block.text)}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={index} id={id} className="pt-5 text-2xl font-semibold text-[#211f1a]">
                {renderInline(block.text)}
              </h2>
            );
          }
          return (
            <h3 key={index} id={id} className="pt-3 text-xl font-semibold text-[#211f1a]">
              {renderInline(block.text)}
            </h3>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-2 pl-5">
              {block.items.map((item) => (
                <li key={item} className="list-disc">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-3xl bg-[#25231d] p-5 font-mono text-sm leading-7 text-[#f3ead8]"
            >
              <code>{block.text}</code>
            </pre>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join("\n").trim() });
      paragraph = [];
    }
  }

  function flushList() {
    if (list.length) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      if (code) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = null;
      } else {
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: stripInlineMarkdown(heading[2]),
      });
      continue;
    }

    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1].trim());
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  if (code) blocks.push({ type: "code", text: code.join("\n") });

  return blocks;
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
}

function renderInline(value: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) nodes.push(value.slice(lastIndex, match.index));

    if (match[2]) {
      nodes.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(
        <code key={match.index} className="rounded bg-[#d9d0c0] px-1.5 py-0.5 font-mono text-sm">
          {match[3]}
        </code>,
      );
    } else if (match[4] && match[5]) {
      nodes.push(
        <a key={match.index} href={match[5]} className="font-medium underline decoration-[#b49a5f] underline-offset-4">
          {match[4]}
        </a>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex));
  return nodes.length ? nodes : value;
}
