import * as stylex from "@stylexjs/stylex";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { colors, radii, spacing } from "../../tokens.stylex";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { PostCard } from "./PostCard";
import type { RepostToggleResult } from "./RepostButton";

const fadeInUp = stylex.keyframes({
	from: {
		opacity: 0,
		transform: "translateY(10px)",
	},
	to: {
		opacity: 1,
		transform: "translateY(0)",
	},
});

const styles = stylex.create({
	loadingContainer: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		paddingTop: spacing.xl,
		paddingBottom: spacing.xl,
	},
	emptyState: {
		backgroundColor: colors.white,
		borderRadius: radii.xl,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
		padding: spacing.xl,
		textAlign: "center",
	},
	emptyIcon: {
		width: "4rem",
		height: "4rem",
		borderRadius: radii.xl,
		backgroundColor: colors.gray100,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: "auto",
		marginRight: "auto",
		marginBottom: spacing.md,
	},
	emptyTitle: {
		fontSize: "1.125rem",
		fontWeight: 600,
		color: colors.gray900,
		marginBottom: spacing.sm,
	},
	emptyText: {
		color: colors.gray500,
	},
	postList: {
		display: "flex",
		flexDirection: "column",
		gap: spacing.md,
	},
	postItem: {
		animationName: fadeInUp,
		animationDuration: "0.3s",
		animationFillMode: "both",
	},
	helpBackdrop: {
		position: "fixed",
		inset: 0,
		backgroundColor: "rgba(15, 23, 42, 0.45)",
		zIndex: 50,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.lg,
	},
	helpDialog: {
		width: "min(100%, 28rem)",
		backgroundColor: colors.white,
		borderRadius: radii.xl,
		boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.35)",
		padding: spacing.xl,
	},
	helpTitle: {
		fontSize: "1.125rem",
		fontWeight: 700,
		color: colors.gray900,
		marginBottom: spacing.md,
	},
	shortcutList: {
		display: "grid",
		gap: spacing.sm,
	},
	shortcutRow: {
		display: "flex",
		justifyContent: "space-between",
		gap: spacing.lg,
		color: colors.gray700,
	},
	shortcutKey: {
		minWidth: "4rem",
		textAlign: "center",
		borderRadius: radii.md,
		backgroundColor: colors.gray100,
		color: colors.gray900,
		fontWeight: 700,
		paddingTop: "0.125rem",
		paddingBottom: "0.125rem",
	},
});

export interface Post {
	id: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	author: {
		id: string;
		username: string;
		displayName: string;
		avatarUrl?: string | null;
	};
	likeCount: number;
	commentCount: number;
	repostCount?: number;
	isReposted?: boolean;
	repost?: {
		repostedBy: {
			id: string;
			username: string;
			displayName: string;
		};
		repostedAt: Date;
	};
}

