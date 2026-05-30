import * as stylex from "@stylexjs/stylex";
import { AlertCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPost } from "../../server/functions/posts";
import { searchUsers } from "../../server/functions/search";
import { colors, radii, semanticColors, shadows, spacing, zIndex } from "../../tokens.stylex";
import { CharacterCount } from "../shared/CharacterCount";
import { UserAvatar } from "../users/UserAvatar";

const spin = stylex.keyframes({
	from: { transform: "rotate(0deg)" },
	to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
	form: {
		backgroundColor: semanticColors.surfaceCard,
		borderRadius: radii.xl,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
		padding: spacing.lg,
	},
	errorBox: {
		marginBottom: spacing.md,
		padding: spacing.sm,
		backgroundColor: semanticColors.errorBg,
		color: semanticColors.error,
		borderRadius: radii.lg,
		fontSize: "0.8125rem",
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		border: semanticColors.errorBorder,
	},
	errorIcon: {
		flexShrink: 0,
	},
	inputWrapper: {
		position: "relative",
		borderRadius: radii.lg,
		backgroundColor: semanticColors.surfaceInput,
		transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
	},
	inputWrapperFocused: {
		backgroundColor: semanticColors.surfaceCard,
		boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.12)",
	},
	textarea: {
		width: "100%",
		padding: spacing.md,
		fontSize: "0.9375rem",
		backgroundColor: "transparent",
		resize: "none",
		border: "none",
		outline: "none",
		lineHeight: "1.6",
		"::placeholder": {
			color: semanticColors.textTertiary,
		},
	},
	mentionsMenu: {
		position: "absolute",
		zIndex: zIndex.popover,
		width: "15rem",
		maxHeight: "14rem",
		overflowY: "auto",
		backgroundColor: semanticColors.surfaceCard,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: semanticColors.borderDefault,
		borderRadius: radii.lg,
		boxShadow: shadows.lg,
		paddingTop: spacing.xs,
		paddingBottom: spacing.xs,
	},
	mentionOption: {
		width: "100%",
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		paddingLeft: spacing.sm,
		paddingRight: spacing.sm,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		backgroundColor: "transparent",
		border: "none",
		cursor: "pointer",
		textAlign: "left",
		":hover": {
			backgroundColor: semanticColors.bgHover,
		},
	},
	mentionOptionActive: {
		backgroundColor: semanticColors.primaryLight,
	},
	mentionUserInfo: {
		minWidth: 0,
	},
	mentionDisplayName: {
		color: semanticColors.textPrimary,
		fontSize: "0.875rem",
		fontWeight: 600,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	mentionUsername: {
		color: semanticColors.textSecondary,
		fontSize: "0.75rem",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	footer: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: spacing.md,
	},
	submitButton: {
		display: "flex",
		alignItems: "center",
		gap: spacing.sm,
		paddingLeft: spacing.xl,
		paddingRight: spacing.xl,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		backgroundImage: `linear-gradient(135deg, ${colors.indigo500}, ${colors.blue600})`,
		color: colors.white,
		borderRadius: radii.lg,
		fontWeight: 600,
		fontSize: "0.875rem",
		border: "none",
		cursor: "pointer",
		transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
		boxShadow: "0 4px 12px -2px rgba(99, 102, 241, 0.25)",
		":hover": {
			boxShadow: "0 6px 16px -2px rgba(99, 102, 241, 0.35)",
			transform: "translateY(-1px)",
		},
		":disabled": {
			opacity: 0.5,
			cursor: "not-allowed",
			boxShadow: "none",
			transform: "none",
		},
	},
	spinner: {
		width: "1rem",
		height: "1rem",
		borderWidth: "2px",
		borderStyle: "solid",
		borderColor: "rgba(255, 255, 255, 0.3)",
		borderTopColor: colors.white,
		borderRadius: radii.full,
		animationName: spin,
		animationDuration: "0.7s",
		animationIterationCount: "infinite",
		animationTimingFunction: "linear",
	},
});

interface MentionUser {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	bio?: string;
}

interface ActiveMention {
	start: number;
	query: string;
}

interface MentionMenuPosition {
	top: number;
	left: number;
}

function getActiveMention(value: string, cursor: number): ActiveMention | null {
	const beforeCursor = value.slice(0, cursor);
	const match = /(^|\s)@([a-zA-Z0-9_]*)$/.exec(beforeCursor);

	if (!match || match[2].length === 0) {
		return null;
	}

	return {
		start: beforeCursor.length - match[2].length - 1,
		query: match[2],
	};
}

function getMentionMenuPosition(
	textarea: HTMLTextAreaElement,
	mentionStart: number,
): MentionMenuPosition {
	const style = window.getComputedStyle(textarea);
	const lineHeight = Number.parseFloat(style.lineHeight) || 24;
	const fontSize = Number.parseFloat(style.fontSize) || 15;
	const averageCharacterWidth = fontSize * 0.55;
	const textBeforeMention = textarea.value.slice(0, mentionStart);
	const currentLine = textBeforeMention.split("\n").at(-1) ?? "";
	const lines = textBeforeMention.split("\n").length - 1;

	return {
		top:
			textarea.offsetTop +
			textarea.scrollTop +
			spacingToNumber(style.paddingTop) +
			(lines + 1) * lineHeight,
		left:
			textarea.offsetLeft +
			spacingToNumber(style.paddingLeft) +
			Math.min(currentLine.length * averageCharacterWidth, textarea.clientWidth - 240),
	};
}

