import * as stylex from "@stylexjs/stylex";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Repeat2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getRepostStatus, toggleRepost } from "../../server/functions/reposts";
import { colors, radii, semanticColors, spacing } from "../../tokens.stylex";

const queryClient = new QueryClient();

const styles = stylex.create({
	button: {
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
			color: colors.blue500,
			backgroundColor: colors.blue50,
		},
		":disabled": {
			opacity: 0.5,
			cursor: "not-allowed",
		},
	},
	buttonReposted: {
		color: colors.blue500,
		backgroundColor: colors.blue50,
	},
	actionCount: {
		fontSize: "0.875rem",
		fontWeight: 500,
	},
});

interface RepostButtonPost {
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
}

export interface RepostToggleResult {
	postId: string;
	reposted: boolean;
	repostCount: number;
}

interface RepostButtonProps {
	post: RepostButtonPost;
	currentUserId?: string;
	onToggle?: (result: RepostToggleResult) => void;
}

export function RepostButton(props: RepostButtonProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<RepostButtonInner {...props} />
		</QueryClientProvider>
	);
}

function RepostButtonInner({ post, currentUserId, onToggle }: RepostButtonProps) {
	const [reposted, setReposted] = useState(post.isReposted ?? false);
	const [repostCount, setRepostCount] = useState(post.repostCount ?? 0);
	const isOwnPost = currentUserId === post.author.id;

	useEffect(() => {
		let active = true;

		if (!currentUserId) {
			setReposted(false);
			setRepostCount(post.repostCount ?? 0);
			return;
		}

		getRepostStatus({ data: { postId: post.id } })
			.then((status) => {
				if (!active) return;
				setReposted(status.reposted);
				setRepostCount(status.repostCount);
			})
			.catch((error) => {
				console.error("Failed to load repost status:", error);
			});

		return () => {
			active = false;
		};
	}, [currentUserId, post.id, post.repostCount]);

	const mutation = useMutation({
		mutationFn: () =>
			toggleRepost({
				data: {
					post: {
						id: post.id,
						content: post.content,
						createdAt: post.createdAt.toISOString(),
						updatedAt: post.updatedAt.toISOString(),
						author: post.author,
						likeCount: post.likeCount,
						commentCount: post.commentCount,
					},
				},
			}),
		onSuccess: (result) => {
			setReposted(result.reposted);
			setRepostCount(result.repostCount);
			onToggle?.({
				postId: post.id,
				reposted: result.reposted,
				repostCount: result.repostCount,
			});
		},
		onError: (error) => {
			console.error("Failed to toggle repost:", error);
		},
	});

	const disabled = !currentUserId || isOwnPost || mutation.isPending;
	const title = isOwnPost ? "Cannot repost your own post" : reposted ? "Undo repost" : "Repost";

	return (
		<button
			type="button"
			onClick={() => mutation.mutate()}
			disabled={disabled}
			title={title}
			{...stylex.props(styles.button, reposted && styles.buttonReposted)}
		>
			<Repeat2 size={20} />
			<span {...stylex.props(styles.actionCount)}>{repostCount}</span>
		</button>
	);
}
