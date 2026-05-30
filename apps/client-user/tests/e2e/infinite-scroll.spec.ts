import { expect, test } from "@playwright/test";
import { loginAs, uniqueId, waitForHydration } from "./fixtures/test-helpers";

test.describe.configure({ mode: "serial" });

async function createFeedPost(page: Parameters<typeof loginAs>[0], content: string): Promise<void> {
	await page.getByPlaceholder("What's happening?").fill(content);
	await page.getByRole("button", { name: "Post", exact: true }).click();
	await waitForHydration(page);
	await expect(page.getByText(content)).toBeVisible();
}

async function seedPosts(page: Parameters<typeof loginAs>[0], count: number): Promise<string> {
	const prefix = uniqueId("infinite");

	for (let index = 0; index < count; index += 1) {
		await createFeedPost(page, `${prefix} post ${index + 1}`);
	}

	return prefix;
}

test.describe("infinite scroll feeds", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, "alice");
		await page.evaluate(() => window.sessionStorage.clear());
		await page.goto("/", { waitUntil: "networkidle" });
		await waitForHydration(page);
	});

	test("loads an initial Home feed without a manual load-more control", async ({ page }) => {
		await expect(page.locator("article").first()).toBeVisible();
		await expect(page.getByRole("button", { name: /load more/i })).not.toBeVisible();
	});

	test("loads more Explore posts as the user scrolls", async ({ page }) => {
		const prefix = await seedPosts(page, 12);

		await page.goto("/explore", { waitUntil: "networkidle" });
		await waitForHydration(page);

		const seededPosts = page.locator("article").filter({ hasText: prefix });
		const initialCount = await seededPosts.count();

		expect(initialCount).toBeGreaterThan(0);
		expect(initialCount).toBeLessThan(12);

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		await expect.poll(() => seededPosts.count()).toBeGreaterThan(initialCount);
	});

	test("restores Explore scroll position after visiting a post detail page", async ({ page }) => {
		const prefix = await seedPosts(page, 12);

		await page.goto("/explore", { waitUntil: "networkidle" });
		await waitForHydration(page);

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expect.poll(() => page.locator("article").filter({ hasText: prefix }).count()).toBe(12);

		const scrollY = await page.evaluate(() => window.scrollY);
		expect(scrollY).toBeGreaterThan(0);

		await page
			.locator("article")
			.filter({ hasText: prefix })
			.last()
			.locator('a[href*="/posts/"]')
			.click();
		await waitForHydration(page);
		await expect(page).toHaveURL(/\/posts\/[^/]+$/);

		await page.goBack({ waitUntil: "networkidle" });
		await waitForHydration(page);

		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollY - 100);
	});
});
