import * as stylex from "@stylexjs/stylex";
import {
	type ChangeEvent,
	type KeyboardEvent,
	type SyntheticEvent,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { searchUsers } from "../../server/functions/search";
import { radii, semanticColors, shadows, spacing, zIndex } from "../../tokens.stylex";
import { UserAvatar } from "../users/UserAvatar";

const styles = stylex.create({
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

interface UseMentionAutocompleteOptions {
	value: string;
	onChange: (value: string) => void;
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

export function useMentionAutocomplete({ value, onChange }: UseMentionAutocompleteOptions) {
	const generatedId = useId();
	const menuId = `mention-suggestions-${generatedId}`;
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
	const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
	const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
	const [mentionMenuPosition, setMentionMenuPosition] = useState<MentionMenuPosition>({
		top: 0,
		left: 0,
	});

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
				.catch((error) => {
					console.error("Mention search failed:", error);
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

	const updateMentionState = (nextValue: string, cursor: number) => {
		const mention = getActiveMention(nextValue, cursor);
		setActiveMention(mention);

		const textarea = textareaRef.current;
		if (mention && textarea) {
			setMentionMenuPosition(getMentionMenuPosition(textarea, mention.start));
		}
	};

	const closeMentionMenu = () => {
		setActiveMention(null);
		setMentionUsers([]);
	};

	const insertMention = (user: MentionUser) => {
		if (!activeMention) return;

		const textarea = textareaRef.current;
		const cursor = textarea?.selectionStart ?? value.length;
		const replacement = `@${user.username} `;
		const nextValue = `${value.slice(0, activeMention.start)}${replacement}${value.slice(cursor)}`;
		const nextCursor = activeMention.start + replacement.length;

		onChange(nextValue);
		closeMentionMenu();

		window.requestAnimationFrame(() => {
			textarea?.focus();
			textarea?.setSelectionRange(nextCursor, nextCursor);
		});
	};

	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const nextValue = event.target.value;
		onChange(nextValue);
		updateMentionState(nextValue, event.target.selectionStart);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (!activeMention || mentionUsers.length === 0) {
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelectedMentionIndex((index) => (index + 1) % mentionUsers.length);
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelectedMentionIndex((index) => (index - 1 + mentionUsers.length) % mentionUsers.length);
			return;
		}

		if (event.key === "Enter" || event.key === "Tab") {
			event.preventDefault();
			insertMention(mentionUsers[selectedMentionIndex]);
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			closeMentionMenu();
		}
	};

	const handleCursorMove = (event: SyntheticEvent<HTMLTextAreaElement>) => {
		updateMentionState(value, event.currentTarget.selectionStart);
	};

	const showMentionMenu = activeMention !== null && mentionUsers.length > 0;

	const mentionMenu = showMentionMenu ? (
		<div
			id={menuId}
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
					onMouseDown={(event) => event.preventDefault()}
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
	) : null;

	return {
		textareaRef,
		handleChange,
		handleKeyDown,
		handleCursorMove,
		closeMentionMenu,
		mentionMenu,
		mentionTextareaProps: {
			"aria-autocomplete": "list" as const,
			"aria-controls": showMentionMenu ? menuId : undefined,
		},
	};
}
