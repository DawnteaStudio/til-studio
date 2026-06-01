import { expect, test } from "@playwright/test";

test("studio loads workspace controls", async ({ page }) => {
  await page.goto("/studio");

  await expect(page.getByText("AI Actions")).toBeVisible();
  await expect(page.getByText("Theory Lookup")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review" })).toBeVisible();
  await expect(page.getByText("학습 출처")).toBeVisible();
});

test("public learning map loads repository structure", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByRole("heading", { name: "Learning Map" })).toBeVisible();
  await expect(page.getByText("Markdown files")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Computer Science" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Repository Index" })).toBeVisible();
});
