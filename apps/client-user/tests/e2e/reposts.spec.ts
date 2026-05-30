import { expect, test } from "@playwright/test";
import { createPost, loginAs, uniqueId, waitForHydration } from "./fixtures/test-helpers";

test.describe.configure({ mode: "serial" });

async function deleteOwnPostsMatching(page: Parameters<typeof createPost>[0], pattern: RegExp) {
	await page.goto("/users/alice", { waitUntil: "networkidle" });
	await waitForHydration(page);

	while (await page.locator("article").filter({ hasText: pattern }).first().isVisible()) {
		const post = page.locator("article").filter({ hasText: pattern }).first();
		const deleteButton = post.getByTitle("Delete post");

		page.once("dialog", (dialog) => {
			void dialog.accept();
		});
		await deleteButton.click();
		await waitForHydration(page);
		await expect(post).not.toBeVisible({ timeout: 10000 });
	}
}

test.describe("reposts", () => {
	test("allows reposting another user's post, shows it on the reposter profile, and supports undo", async ({
		page,
	}) => {
		const content = `Repost target ${uniqueId("repost")}`;

		await loginAs(page, "alice");
		await deleteOwnPostsMatching(page, /Repost target|Own repost restriction/);
		await page.goto("/", { waitUntil: "networkidle" });
		await waitForHydration(page);
		await createPost(page, content);
		await page.locator('button[title="Logout"]').click();
		await expect(page).toHaveURL("/auth/login");

		await loginAs(page, "bob");
		await page.goto("/users/alice", { waitUntil: "networkidle" });
		await waitForHydration(page);

		const sourcePost = page.locator("article").filter({ hasText: content }).first();
		await expect(sourcePost).toBeVisible();

		const repostButton = sourcePost.locator('button[title="Repost"]');
		await expect(repostButton).toBeVisible();
		await expect(repostButton).toHaveText(/0/);

		await repostButton.click();
		await expect(sourcePost.locator('button[title="Undo repost"]')).toHaveText(/1/);

		await page.goto("/users/bob", { waitUntil: "networkidle" });
		await waitForHydration(page);

		const repostedPost = page.locator("article").filter({ hasText: content }).first();
		await expect(repostedPost).toBeVisible();
		await expect(repostedPost).toContainText("Alice Johnson");
		await expect(repostedPost).toContainText("Bob Smith reposted");

		await repostedPost.locator('button[title="Undo repost"]').click();
		await expect(page.locator("article").filter({ hasText: content })).not.toBeVisible();

		await page.locator('button[title="Logout"]').click();
		await loginAs(page, "alice");
		await deleteOwnPostsMatching(page, new RegExp(content));
	});

	test("prevents users from reposting their own posts", async ({ page }) => {
		const content = `Own repost restriction ${uniqueId("own_repost")}`;

		await loginAs(page, "alice");
		await createPost(page, content);

		const ownPost = page.locator("article").filter({ hasText: content }).first();
		const ownRepostButton = ownPost.locator('button[title="Cannot repost your own post"]');

		await expect(ownRepostButton).toBeVisible();
		await expect(ownRepostButton).toBeDisabled();

		await deleteOwnPostsMatching(page, new RegExp(content));
	});
});
