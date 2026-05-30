import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PostList } from "../components/posts/PostList";
import { useInfinitePosts } from "../components/posts/useInfinitePosts";
import { getCurrentUser } from "../server/functions/auth";
import { getExploreFeed } from "../server/functions/feed";
import { colors, fontSize, fontWeight, radii, semanticColors, spacing } from "../tokens.stylex";

export const Route = createFileRoute("/explore")({
	component: ExplorePage,
});

const styles = stylex.create({
	container: {
		maxWidth: "42rem",
		marginLeft: "auto",
		marginRight: "auto",
		paddingLeft: spacing.lg,
		paddingRight: spacing.lg,
		paddingTop: spacing["2xl"],
		paddingBottom: spacing["3xl"],
	},
	pageHeader: {
		display: "flex",
		alignItems: "center",
		gap: spacing.md,
		marginBottom: spacing["2xl"],
	},
	pageHeaderIcon: {
		width: "2.25rem",
		height: "2.25rem",
		borderRadius: radii.lg,
		backgroundImage: `linear-gradient(135deg, ${colors.emerald500}, ${colors.teal500})`,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		boxShadow: "0 4px 12px -2px rgba(16, 185, 129, 0.25)",
	},
	pageTitle: {
		fontSize: fontSize.xl,
		fontWeight: fontWeight.bold,
		color: semanticColors.textPrimary,
		letterSpacing: "-0.025em",
	},
	pageSubtitle: {
		fontSize: fontSize.xs,
		color: semanticColors.textSecondary,
	},
	postsList: {
		display: "flex",
		flexDirection: "column",
		gap: spacing.md,
	},
	loadMoreSentinel: {
		minHeight: "1px",
	},
	loadingMore: {
		paddingTop: spacing.lg,
		paddingBottom: spacing.lg,
		textAlign: "center",
		color: semanticColors.textSecondary,
		fontSize: fontSize.sm,
	},
	iconWhite: {
		color: colors.white,
	},
});

function ExplorePage() {
	const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentUser>>>(null);
	const [loadingUser, setLoadingUser] = useState(true);

	const fetchExplorePosts = useCallback(
		(options: { limit: number; offset: number }) => getExploreFeed({ data: options }),
		[],
	);
	const {
		posts,
		initialLoading,
		loadingMore,
		hasMore,
		sentinelRef,
		refresh: refreshFeed,
		updatePost,
	} = useInfinitePosts({
		cacheKey: "explore-feed",
		enabled: !loadingUser,
		fetchPosts: fetchExplorePosts,
	});

	const loadUser = useCallback(async () => {
		try {
			const currentUser = await getCurrentUser();
			setUser(currentUser);
		} catch (error) {
			console.error("Failed to load user:", error);
		} finally {
			setLoadingUser(false);
		}
	}, []);

	useEffect(() => {
		void loadUser();
	}, [loadUser]);

	const refreshData = useCallback(async () => {
		await refreshFeed();
	}, [refreshFeed]);

	const handleRepostChange = useCallback(
		(result: { postId: string; reposted: boolean; repostCount: number }) => {
			updatePost(result.postId, (post) => ({
				...post,
				isReposted: result.reposted,
				repostCount: result.repostCount,
			}));
		},
		[updatePost],
	);

	const loading = loadingUser || initialLoading;

	return (
		<div {...stylex.props(styles.container)}>
			{/* Page Header */}
			<div {...stylex.props(styles.pageHeader)}>
				<div {...stylex.props(styles.pageHeaderIcon)}>
					<Compass size={20} {...stylex.props(styles.iconWhite)} />
				</div>
				<div>
					<h1 {...stylex.props(styles.pageTitle)}>Explore</h1>
					<p {...stylex.props(styles.pageSubtitle)}>Discover new posts from everyone</p>
				</div>
			</div>

			{/* Posts */}
			<div {...stylex.props(styles.postsList)}>
				<PostList
					posts={posts}
					loading={loading}
					currentUserId={user?.id}
					onPostDelete={refreshData}
					onRepostChange={handleRepostChange}
				/>
				{hasMore && <div ref={sentinelRef} {...stylex.props(styles.loadMoreSentinel)} />}
				{loadingMore && <div {...stylex.props(styles.loadingMore)}>Loading more posts...</div>}
			</div>
		</div>
	);
}
