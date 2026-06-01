import { expect, test } from "@playwright/test";

test("studio loads workspace controls", async ({ page }) => {
  await page.goto("/studio");

  await expect(page.getByRole("link", { name: "til-studio" })).toBeVisible();
  await expect(page.getByText("Note Tools")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review" })).toBeVisible();
  await expect(page.getByLabel("학습 출처")).toBeVisible();
  await expect(page.getByRole("button", { name: "Markdown 만들기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Notes", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Theory", exact: true })).toBeVisible();
});

test("public learning map loads repository structure", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByRole("heading", { name: "Learning Map" })).toBeVisible();
  await expect(page.getByText("Articles", { exact: true })).toBeVisible();
  await expect(page.getByText("README")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Computer Science" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Repository Index" })).toBeVisible();
});

test("blog index loads repository documents", async ({ page }) => {
  await page.goto("/blog");

  await expect(page.getByRole("heading", { name: "공부 기록을 블로그처럼 읽는 공간" })).toBeVisible();
  await expect(page.getByRole("button", { name: /전체 글/ })).toBeVisible();
  await expect(page.locator("header").getByText("notes", { exact: true })).toBeVisible();
  await expect(page.locator("header").getByText("theory", { exact: true })).toBeVisible();
  await expect(page.getByText("README.md")).toHaveCount(0);
});
