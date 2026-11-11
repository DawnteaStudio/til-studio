import { expect, test } from "@playwright/test";

test("a reserved practice survives a closed tab and publishes before the code exists", async ({ context, page }) => {
  const material = "cs/algorithms/notes/workbook";
  const files = [material + "/note/intro.md"];
  const practice = "Chapter 2";
  const destination = material + "/note/pointers.md";
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/github/tree") return route.fulfill({ json: { paths: files, allPaths: files } });
    if (url.pathname === "/api/github/save") {
      if (request.method() === "GET") {
        return route.fulfill({ json: { owner: "example", repo: "TIL", branch: "main",
          path: url.searchParams.get("path"), sha: null, content: null } });
      }
      return route.fulfill({ json: { mode: "quick", commitSha: "mock-practice" } });
    }
    return route.abort();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await page.getByLabel("제목", { exact: true }).fill("Pointers");
  await page.getByLabel("오늘 배운 것").fill("주소와 값의 차이");
  await page.getByRole("button", { name: "코드를 올릴 위치 정하기" }).click();
  await page.getByRole("button", { name: /algorithms/ }).click();
  await page.getByRole("button", { name: "workbook" }).click();
  const folderName = page.getByRole("textbox", { name: "코드를 올릴 폴더 이름" });
  await expect(folderName).toBeFocused();
  await expect(folderName).toHaveAccessibleDescription(/src\/주문-예제\//);
  await expect(page.getByRole("link", { name: "이미 쓴 노트에 코드 링크 추가" })).toHaveCount(0);
  await folderName.fill(practice);
  await expect(folderName).toHaveAccessibleDescription(/src\/Chapter 2\//);
  await page.getByRole("button", { name: "이 노트에 폴더 지정" }).click();
  await expect(page.getByText(material + "/src/" + practice + "/", { exact: true })).toBeVisible();
  await page.close();

  const reopened = await context.newPage();
  await reopened.goto("/studio");
  await reopened.getByRole("tab", { name: "작성" }).click();
  await expect(reopened.getByLabel("오늘 배운 것")).toHaveValue("주소와 값의 차이");
  await reopened.getByText(/학습 자료와 실습/).first().click();
  await expect(reopened.getByRole("button", { name: practice + " 예약 취소" })).toBeVisible();
  await reopened.getByRole("tab", { name: "저장" }).click();
  const saved = reopened.waitForRequest((req) => req.url().endsWith("/api/github/save") && req.method() === "POST");
  await reopened.getByRole("button", { name: "GitHub에 저장" }).click();
  const { changes } = (await saved).postDataJSON();
  expect(changes).toHaveLength(1);
  expect(changes[0]).toMatchObject({ path: destination, content: expect.stringContaining("주소와 값의 차이") });
  expect(changes[0].content).toMatch(/^src:\s*\n\s*-\s*["']?Chapter 2["']?$/m);
});

test("a practice in the map can be attached to an existing note without replacing a Studio draft", async ({ page }) => {
  await page.route("**/api/github/practice-link", (route) => route.fulfill({
    json: { mode: "review", branch: "draft", pullRequestUrl: "https://github.com/example/TIL/pull/2" },
  }));
  await page.goto("/studio");
  await page.getByLabel("오늘 배운 것").fill("작성 중이던 다른 초안");
  await page.getByRole("link", { name: "GitHub에 올린 실습 찾기" }).click();
  await expect(page).toHaveURL(/[?&]view=unlinked/);
  await expect(page.getByRole("heading", { level: 1, name: "GitHub에 올린 실습 찾기" })).toBeVisible();
  const link = page.locator("a[href*='/studio/link-practice?'][href*='practice=']").first();
  test.skip(!(await link.count()), "The configured repository has no unlinked practice with an existing note.");
  await expect(link).toBeVisible();
  const practice = new URL(await link.getAttribute("href") ?? "", page.url()).searchParams.get("practice");
  await link.click();
  const notes = page.getByRole("combobox", { name: "링크를 추가할 노트" });
  const preflight = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/github/save" && response.request().method() === "GET");
  const [path] = await notes.selectOption({ index: 1 });
  const { sha } = await (await preflight).json();
  expect(sha).toEqual(expect.any(String));
  await page.getByRole("radio", { name: "검토용 초안 PR 만들기" }).check();
  const posted = page.waitForRequest((req) => req.url().endsWith("/api/github/practice-link") && req.method() === "POST");
  await page.getByRole("button", { name: "GitHub에 저장" }).click();
  expect((await posted).postDataJSON()).toMatchObject({ path, practice, mode: "review", expected: { path, sha } });
  await expect(page.getByRole("link", { name: "초안 PR 열기" })).toBeVisible();
  await page.goto("/studio");
  await expect(page.getByLabel("오늘 배운 것")).toHaveValue("작성 중이던 다른 초안");
});
