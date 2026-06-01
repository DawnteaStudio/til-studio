import type { ReactNode } from "react";
import type {
  Blockquote,
  Code,
  Delete,
  Emphasis,
  Heading,
  Image,
  PhrasingContent,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  Root,
  RootContent,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
  ThematicBreak,
} from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

interface MarkdownArticleProps {
  markdown: string;
}

type MarkdownNode =
  | RootContent
  | PhrasingContent
  | Heading
  | Paragraph
  | Text
  | Strong
  | Emphasis
  | Delete
  | InlineCode
  | Link
  | List
  | ListItem
  | Code
  | Table
  | TableRow
  | TableCell
  | Blockquote
  | ThematicBreak
  | Image;

const parser = unified().use(remarkParse).use(remarkGfm);

export function MarkdownArticle({ markdown }: MarkdownArticleProps) {
  const tree = parser.parse(markdown) as Root;

  return (
    <div className="space-y-6 text-[17px] leading-8 text-[#2e2a22]">
      {renderChildren(tree.children, "root")}
    </div>
  );
}

function renderNode(node: MarkdownNode, key: string): ReactNode {
  switch (node.type) {
    case "heading":
      return renderHeading(node, key);
    case "paragraph":
      return (
        <p key={key} className="whitespace-pre-wrap">
          {renderChildren(node.children, key)}
        </p>
      );
    case "text":
      return node.value;
    case "strong":
      return <strong key={key}>{renderChildren(node.children, key)}</strong>;
    case "emphasis":
      return <em key={key}>{renderChildren(node.children, key)}</em>;
    case "delete":
      return <del key={key}>{renderChildren(node.children, key)}</del>;
    case "inlineCode":
      return (
        <code key={key} className="rounded bg-[#d9d0c0] px-1.5 py-0.5 font-mono text-sm">
          {node.value}
        </code>
      );
    case "link":
      return (
        <a
          key={key}
          href={node.url}
          className="font-medium underline decoration-[#b49a5f] underline-offset-4"
        >
          {renderChildren(node.children, key)}
        </a>
      );
    case "list": {
      const ListTag = node.ordered ? "ol" : "ul";
      return (
        <ListTag key={key} className="space-y-2 pl-6">
          {renderChildren(node.children, key)}
        </ListTag>
      );
    }
    case "listItem":
      return (
        <li key={key} className="list-disc">
          {renderChildren(node.children, key)}
        </li>
      );
    case "code":
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-3xl bg-[#25231d] p-5 font-mono text-sm leading-7 text-[#f3ead8]"
        >
          <code>{node.value}</code>
        </pre>
      );
    case "table":
      return renderTable(node, key);
    case "blockquote":
      return (
        <blockquote key={key} className="border-l-4 border-[#b49a5f] pl-5 text-[#51483b]">
          {renderChildren(node.children, key)}
        </blockquote>
      );
    case "thematicBreak":
      return <hr key={key} className="border-[#c8bba7]" />;
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={key} src={node.url} alt={node.alt ?? ""} className="rounded-3xl" />
      );
    default:
      return null;
  }
}

function renderHeading(node: Heading, key: string) {
  const text = plainText(node);
  const id = text.replace(/\s+/g, "-");

  if (node.depth === 1) {
    return (
      <h1 key={key} id={id} className="text-4xl font-semibold leading-tight text-[#211f1a]">
        {renderChildren(node.children, key)}
      </h1>
    );
  }

  if (node.depth === 2) {
    return (
      <h2 key={key} id={id} className="pt-5 text-2xl font-semibold text-[#211f1a]">
        {renderChildren(node.children, key)}
      </h2>
    );
  }

  return (
    <h3 key={key} id={id} className="pt-3 text-xl font-semibold text-[#211f1a]">
      {renderChildren(node.children, key)}
    </h3>
  );
}

function renderTable(node: Table, key: string) {
  const [header, ...rows] = node.children;

  return (
    <div key={key} className="overflow-x-auto rounded-3xl border border-[#c8bba7]">
      <table className="min-w-full border-collapse text-left text-sm">
        {header ? (
          <thead className="bg-[#d9d0c0] text-[#211f1a]">
            <tr>{renderTableCells(header.children, `${key}-head`, "th")}</tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`} className="border-t border-[#c8bba7]">
              {renderTableCells(row.children, `${key}-row-${rowIndex}`, "td")}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTableCells(cells: TableCell[], key: string, tag: "th" | "td") {
  return cells.map((cell, index) => {
    const CellTag = tag;
    return (
      <CellTag key={`${key}-cell-${index}`} className="px-4 py-3 align-top">
        {renderChildren(cell.children, `${key}-cell-${index}`)}
      </CellTag>
    );
  });
}

function renderChildren(children: readonly MarkdownNode[], key: string) {
  return children.map((child, index) => renderNode(child, `${key}-${index}`));
}

function plainText(node: MarkdownNode): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node) return node.children.map((child) => plainText(child as MarkdownNode)).join("");
  return "";
}
