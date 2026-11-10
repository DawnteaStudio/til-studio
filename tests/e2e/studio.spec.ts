import { expect, test } from "@playwright/test";

test("studio loads workspace controls", async ({ page }) => {
  await page.goto("/studio");

  await expect(page.getByRole("link", { name: "til-studio" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "위치" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "작성" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "미리보기" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "저장" })).toBeVisible();
  await expect(page.getByLabel("오늘 배운 것")).toBeVisible();
  await expect(page.getByRole("button", { name: "글 초안 만들기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "GitHub에 저장" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Notes", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Theory", exact: true })).toBeVisible();
});

test("topic links open a prefiltered list, with filters above results on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/map");
  await expect(page.getByRole("heading", { name: "학습 지도" })).toBeVisible();
  const topicLink = page.getByRole("link", { name: /글 \d+편 전체 보기$/ }).first();
  const expected = new URL(await topicLink.getAttribute("href") ?? "", page.url());
  await topicLink.click();
  await expect(page.getByRole("combobox", { name: "주제" })).toHaveValue(expected.searchParams.get("topic")!);
  const filters = await page.getByRole("region", { name: "글 검색과 필터" }).boundingBox();
  const results = await page.getByRole("heading", { name: /검색 결과/ }).boundingBox();
  expect(filters!.y + filters!.height).toBeLessThan(results!.y);

  await page.getByRole("searchbox", { name: "글 검색" }).fill("unmatched-search-617ca398");
  await expect(page.getByRole("heading", { name: "검색 결과 0편" })).toBeVisible();
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await expect(page.getByRole("combobox", { name: "주제" })).toHaveValue("");
  await expect(page.getByRole("searchbox", { name: "글 검색" })).toBeEmpty();
  await page.getByRole("combobox", { name: "글 종류" }).selectOption("theory");
  await expect(page).toHaveURL(/kind=theory/);
});

test("a series list and its reader agree on the next and previous chapter", async ({ page }) => {
  await page.goto("/map");
  const series = page.getByRole("link", { name: /시리즈 (?:[2-9]|\d{2,})편$/ }).first();
  await series.click();
  await expect(page.getByRole("combobox", { name: "정렬" })).toHaveValue("chapters");
  const chapters = page.getByRole("region", { name: /검색 결과/ }).getByRole("listitem").getByRole("link");
  const firstTitle = await chapters.nth(0).innerText();
  const secondTitle = await chapters.nth(1).innerText();
  await chapters.nth(0).click();
  const next = page.getByRole("link", { name: `다음 글 ${secondTitle}` });
  await expect(next).toBeVisible();
  await next.click();
  await expect(page.getByRole("link", { name: `이전 글 ${firstTitle}` })).toBeVisible();
});
