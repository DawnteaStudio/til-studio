import { expect, test, type Page } from "@playwright/test";

const title = "Prefix tables";
const destination = "cs/algorithms/notes/workbook/note/prefix-tables.md";
const initialBody = "Record the prefix length.";
const aiMarkdown = "# Generated explanation\n\nReuse the longest matching prefix.";

test.beforeEach(async ({ context }) => {
  await context.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    switch (pathname) {
      case "/api/github/tree":
        await route.fulfill({ json: { paths: ["cs/algorithms/notes/workbook/note/example.md"] } });
        break;
      case "/api/ai/note-cleanup":
        await route.fulfill({ json: { markdown: aiMarkdown } });
        break;
      case "/api/github/save":
        if (route.request().method() === "GET") {
          const path = new URL(route.request().url()).searchParams.get("path");
          await route.fulfill({ json: { owner: "owner", repo: "repo", branch: "main", path, sha: null, content: null } });
          break;
        }
        await route.fulfill({ json: { mode: "quick", commitSha: "mock-commit" } });
        break;
      default:
        await route.abort();
    }
  });
});

async function startNote(page: Page) {
  await page.goto("/studio");
  await page.getByRole("button", { name: /algorithms/ }).click();
  await page.getByText("학습 자료와 실습", { exact: true }).click();
  await page.getByRole("button", { name: "기존 학습 자료" }).click();
  await page.getByRole("button", { name: "workbook" }).click();
  await page.getByLabel("제목", { exact: true }).fill(title);
  await page.getByLabel("오늘 배운 것").fill(initialBody);
}

async function reopenStudio(page: Page) {
  const context = page.context();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/studio");
  await expect(reopened.getByRole("button", { name: /algorithms/ })).toBeVisible();
  return reopened;
}

async function expectPublishedSource(page: Page, source: string) {
  await page.getByRole("tab", { name: "저장" }).click();
  const request = page.waitForRequest((req) =>
    new URL(req.url()).pathname === "/api/github/save" && req.method() === "POST",
  );
  await page.getByRole("button", { name: "GitHub에 저장" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    changes: [{ path: destination, content: source }],
  });
}

test("opening Markdown does not freeze the preview and the last form edit survives closing the tab", async ({ page }) => {
  await startNote(page);
  await page.getByRole("tab", { name: "미리보기" }).click();
  const edit = page.getByRole("checkbox", { name: "Markdown 직접 수정" });
  await edit.check();
  await expect(page.getByRole("textbox", { name: "Markdown source" })).toHaveValue(new RegExp(initialBody));
  await edit.uncheck();

  await page.getByRole("tab", { name: "작성" }).click();
  const revised = "Compare prefixes after a mismatch.";
  await page.getByLabel("오늘 배운 것").fill(revised);
  await page.getByRole("tab", { name: "미리보기" }).click();
  await expect(page.getByText(revised, { exact: true })).toBeVisible();
  await expect(page.getByText(initialBody, { exact: true })).toHaveCount(0);

  await page.getByRole("tab", { name: "작성" }).click();
  const latest = "Keep the previous prefix length.";
  await page.getByLabel("오늘 배운 것").fill(latest);
  const reopened = await reopenStudio(page);
  await reopened.getByRole("tab", { name: "작성" }).click();
  await expect(reopened.getByLabel("오늘 배운 것")).toHaveValue(latest);
  await reopened.getByRole("tab", { name: "미리보기" }).click();
  await expect(reopened.getByRole("heading", { name: title })).toBeVisible();
  await expect(reopened.getByText(latest, { exact: true })).toBeVisible();
  await reopened.getByRole("checkbox", { name: "Markdown 직접 수정" }).check();
  const source = await reopened.getByRole("textbox", { name: "Markdown source" }).inputValue();
  expect(source).toContain(latest);
  await expectPublishedSource(reopened, source);
});

test("restores a manual Markdown edit after closing the editor tab and publishes the displayed version", async ({ page }) => {
  await startNote(page);
  await page.getByRole("tab", { name: "미리보기" }).click();
  await page.getByRole("checkbox", { name: "Markdown 직접 수정" }).check();
  const editor = page.getByRole("textbox", { name: "Markdown source" });
  const manualLine = "Manual explanation kept verbatim.";
  const manual = (await editor.inputValue()) + "\n" + manualLine + "\n";
  await editor.fill(manual);

  const reopened = await reopenStudio(page);
  await reopened.getByRole("tab", { name: "미리보기" }).click();
  const edit = reopened.getByRole("checkbox", { name: "Markdown 직접 수정" });
  await edit.check();
  await expect(reopened.getByRole("textbox", { name: "Markdown source" })).toHaveValue(manual);
  await edit.uncheck();
  await expect(reopened.getByText(manualLine, { exact: true })).toBeVisible();
  await expectPublishedSource(reopened, manual);
});

test("keeps the AI draft available after editing the form and reopening Studio", async ({ page }) => {
  await startNote(page);
  await page.getByRole("button", { name: "글 초안 만들기" }).click();
  await expect(page.getByRole("heading", { name: "Generated explanation" })).toBeVisible();
  await page.getByRole("tab", { name: "작성" }).click();
  const latest = "Backtrack to a shorter prefix.";
  await page.getByLabel("오늘 배운 것").fill(latest);

  const reopened = await reopenStudio(page);
  await reopened.getByRole("tab", { name: "미리보기" }).click();
  await expect(reopened.getByText(latest, { exact: true })).toBeVisible();
  await reopened.getByText("이전 편집본과 비교", { exact: true }).click();
  await reopened.getByRole("button", { name: "이전 편집본 사용" }).click();
  await expect(reopened.getByRole("heading", { name: "Generated explanation" })).toBeVisible();
  await reopened.getByRole("checkbox", { name: "Markdown 직접 수정" }).check();
  const source = await reopened.getByRole("textbox", { name: "Markdown source" }).inputValue();
  expect(source).toContain(aiMarkdown);
  await expectPublishedSource(reopened, source);
});

test("opens on a ready-to-type note and a collapsed location picker on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  const memo = page.getByLabel("오늘 배운 것");
  await expect(memo).toBeInViewport({ ratio: 1 });
  const location = page.getByRole("button", { name: /위치 · 나중에 선택/ });
  await expect(location).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("확인하고 싶은 것")).toBeHidden();
  await expect(page.getByRole("button", { name: "기존 학습 자료" })).toBeHidden();
  await memo.fill("자료를 정하기 전에 남긴 메모");
  const write = page.getByRole("tab", { name: "작성" });
  await write.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "미리보기" })).toBeFocused();
  await expect(page.getByText("자료를 정하기 전에 남긴 메모", { exact: true })).toBeVisible();
  await location.click();
  await expect(location).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: /algorithms/ }).click();
  await expect(memo).toHaveValue("자료를 정하기 전에 남긴 메모");
  await expect(page.getByRole("button", { name: /위치 · cs\/algorithms/ })).toHaveAttribute("aria-expanded", "false");
});
