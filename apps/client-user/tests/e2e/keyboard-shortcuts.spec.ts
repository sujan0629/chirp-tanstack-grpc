import { expect, test } from "@playwright/test";
import { loginAs, waitForHydration } from "./fixtures/test-helpers";

test.describe("keyboard shortcuts", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, "alice");
	});

	test("moves focus between feed posts with the keyboard", async ({ page }) => {
		const posts = page.locator("article");

		await expect(posts.first()).toBeVisible();
		await expect(posts.first()).not.toHaveAttribute("aria-current", "true");

		await page.keyboard.press("j");

		await expect(posts.first()).toHaveAttribute("aria-current", "true");

		await page.keyboard.press("j");

		await expect(posts.nth(1)).toHaveAttribute("aria-current", "true");

		await page.keyboard.press("k");

		await expect(posts.first()).toHaveAttribute("aria-current", "true");
	});

	test("performs focused post actions and opens shortcut help", async ({ page }) => {
		const focusedPost = page.locator('article[aria-current="true"]');

		await page.keyboard.press("?");
		await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeVisible();

		await page.keyboard.press("j");

		await page.keyboard.press("l");
		await expect(focusedPost.getByRole("button", { name: "Unlike" })).toBeVisible();

		await page.keyboard.press("b");
		await expect(focusedPost.getByRole("button", { name: "Remove bookmark" })).toBeVisible();

		await page.keyboard.press("r");
		await waitForHydration(page);
		await expect(page).toHaveURL(/\/posts\/[^/]+$/);
		await expect(page.locator('textarea[placeholder*="comment"]')).toBeFocused();
	});

	test("does not trigger shortcuts while typing in text inputs", async ({ page }) => {
		const composer = page.getByPlaceholder("What's happening?");
		const firstPost = page.locator("article").first();

		await composer.fill("jklbo?");

		await expect(composer).toHaveValue("jklbo?");
		await expect(firstPost).not.toHaveAttribute("aria-current", "true");
		await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeVisible();
	});

	test("does not run post actions before selecting a post or for modified shortcuts", async ({
		page,
	}) => {
		await page.keyboard.press("r");
		await waitForHydration(page);
		await expect(page).toHaveURL("/");

		await page.keyboard.press("o");
		await waitForHydration(page);
		await expect(page).toHaveURL("/");

		await page.keyboard.press("ControlOrMeta+R");
		await waitForHydration(page);
		await expect(page).toHaveURL("/");
	});
});
