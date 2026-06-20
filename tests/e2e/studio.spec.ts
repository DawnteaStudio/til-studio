import { expect, test } from "@playwright/test";

test("studio loads workspace controls", async ({ page }) => {
  await page.goto("/studio");

  await expect(page.getByRole("link", { name: "til-studio" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Where/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Write/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Preview/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Publish/ })).toBeVisible();
  await expect(page.getByText("작업 위치를 먼저 정하면 나머지 도구는 조용히 접어둘게요.")).toBeVisible();
  await expect(page.getByRole("button", { name: "글 초안 만들기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "GitHub에 저장" })).toHaveCount(0);
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

  await expect(page.getByRole("heading", { name: "archive stream" })).toBeVisible();
  await expect(page.getByText("notes와 theory만 골라 읽는 공개 아카이브입니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: /전체 글/ })).toBeVisible();
  await expect(page.locator("header").getByText("notes", { exact: true })).toBeVisible();
  await expect(page.locator("header").getByText("theory", { exact: true })).toBeVisible();
  await expect(page.getByText("README.md")).toHaveCount(0);
});
