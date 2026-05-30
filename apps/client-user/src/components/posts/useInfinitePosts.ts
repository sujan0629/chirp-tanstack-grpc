import { useCallback, useEffect, useRef, useState } from "react";
import type { Post } from "./PostList";

const PAGE_SIZE = 10;

interface FeedPostResponse {
	id: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	author: {
		id: string;
		username: string;
		displayName: string;
		avatarUrl?: string | null;
	} | null;
	likeCount: number;
	commentCount: number;
	repostCount?: number;
	isReposted?: boolean;
}

interface FeedCache {
	posts: Post[];
	nextOffset: number;
	hasMore: boolean;
	initialized: boolean;
	scrollY: number;
}

interface UseInfinitePostsOptions {
	cacheKey: string;
	enabled: boolean;
	fetchPosts: (options: { limit: number; offset: number }) => Promise<FeedPostResponse[]>;
}

const feedCache = new Map<string, FeedCache>();

function getScrollStorageKey(cacheKey: string): string {
	return `chirp-feed-scroll:${cacheKey}`;
}

function readStoredScroll(cacheKey: string): number {
	if (typeof window === "undefined") return 0;

	const storedScroll = window.sessionStorage.getItem(getScrollStorageKey(cacheKey));
	return storedScroll ? Number(storedScroll) : 0;
}

function writeStoredScroll(cacheKey: string, scrollY: number): void {
	if (typeof window === "undefined") return;

	window.sessionStorage.setItem(getScrollStorageKey(cacheKey), String(scrollY));
}

function isActiveFeedRoute(cacheKey: string): boolean {
	if (typeof window === "undefined") return false;

	if (cacheKey === "home-feed") return window.location.pathname === "/";
	if (cacheKey === "explore-feed") return window.location.pathname === "/explore";
	return true;
}

function getCache(cacheKey: string): FeedCache {
	const existing = feedCache.get(cacheKey);
	if (existing) {
		return existing;
	}

	const nextCache: FeedCache = {
		posts: [],
		nextOffset: 0,
		hasMore: true,
		initialized: false,
		scrollY: readStoredScroll(cacheKey),
	};
	feedCache.set(cacheKey, nextCache);
	return nextCache;
}

function toRenderablePosts(posts: FeedPostResponse[]): Post[] {
	return posts
		.filter(
			(post): post is FeedPostResponse & { author: NonNullable<FeedPostResponse["author"]> } =>
				post.author !== null,
		)
		.map((post) => ({
			...post,
			author: post.author,
		}));
}

export function useInfinitePosts({ cacheKey, enabled, fetchPosts }: UseInfinitePostsOptions) {
	const cache = getCache(cacheKey);
	const [posts, setPosts] = useState<Post[]>(cache.posts);
	const [initialLoading, setInitialLoading] = useState(enabled && !cache.initialized);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(cache.hasMore);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const loadingRef = useRef(false);

	const loadPage = useCallback(
		async ({ reset }: { reset: boolean }) => {
			if (!enabled || loadingRef.current) return;

			const currentCache = getCache(cacheKey);
			if (!reset && !currentCache.hasMore) return;

			loadingRef.current = true;
			if (reset) {
				setInitialLoading(true);
			} else {
				setLoadingMore(true);
			}

			try {
				const offset = reset ? 0 : currentCache.nextOffset;
				const response = await fetchPosts({ limit: PAGE_SIZE, offset });
				const nextPosts = reset
					? toRenderablePosts(response)
					: [...currentCache.posts, ...toRenderablePosts(response)];
				const nextHasMore = response.length === PAGE_SIZE;

				currentCache.posts = nextPosts;
				currentCache.nextOffset = nextPosts.length;
				currentCache.hasMore = nextHasMore;
				currentCache.initialized = true;

				setPosts(nextPosts);
				setHasMore(nextHasMore);
			} catch (error) {
				console.error("Failed to load feed:", error);
			} finally {
				loadingRef.current = false;
				setInitialLoading(false);
				setLoadingMore(false);
			}
		},
		[cacheKey, enabled, fetchPosts],
	);

	const refresh = useCallback(() => {
		const currentCache = getCache(cacheKey);
		currentCache.posts = [];
		currentCache.nextOffset = 0;
		currentCache.hasMore = true;
		currentCache.initialized = false;
		currentCache.scrollY = 0;
		setPosts([]);
		setHasMore(true);
		return loadPage({ reset: true });
	}, [cacheKey, loadPage]);

	const updatePost = useCallback(
		(postId: string, updater: (post: Post) => Post) => {
			const currentCache = getCache(cacheKey);
			const nextPosts = currentCache.posts.map((post) =>
				post.id === postId ? updater(post) : post,
			);

			currentCache.posts = nextPosts;
			setPosts(nextPosts);
		},
		[cacheKey],
	);

	useEffect(() => {
		if (!enabled) {
			setInitialLoading(false);
			return;
		}

		const currentCache = getCache(cacheKey);
		if (!currentCache.initialized) {
			void loadPage({ reset: true });
			return;
		}

		setPosts(currentCache.posts);
		setHasMore(currentCache.hasMore);
		setInitialLoading(false);

		const restoreScroll = () => {
			window.scrollTo({ top: readStoredScroll(cacheKey) || currentCache.scrollY });
		};

		window.requestAnimationFrame(() => {
			restoreScroll();
			window.requestAnimationFrame(restoreScroll);
		});
		window.setTimeout(restoreScroll, 100);
	}, [cacheKey, enabled, loadPage]);

	useEffect(() => {
		if (!enabled) return;

		const updateScrollPosition = () => {
			if (!isActiveFeedRoute(cacheKey)) return;

			const scrollY = window.scrollY;
			getCache(cacheKey).scrollY = scrollY;
			writeStoredScroll(cacheKey, scrollY);
		};

		window.addEventListener("scroll", updateScrollPosition, { passive: true });

		return () => {
			window.removeEventListener("scroll", updateScrollPosition);
		};
	}, [cacheKey, enabled]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!enabled || !sentinel) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					void loadPage({ reset: false });
				}
			},
			{
				rootMargin: "600px 0px",
				threshold: 0,
			},
		);

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
		};
	}, [enabled, loadPage]);

	return {
		posts,
		initialLoading,
		loadingMore,
		hasMore,
		sentinelRef,
		refresh,
		updatePost,
	};
}
