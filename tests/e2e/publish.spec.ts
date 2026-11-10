import { expect, test } from "@playwright/test";

test("rechecks a colliding path, requires approval of the latest file, and opens the PR receipt", async ({ page }) => {
  const path = "cs/algorithms/notes/APSS/note/kmp.md";
  const target = { owner: "example", repo: "TIL", branch: "trunk", path };
  const prUrl = "https://github.com/example/TIL/pull/9";
  const requests: Array<{ mode: string; expected: { sha: string | null } }> = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/github/tree") {
      return route.fulfill({ json: { ...target, paths: [path] } });
    }
    if (url.pathname === "/api/github/save" && request.method() === "GET") {
      expect(url.searchParams.get("path")).toBe(path);
      const file = requests.length ? { sha: "other-writer", content: "# 먼저 올린 글" } : { sha: null, content: null };
      return route.fulfill({ json: { ...target, ...file } });
    }
    if (url.pathname === "/api/github/save" && request.method() === "POST") {
      requests.push(request.postDataJSON());
      if (requests.length === 1) return route.fulfill({ status: 409, json: { error: "conflict" } });
      return route.fulfill({ json: { mode: "review", branch: "draft", pullRequestUrl: prUrl } });
    }
    return route.abort();
  });

  await page.goto("/studio");
  await page.getByRole("button", { name: /algorithms/ }).click();
  await page.getByText("학습 자료와 실습", { exact: true }).click();
  await page.getByRole("button", { name: "기존 학습 자료" }).click();
  await page.getByRole("button", { name: "APSS" }).click();
  await page.getByLabel("제목", { exact: true }).fill("KMP");
  await page.getByLabel("오늘 배운 것").fill("접두사와 접미사를 비교한다.");
  await page.getByRole("tab", { name: "저장" }).click();
  await expect(page.getByRole("radio", { name: "trunk에 바로 저장" })).toBeChecked();
  const save = page.getByRole("button", { name: "GitHub에 저장" });
  await save.click();
  await expect(page.getByText("# 먼저 올린 글", { exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
  await page.getByRole("radio", { name: "검토용 초안 PR 만들기" }).check();
  await page.getByLabel("변경 내용을 확인했습니다").check();
  await save.click();
  await expect(page.getByRole("link", { name: "초안 PR 열기" })).toHaveAttribute("href", prUrl);
  expect(requests).toMatchObject([
    { mode: "quick", expected: { path, sha: null, branch: "trunk" } },
    { mode: "review", expected: { path, sha: "other-writer", branch: "trunk" } },
  ]);
});