function spacingToNumber(value: string): number {
	const parsed = Number.parseFloat(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

export function PostForm({ onSuccess }: { onSuccess?: () => void }) {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
	const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
	const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
	const [mentionMenuPosition, setMentionMenuPosition] = useState<MentionMenuPosition>({
		top: 0,
		left: 0,
	});
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (!activeMention) {
			setMentionUsers([]);
			setSelectedMentionIndex(0);
			return;
		}

		let active = true;
		const timeout = window.setTimeout(() => {
			searchUsers({ data: activeMention.query })
				.then((users) => {
					if (!active) return;
					setMentionUsers(users.slice(0, 5));
					setSelectedMentionIndex(0);
				})
				.catch((err) => {
					console.error("Mention search failed:", err);
					if (active) {
						setMentionUsers([]);
					}
				});
		}, 150);

		return () => {
			active = false;
			window.clearTimeout(timeout);
		};
	}, [activeMention]);

	const updateMentionState = (value: string, cursor: number) => {
		const mention = getActiveMention(value, cursor);
		setActiveMention(mention);

		const textarea = textareaRef.current;
		if (mention && textarea) {
			setMentionMenuPosition(getMentionMenuPosition(textarea, mention.start));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (content.trim().length === 0) return;

		setLoading(true);
		setError("");

		try {
			await createPost({ data: { content } });
			setContent("");
			setActiveMention(null);
			onSuccess?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create post");
		} finally {
			setLoading(false);
		}
	};

	const insertMention = (user: MentionUser) => {
		if (!activeMention) return;

		const textarea = textareaRef.current;
		const cursor = textarea?.selectionStart ?? content.length;
		const replacement = `@${user.username} `;
		const nextContent = `${content.slice(0, activeMention.start)}${replacement}${content.slice(cursor)}`;
		const nextCursor = activeMention.start + replacement.length;

		setContent(nextContent);
		setActiveMention(null);
		setMentionUsers([]);

		window.requestAnimationFrame(() => {
			textarea?.focus();
			textarea?.setSelectionRange(nextCursor, nextCursor);
		});
	};

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const nextContent = e.target.value;
		setContent(nextContent);
		updateMentionState(nextContent, e.target.selectionStart);
	};

	const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (!activeMention || mentionUsers.length === 0) {
			return;
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedMentionIndex((index) => (index + 1) % mentionUsers.length);
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedMentionIndex((index) => (index - 1 + mentionUsers.length) % mentionUsers.length);
			return;
		}

		if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			insertMention(mentionUsers[selectedMentionIndex]);
			return;
		}

		if (e.key === "Escape") {
			e.preventDefault();
			setActiveMention(null);
			setMentionUsers([]);
		}
	};

	const showMentionMenu = activeMention !== null && mentionUsers.length > 0;

	return (
		<form onSubmit={handleSubmit} {...stylex.props(styles.form)}>
			{error && (
				<div {...stylex.props(styles.errorBox)}>
					<AlertCircle {...stylex.props(styles.errorIcon)} size={16} />
					{error}
				</div>
			)}

			<div {...stylex.props(styles.inputWrapper, isFocused && styles.inputWrapperFocused)}>
				<textarea
					ref={textareaRef}
					value={content}
					onChange={handleTextareaChange}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					onKeyDown={handleTextareaKeyDown}
					onClick={(e) => updateMentionState(content, e.currentTarget.selectionStart)}
					onKeyUp={(e) => updateMentionState(content, e.currentTarget.selectionStart)}
					placeholder="What's happening?"
					{...stylex.props(styles.textarea)}
					rows={3}
					maxLength={280}
					aria-controls={showMentionMenu ? "mention-suggestions" : undefined}
					aria-autocomplete="list"
				/>
				{showMentionMenu && (
					<div
						id="mention-suggestions"
						role="listbox"
						aria-label="Mention suggestions"
						{...stylex.props(styles.mentionsMenu)}
						style={{
							top: mentionMenuPosition.top,
							left: mentionMenuPosition.left,
						}}
					>
						{mentionUsers.map((user, index) => (
							<button
								key={user.id}
								type="button"
								role="option"
								aria-selected={selectedMentionIndex === index}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => insertMention(user)}
								{...stylex.props(
									styles.mentionOption,
									selectedMentionIndex === index && styles.mentionOptionActive,
								)}
							>
								<UserAvatar avatarUrl={user.avatarUrl} username={user.username} size="sm" />
								<span {...stylex.props(styles.mentionUserInfo)}>
									<span {...stylex.props(styles.mentionDisplayName)}>{user.displayName}</span>
									<span {...stylex.props(styles.mentionUsername)}>@{user.username}</span>
								</span>
							</button>
						))}
					</div>
				)}
			</div>

			<div {...stylex.props(styles.footer)}>
				<CharacterCount count={content.length} max={280} />
				<button
					type="submit"
					disabled={loading || content.trim().length === 0 || content.length > 280}
					{...stylex.props(styles.submitButton)}
				>
					{loading ? (
						<>
							<div {...stylex.props(styles.spinner)} />
							Posting...
						</>
					) : (
						<>
							<Send size={20} />
							Post
						</>
					)}
				</button>
			</div>
		</form>
	);
}
