import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  SourceFolderPicker,
  type SourceMetadataForm,
} from "@/components/studio/SourceFolderPicker";

const sources = [
  {
    name: "APSS",
    path: "cs/algorithms/notes/APSS",
  },
];

afterEach(cleanup);

function Harness() {
  const [sourceName, setSourceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [metadata, setMetadata] = useState<SourceMetadataForm>({
    type: "",
    overview: "",
    technologies: [],
    reference: "",
  });

  return (
    <SourceFolderPicker
      selectedPath="languages/java"
      savePath={
        sourceName
          ? `languages/java/notes/${sourceName}/note/test.md`
          : ""
      }
      sourceName={sourceName}
      sources={sources}
      isCreating={isCreating}
      metadata={metadata}
      onSelectExisting={(source) => {
        setSourceName(source);
        setIsCreating(false);
      }}
      onStartCreating={() => {
        setSourceName("");
        setIsCreating(true);
        setMetadata({
          type: "",
          overview: "",
          technologies: [],
          reference: "",
        });
      }}
      onShowExisting={() => {
        setSourceName("");
        setIsCreating(false);
      }}
      onSourceNameChange={setSourceName}
      onMetadataChange={setMetadata}
    />
  );
}

describe("learning material picker", () => {
  it("shows existing and new material modes exclusively", () => {
    render(<Harness />);

    expect(
      screen.getByRole("heading", { name: "학습 자료 선택" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "APSS" })).toBeTruthy();
    expect(screen.queryByLabelText("새 학습 자료 이름")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "새 학습 자료 만들기" }),
    );

    expect(screen.getByLabelText("새 학습 자료 이름")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "APSS" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "기존 학습 자료" }));

    expect(screen.getByRole("button", { name: "APSS" })).toBeTruthy();
    expect(screen.queryByLabelText("새 학습 자료 이름")).toBeNull();
  });

  it("shows the selected existing material clearly", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "APSS" }));

    expect(screen.getByText("선택한 학습 자료: APSS")).toBeTruthy();
  });

  it("recommends and edits a technology badge", () => {
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: "새 학습 자료 만들기" }),
    );

    fireEvent.change(screen.getByLabelText("기술 이름"), {
      target: { value: "Java" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기술 추가" }));

    expect(screen.getByAltText("Java badge preview")).toBeTruthy();
    expect(screen.getByLabelText("Java badge 사용")).toBeTruthy();
    expect(
      (screen.getByLabelText("Java badge 라벨") as HTMLInputElement).value,
    ).toBe("Java");
    expect(
      (screen.getByLabelText("Java badge 색상") as HTMLInputElement).value,
    ).toBe("ED8B00");
    expect(
      (screen.getByLabelText("Java badge 로고") as HTMLInputElement).value,
    ).toBe("openjdk");

    fireEvent.change(screen.getByLabelText("Java badge 라벨"), {
      target: { value: "Java 21" },
    });
    expect(screen.getByAltText("Java 21 badge preview")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Java badge 사용"));
    expect(screen.queryByAltText("Java 21 badge preview")).toBeNull();
    expect(screen.getByText("일반 텍스트로 README에 저장됩니다.")).toBeTruthy();
  });

  it("keeps unknown technologies as plain text and supports removal", () => {
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: "새 학습 자료 만들기" }),
    );

    fireEvent.change(screen.getByLabelText("기술 이름"), {
      target: { value: "Custom VM" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기술 추가" }));

    expect(screen.getByText("Custom VM")).toBeTruthy();
    expect(screen.getByText("일반 텍스트로 README에 저장됩니다.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Custom VM 기술 삭제" }));
    expect(screen.queryByText("Custom VM")).toBeNull();
  });
});
