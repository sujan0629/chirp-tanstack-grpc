import { Button } from "@chirp/ui";
import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import { Edit, Heart, MessageCircle, Repeat2, Trash2 } from "lucide-react";
import { useState } from "react";
import { togglePostLike } from "../../server/functions/likes";
import { deletePost } from "../../server/functions/posts";
import { colors, radii, semanticColors, shadows, spacing } from "../../tokens.stylex";
import { ParsedContent } from "../shared/ParsedContent";
import { RelativeTime } from "../shared/RelativeTime";
import { UserAvatar } from "../users/UserAvatar";
import { BookmarkButton } from "./BookmarkButton";
import { RepostButton, type RepostToggleResult } from "./RepostButton";

const CONTENT_WARNING_PREFIX = "::content-warning:";

function parseContentWarning(content: string): { warning: string; content: string } | null {
	if (!content.startsWith(CONTENT_WARNING_PREFIX)) return null;

	const endIndex = content.indexOf("::\n", CONTENT_WARNING_PREFIX.length);
	if (endIndex === -1) return null;

	return {
		warning: decodeURIComponent(content.slice(CONTENT_WARNING_PREFIX.length, endIndex)),
		content: content.slice(endIndex + 3),
	};
}

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

const heartBeat = stylex.keyframes({
	"0%": { transform: "scale(1)" },
	"25%": { transform: "scale(1.3)" },
	"50%": { transform: "scale(1)" },
	"75%": { transform: "scale(1.3)" },
	"100%": { transform: "scale(1)" },
});

const styles = stylex.create({
	article: {
		backgroundColor: semanticColors.surfaceCard,
		borderRadius: radii.xl,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
		padding: spacing.lg,
		transition: "box-shadow 0.2s",
		animationName: fadeInUp,
		animationDuration: "0.3s",
		animationFillMode: "both",
		":hover": {
			boxShadow: shadows.md,
		},
	},
	articleFocused: {
		boxShadow: `0 0 0 3px ${colors.blue500}, ${shadows.md}`,
	},
	container: {
		display: "flex",
		gap: spacing.md,
	},
	repostMeta: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		marginBottom: spacing.sm,
		marginLeft: "3.5rem",
		color: colors.green600,
		fontSize: "0.8125rem",
		fontWeight: 500,
	},
	content: {
		flex: 1,
		minWidth: 0,
	},
	authorInfo: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		flexWrap: "wrap",
	},
	displayName: {
		fontWeight: 600,
		color: semanticColors.textPrimary,
		textDecoration: "none",
		transition: "color 0.2s",
		":hover": {
			color: colors.blue600,
		},
	},
	username: {
		color: semanticColors.textTertiary,
		fontSize: "0.875rem",
		textDecoration: "none",
		transition: "color 0.2s",
		":hover": {
			color: semanticColors.textSecondary,
		},
	},
	separator: {
		color: semanticColors.textTertiary,
	},
	editedBadge: {
		fontSize: "0.75rem",
		color: semanticColors.textTertiary,
		backgroundColor: semanticColors.bgSecondary,
		paddingLeft: spacing.sm,
		paddingRight: spacing.sm,
		paddingTop: "0.125rem",
		paddingBottom: "0.125rem",
		borderRadius: radii.full,
	},
	postContent: {
		display: "block",
		marginTop: spacing.sm,
		color: semanticColors.textPrimary,
		whiteSpace: "pre-wrap",
		overflowWrap: "break-word",
		lineHeight: 1.625,
		textDecoration: "none",
		transition: "color 0.2s",
		":hover": {
			color: semanticColors.textSecondary,
		},
	},
	warningBox: {
		marginTop: spacing.sm,
		padding: spacing.md,
		borderRadius: radii.lg,
		backgroundColor: semanticColors.bgTertiary,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: semanticColors.borderDefault,
		color: semanticColors.textPrimary,
	},
	warningTitle: {
		fontWeight: 700,
		color: semanticColors.textPrimary,
		marginBottom: spacing.xs,
	},
	warningMessage: {
		backgroundColor: semanticColors.surfaceInput,
		borderRadius: radii.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: semanticColors.borderSubtle,
		color: semanticColors.textSecondary,
		padding: spacing.sm,
	},
	actions: {
		display: "flex",
		alignItems: "center",
		gap: spacing.xs,
		marginTop: spacing.md,
		marginLeft: "-0.5rem",
	},
	actionButton: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		paddingLeft: spacing.sm,
		paddingRight: spacing.sm,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		borderRadius: radii.full,
		transition: "all 0.2s",
		backgroundColor: "transparent",
		border: "none",
		cursor: "pointer",
		color: semanticColors.textTertiary,
		":hover": {
			color: colors.red500,
			backgroundColor: colors.red50,
		},
		":disabled": {
			opacity: 0.5,
			cursor: "not-allowed",
		},
	},
	actionButtonLiked: {
		color: colors.red500,
		backgroundColor: colors.red50,
	},
	commentLink: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		paddingLeft: spacing.sm,
		paddingRight: spacing.sm,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		borderRadius: radii.full,
		color: semanticColors.textTertiary,
		textDecoration: "none",
		transition: "all 0.2s",
		":hover": {
			color: colors.blue500,
			backgroundColor: colors.blue50,
		},
	},
	actionCount: {
		fontSize: "0.875rem",
		fontWeight: 500,
	},
	ownerActions: {
		flex: 1,
		display: "flex",
		justifyContent: "flex-end",
		gap: spacing.xs,
	},
	iconButton: {
		padding: spacing.sm,
		borderRadius: radii.full,
		backgroundColor: "transparent",
		border: "none",
		cursor: "pointer",
		color: semanticColors.textTertiary,
		transition: "all 0.2s",
		":hover": {
			color: colors.blue500,
			backgroundColor: colors.blue50,
		},
		":disabled": {
			opacity: 0.5,
			cursor: "not-allowed",
		},
	},
	iconButtonDanger: {
		":hover": {
			color: colors.red500,
			backgroundColor: colors.red50,
		},
	},
	heartFilled: {
		fill: "currentColor",
	},
	heartBeat: {
		animationName: heartBeat,
		animationDuration: "0.4s",
	},
});

