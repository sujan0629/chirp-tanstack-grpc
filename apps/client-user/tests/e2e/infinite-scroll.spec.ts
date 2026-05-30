import { expect, test } from "@playwright/test";
import { loginAs, waitForHydration } from "./fixtures/test-helpers";

test.describe.configure({ mode: "serial" });

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
		await page.goto("/explore", { waitUntil: "networkidle" });
		await waitForHydration(page);

		const posts = page.locator("article");
		const initialCount = await posts.count();

		expect(initialCount).toBeGreaterThan(0);

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		await expect.poll(() => posts.count()).toBeGreaterThan(initialCount);
	});

	test("restores Explore scroll position after visiting a post detail page", async ({ page }) => {
		await page.goto("/explore", { waitUntil: "networkidle" });
		await waitForHydration(page);

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expect.poll(() => page.locator("article").count()).toBeGreaterThan(10);

		const scrollY = await page.evaluate(() => window.scrollY);
		expect(scrollY).toBeGreaterThan(0);

		await page.locator("article").last().locator('a[data-post-action="open"]').click();
		await waitForHydration(page);
		await expect(page).toHaveURL(/\/posts\/[^/]+$/);

		await page.goBack({ waitUntil: "networkidle" });
		await waitForHydration(page);

		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollY - 100);
	});
});
