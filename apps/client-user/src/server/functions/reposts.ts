import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "../../lib/session.server";

interface RepostAuthor {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string | null;
}

interface RepostablePost {
	id: string;
	content: string;
	createdAt: string;
	updatedAt: string;
	author: RepostAuthor;
	likeCount: number;
	commentCount: number;
}

interface RepostRecord {
	post: RepostablePost;
	repostedBy: {
		id: string;
		username: string;
		displayName: string;
	};
	repostedAt: string;
}

const reposts = new Map<string, RepostRecord>();

function getRepostKey(userId: string, postId: string): string {
	return `${userId}:${postId}`;
}

function getRepostCount(postId: string): number {
	let count = 0;
	for (const record of reposts.values()) {
		if (record.post.id === postId) {
			count += 1;
		}
	}
	return count;
}

function mapRepostRecord(record: RepostRecord) {
	return {
		...record.post,
		createdAt: new Date(record.post.createdAt),
		updatedAt: new Date(record.post.updatedAt),
		repostCount: getRepostCount(record.post.id),
		isReposted: true,
		repost: {
			repostedBy: record.repostedBy,
			repostedAt: new Date(record.repostedAt),
		},
	};
}

export const getRepostStatus = createServerFn()
	.inputValidator((d: { postId: string }) => d)
	.handler(async ({ data }) => {
		const session = await requireAuth();
		const key = getRepostKey(session.userId, data.postId);

		return {
			reposted: reposts.has(key),
			repostCount: getRepostCount(data.postId),
		};
	});

export const toggleRepost = createServerFn({ method: "POST" })
	.inputValidator((d: { post: RepostablePost }) => d)
	.handler(async ({ data }) => {
		const session = await requireAuth();

		if (data.post.author.id === session.userId) {
			throw new Error("You cannot repost your own post");
		}

		const key = getRepostKey(session.userId, data.post.id);
		const existing = reposts.get(key);

		if (existing) {
			reposts.delete(key);
			return {
				success: true,
				reposted: false,
				repostCount: getRepostCount(data.post.id),
			};
		}

		reposts.set(key, {
			post: data.post,
			repostedBy: {
				id: session.userId,
				username: session.username,
				displayName: session.username,
			},
			repostedAt: new Date().toISOString(),
		});

		return {
			success: true,
			reposted: true,
			repostCount: getRepostCount(data.post.id),
		};
	});

export const getUserReposts = createServerFn()
	.inputValidator((d: { username: string }) => d)
	.handler(async ({ data }) => {
		return Array.from(reposts.values())
			.filter((record) => record.repostedBy.username === data.username)
			.sort((a, b) => new Date(b.repostedAt).getTime() - new Date(a.repostedAt).getTime())
			.map(mapRepostRecord);
	});