interface PostCardProps {
	post: {
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
	};
	currentUserId?: string;
	focused?: boolean;
	onDelete?: () => void;
	onRepostChange?: (result: RepostToggleResult) => void;
}

export function PostCard({
	post,
	currentUserId,
	focused,
	onDelete,
	onRepostChange,
}: PostCardProps) {
	const [liked, setLiked] = useState(false);
	const [likeCount, setLikeCount] = useState(post.likeCount);
	const [loading, setLoading] = useState(false);
	const [animateLike, setAnimateLike] = useState(false);
	const warning = parseContentWarning(post.content);
	const [warningRevealed, setWarningRevealed] = useState(warning === null);
	const displayContent = warning?.content ?? post.content;

	const isOwnPost = currentUserId === post.author.id;
	const canEdit = isOwnPost && Date.now() - post.createdAt.getTime() < 5 * 60 * 1000;

	const handleLike = async () => {
		if (loading) return;
		setLoading(true);

		try {
			const result = await togglePostLike({ data: post.id });
			setLiked(result.liked);
			setLikeCount((prev) => (result.liked ? prev + 1 : prev - 1));
			if (result.liked) {
				setAnimateLike(true);
				setTimeout(() => setAnimateLike(false), 400);
			}
		} catch (error) {
			console.error("Failed to like post:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm("Are you sure you want to delete this post?")) return;

		setLoading(true);
		try {
			await deletePost({ data: post.id });
			onDelete?.();
		} catch (error) {
			console.error("Failed to delete post:", error);
			alert("Failed to delete post");
		} finally {
			setLoading(false);
		}
	};

	return (
		<article
			data-post-id={post.id}
			aria-current={focused ? "true" : undefined}
			tabIndex={focused ? 0 : -1}
			{...stylex.props(styles.article, focused && styles.articleFocused)}
		>
			{post.repost && (
				<div {...stylex.props(styles.repostMeta)}>
					<Repeat2 size={16} />
					<span>{post.repost.repostedBy.displayName} reposted</span>
				</div>
			)}
			<div {...stylex.props(styles.container)}>
				<Link to="/users/$username" params={{ username: post.author.username }}>
					<UserAvatar avatarUrl={post.author.avatarUrl} username={post.author.username} />
				</Link>

				<div {...stylex.props(styles.content)}>
					{/* Author Info */}
					<div {...stylex.props(styles.authorInfo)}>
						<Link
							to="/users/$username"
							params={{ username: post.author.username }}
							{...stylex.props(styles.displayName)}
						>
							{post.author.displayName}
						</Link>
						<Link
							to="/users/$username"
							params={{ username: post.author.username }}
							{...stylex.props(styles.username)}
						>
							@{post.author.username}
						</Link>
						<span {...stylex.props(styles.separator)}>·</span>
						<RelativeTime date={post.createdAt} />
						{post.updatedAt.getTime() !== post.createdAt.getTime() && (
							<span {...stylex.props(styles.editedBadge)}>edited</span>
						)}
					</div>

					{/* Post Content */}
					{warning && !warningRevealed ? (
						<div {...stylex.props(styles.warningBox)}>
							<div {...stylex.props(styles.warningTitle)}>Content warning</div>
							<div {...stylex.props(styles.warningMessage)}>{warning.warning}</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setWarningRevealed(true)}
								style={{ backgroundColor: "rgba(148, 163, 184, 0.16)", marginTop: "0.5rem" }}
							>
								Show post
							</Button>
						</div>
					) : (
						<Link
							to="/posts/$postId"
							params={{ postId: post.id }}
							data-post-action="open"
							{...stylex.props(styles.postContent)}
						>
							<ParsedContent content={displayContent} />
						</Link>
					)}

					{/* Actions */}
					<div {...stylex.props(styles.actions)}>
						<button
							type="button"
							onClick={handleLike}
							disabled={loading}
							title={liked ? "Unlike" : "Like"}
							aria-label={liked ? "Unlike" : "Like"}
							{...stylex.props(styles.actionButton, liked && styles.actionButtonLiked)}
						>
							<Heart
								size={20}
								{...stylex.props(liked && styles.heartFilled, animateLike && styles.heartBeat)}
							/>
							<span {...stylex.props(styles.actionCount)}>{likeCount}</span>
						</button>

						<Link
							to="/posts/$postId"
							params={{ postId: post.id }}
							aria-label="Reply"
							data-post-action="reply"
							{...stylex.props(styles.commentLink)}
						>
							<MessageCircle size={20} />
							<span {...stylex.props(styles.actionCount)}>{post.commentCount}</span>
						</Link>

						<BookmarkButton postId={post.id} />

						<RepostButton post={post} currentUserId={currentUserId} onToggle={onRepostChange} />

						{isOwnPost && (
							<div {...stylex.props(styles.ownerActions)}>
								{canEdit && (
									<Link
										to="/posts/$postId"
										params={{ postId: post.id }}
										{...stylex.props(styles.iconButton)}
										title="Edit post"
									>
										<Edit size={16} />
									</Link>
								)}
								<button
									type="button"
									onClick={handleDelete}
									disabled={loading}
									{...stylex.props(styles.iconButton, styles.iconButtonDanger)}
									title="Delete post"
								>
									<Trash2 size={16} />
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</article>
	);
}
