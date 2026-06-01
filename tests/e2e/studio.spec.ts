import { expect, test } from "@playwright/test";

test("studio loads workspace controls", async ({ page }) => {
  await page.goto("/studio");

  await expect(page.getByText("AI Actions")).toBeVisible();
  await expect(page.getByText("Theory Lookup")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review" })).toBeVisible();
  await expect(page.getByLabel("학습 출처")).toBeVisible();
});

test("public learning map loads repository structure", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByRole("heading", { name: "Learning Map" })).toBeVisible();
  await expect(page.getByText("Markdown files")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Computer Science" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Repository Index" })).toBeVisible();
});

test("blog index loads repository documents", async ({ page }) => {
  await page.goto("/blog");

  await expect(page.getByRole("heading", { name: "공부 기록을 블로그처럼 읽는 공간" })).toBeVisible();
  await expect(page.locator("header").getByText("notes", { exact: true })).toBeVisible();
  await expect(page.locator("header").getByText("theory", { exact: true })).toBeVisible();
});
