import { expect, test } from "@playwright/test";
import { loginAs, uniqueId, waitForHydration } from "./fixtures/test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("post composer drafts and content warnings", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, "alice");
	});

	test("preserves a draft across navigation within the session", async ({ page }) => {
		const draft = `Draft ${uniqueId("draft")}`;
		const composer = page.getByPlaceholder("What's happening?");

		await composer.fill(draft);
		await page.goto("/explore", { waitUntil: "networkidle" });
		await waitForHydration(page);
		await page.goto("/", { waitUntil: "networkidle" });
		await waitForHydration(page);

		await expect(page.getByPlaceholder("What's happening?")).toHaveValue(draft);
	});

	test("clears the saved draft after posting", async ({ page }) => {
		const content = `Draft clear ${uniqueId("draft_clear")}`;
		const composer = page.getByPlaceholder("What's happening?");

		await composer.fill(content);
		await page.getByRole("button", { name: "Post", exact: true }).click();
		await waitForHydration(page);

		await expect(page.getByText(content)).toBeVisible();
		await expect(composer).toHaveValue("");

		await page.goto("/explore", { waitUntil: "networkidle" });
		await waitForHydration(page);
		await page.goto("/", { waitUntil: "networkidle" });
		await waitForHydration(page);

		await expect(page.getByPlaceholder("What's happening?")).toHaveValue("");
	});

	test("hides warning-marked post content until explicitly revealed", async ({ page }) => {
		const content = `Spoiler body ${uniqueId("warning_body")}`;
		const warning = `Spoiler ${uniqueId("warning")}`;

		await page.getByPlaceholder("What's happening?").fill(content);
		await page.getByRole("button", { name: "Content warning" }).click();
		await page.getByLabel("Content warning text").fill(warning);
		await page.getByRole("button", { name: "Post", exact: true }).click();
		await waitForHydration(page);

		const post = page.locator("article").first();
		await expect(post).toBeVisible();
		await expect(post).toContainText("Content warning");
		await expect(post).toContainText(warning);
		await expect(post.getByText(content)).not.toBeVisible();

		await post.getByRole("button", { name: "Show post" }).click();

		await expect(post.getByText(content)).toBeVisible();
	});
});