export function PostList({
	posts,
	loading,
	currentUserId,
	onPostDelete,
	onRepostChange,
}: {
	posts: Post[];
	loading?: boolean;
	currentUserId?: string;
	onPostDelete?: () => void;
	onRepostChange?: (result: RepostToggleResult) => void;
}) {
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [showShortcuts, setShowShortcuts] = useState(false);
	const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

	const focusPost = useCallback(
		(nextIndex: number) => {
			const boundedIndex = Math.max(0, Math.min(nextIndex, posts.length - 1));
			setFocusedIndex(boundedIndex);
			itemRefs.current[boundedIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
			itemRefs.current[boundedIndex]?.querySelector("article")?.focus({ preventScroll: true });
		},
		[posts.length],
	);

	useEffect(() => {
		setFocusedIndex((currentIndex) => Math.min(currentIndex, Math.max(posts.length - 1, 0)));
	}, [posts.length]);

	useEffect(() => {
		const isTextInput = (target: EventTarget | null): boolean => {
			if (!(target instanceof HTMLElement)) return false;
			const tagName = target.tagName.toLowerCase();
			return (
				target.isContentEditable ||
				tagName === "input" ||
				tagName === "textarea" ||
				tagName === "select"
			);
		};

		const clickFocusedControl = (selector: string) => {
			itemRefs.current[focusedIndex]
				?.querySelector<HTMLButtonElement | HTMLAnchorElement>(selector)
				?.click();
		};

		const focusReplyAfterOpen = () => {
			const postId = posts[focusedIndex]?.id;
			if (postId) {
				window.sessionStorage.setItem("focusReplyPostId", postId);
			}
			clickFocusedControl('a[data-post-action="reply"]');
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isTextInput(event.target)) return;

			if (event.key === "Escape" && showShortcuts) {
				event.preventDefault();
				setShowShortcuts(false);
				return;
			}

			if (event.key === "?") {
				event.preventDefault();
				setShowShortcuts((visible) => !visible);
				return;
			}

			if (showShortcuts || posts.length === 0) return;

			if (event.key === "j" || event.key === "ArrowDown") {
				event.preventDefault();
				focusPost(focusedIndex + 1);
				return;
			}

			if (event.key === "k" || event.key === "ArrowUp") {
				event.preventDefault();
				focusPost(focusedIndex - 1);
				return;
			}

			if (event.key === "l") {
				event.preventDefault();
				clickFocusedControl('button[aria-label="Like"], button[aria-label="Unlike"]');
				return;
			}

			if (event.key === "b") {
				event.preventDefault();
				clickFocusedControl('button[aria-label="Bookmark"], button[aria-label="Remove bookmark"]');
				return;
			}

			if (event.key === "r") {
				event.preventDefault();
				focusReplyAfterOpen();
				return;
			}

			if (event.key === "o" || event.key === "Enter") {
				event.preventDefault();
				clickFocusedControl('a[data-post-action="open"]');
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [focusPost, focusedIndex, posts.length, showShortcuts]);

	if (loading) {
		return (
			<div {...stylex.props(styles.loadingContainer)}>
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (posts.length === 0) {
		return (
			<div {...stylex.props(styles.emptyState)}>
				<div {...stylex.props(styles.emptyIcon)}>
					<FileText size={32} color={colors.gray400} />
				</div>
				<h3 {...stylex.props(styles.emptyTitle)}>No posts yet</h3>
				<p {...stylex.props(styles.emptyText)}>Be the first to share something!</p>
			</div>
		);
	}

	return (
		<>
			<div {...stylex.props(styles.postList)} role="feed" aria-label="Posts feed">
				{posts.map((post, index) => (
					<div
						key={post.id}
						ref={(element) => {
							itemRefs.current[index] = element;
						}}
						style={{ animationDelay: `${index * 50}ms` }}
						{...stylex.props(styles.postItem)}
					>
						<PostCard
							post={post}
							currentUserId={currentUserId}
							focused={index === focusedIndex}
							onDelete={onPostDelete}
							onRepostChange={onRepostChange}
						/>
					</div>
				))}
			</div>
			{showShortcuts && (
				<div {...stylex.props(styles.helpBackdrop)}>
					<div
						role="dialog"
						aria-modal="true"
						aria-label="Keyboard shortcuts"
						{...stylex.props(styles.helpDialog)}
					>
						<h2 {...stylex.props(styles.helpTitle)}>Keyboard shortcuts</h2>
						<div {...stylex.props(styles.shortcutList)}>
							<div {...stylex.props(styles.shortcutRow)}>
								<span>Next post</span>
								<kbd {...stylex.props(styles.shortcutKey)}>J / Down</kbd>
							</div>
							<div {...stylex.props(styles.shortcutRow)}>
								<span>Previous post</span>
								<kbd {...stylex.props(styles.shortcutKey)}>K / Up</kbd>
							</div>
							<div {...stylex.props(styles.shortcutRow)}>
								<span>Open post</span>
								<kbd {...stylex.props(styles.shortcutKey)}>O / Enter</kbd>
							</div>
							<div {...stylex.props(styles.shortcutRow)}>
								<span>Reply</span>
								<kbd {...stylex.props(styles.shortcutKey)}>R</kbd>
							</div>
							<div {...stylex.props(styles.shortcutRow)}>
								<span>Like</span>
								<kbd {...stylex.props(styles.shortcutKey)}>L</kbd>
							</div>
							<div {...stylex.props(styles.shortcutRow)}>
								<span>Bookmark</span>
								<kbd {...stylex.props(styles.shortcutKey)}>B</kbd>
							</div>
							<div {...stylex.props(styles.shortcutRow)}>
								<span>Close help</span>
								<kbd {...stylex.props(styles.shortcutKey)}>Esc</kbd>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
