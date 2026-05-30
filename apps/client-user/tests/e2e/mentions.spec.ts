import { expect, test } from "@playwright/test";
import { loginAs, waitForHydration } from "./fixtures/test-helpers";

test.describe("Mentions", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, "alice");
	});

	test("should render mentions as clickable links in posts", async ({ page }) => {
		const postContent = `Hey @bob check this out ${Date.now()}`;
		await page.fill('textarea[placeholder*="happening"]', postContent);
		await page.click('button:has-text("Post")');
		await waitForHydration(page);

		const mentionLink = page.locator('a[href="/users/bob"]').filter({ hasText: "@bob" });
		await expect(mentionLink.first()).toBeVisible();
	});

	test("should navigate to user profile when clicking mention", async ({ page }) => {
		const postContent = `Hello @bob ${Date.now()}`;
		await page.fill('textarea[placeholder*="happening"]', postContent);
		await page.click('button:has-text("Post")');
		await waitForHydration(page);

		const mentionLink = page.locator('a[href="/users/bob"]').filter({ hasText: "@bob" }).first();
		await mentionLink.click();

		await expect(page).toHaveURL("/users/bob");
	});

	test("should render multiple mentions in a post", async ({ page }) => {
		const postContent = `Hey @bob and @charlie! ${Date.now()}`;
		await page.fill('textarea[placeholder*="happening"]', postContent);
		await page.click('button:has-text("Post")');
		await waitForHydration(page);

		const bobMention = page.locator('a[href="/users/bob"]').filter({ hasText: "@bob" });
		const charlieMention = page.locator('a[href="/users/charlie"]').filter({ hasText: "@charlie" });

		await expect(bobMention.first()).toBeVisible();
		await expect(charlieMention.first()).toBeVisible();
	});

	test("should render mentions in comments", async ({ page }) => {
		const postLink = page.locator('article a[href*="/posts/"]').first();
		await postLink.click();
		await waitForHydration(page);

		const commentContent = `@bob great post! ${Date.now()}`;
		await page.fill('textarea[placeholder*="comment"]', commentContent);
		await page.click('button:has-text("Comment")');
		await waitForHydration(page);

		const mentionLink = page.locator('a[href="/users/bob"]').filter({ hasText: "@bob" });
		await expect(mentionLink.first()).toBeVisible();
	});

	test("should not break posts without mentions", async ({ page }) => {
		const postContent = `Just a regular post ${Date.now()}`;
		await page.fill('textarea[placeholder*="happening"]', postContent);
		await page.click('button:has-text("Post")');
		await waitForHydration(page);

		await expect(page.getByText(postContent)).toBeVisible();
	});

	test("shows matching users while typing a mention", async ({ page }) => {
		const composer = page.getByPlaceholder("What's happening?");

		await composer.fill("@ali");

		await expect(page.getByRole("listbox", { name: "Mention suggestions" })).toBeVisible();
		await expect(page.getByRole("option", { name: /Alice Johnson @alice/i })).toBeVisible();
	});

	test("inserts a selected mention with the keyboard", async ({ page }) => {
		const composer = page.getByPlaceholder("What's happening?");

		await composer.fill("Hello @ali");
		await expect(page.getByRole("option", { name: /Alice Johnson @alice/i })).toBeVisible();

		await composer.press("Enter");

		await expect(composer).toHaveValue("Hello @alice ");
		await expect(page.getByRole("listbox", { name: "Mention suggestions" })).not.toBeVisible();
	});

	test("replaces the active mention without disturbing earlier mentions", async ({ page }) => {
		const composer = page.getByPlaceholder("What's happening?");

		await composer.fill("@bob hello @ali");
		await expect(page.getByRole("option", { name: /Alice Johnson @alice/i })).toBeVisible();
		await page.getByRole("option", { name: /Alice Johnson @alice/i }).click();

		await expect(composer).toHaveValue("@bob hello @alice ");
	});

	test("does not trigger mention suggestions inside words", async ({ page }) => {
		const composer = page.getByPlaceholder("What's happening?");

		await composer.fill("email@ali");

		await expect(page.getByRole("listbox", { name: "Mention suggestions" })).not.toBeVisible();
	});

	test("shows and inserts mention suggestions in comments", async ({ page }) => {
		const postLink = page.locator('article a[href*="/posts/"]').first();
		await postLink.click();
		await waitForHydration(page);

		const commentBox = page.locator('textarea[placeholder*="comment"]');
		await commentBox.fill("Replying to @bo");
		await expect(page.getByRole("option", { name: /Bob Smith @bob/i })).toBeVisible();

		await commentBox.press("Enter");

		await expect(commentBox).toHaveValue("Replying to @bob ");
		await expect(page.getByRole("listbox", { name: "Mention suggestions" })).not.toBeVisible();
	});
});
