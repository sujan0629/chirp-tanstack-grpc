# Frontend Assessment

> **Time limit:** 80 minutes
> **Rules:** LLM and AI tool usage is permitted. All existing E2E tests must pass when you're done.
> **Scope:** You may only modify files under `apps/client-user/` and `packages/proto/`. Do not touch the API.

---

## General Notes

- **Study the codebase before writing any code.** The client has specific conventions for styling, state management, server communication, and component structure. Your code will be evaluated on whether it is **indistinguishable from what the original author would have written.** If deviating from established patterns — then make sure the entire codebase is updated to match your changes.
- Do not install new dependencies unless absolutely necessary. If you do, justify why it is necessary.
- Every task requires E2E tests. Follow the existing test patterns.
- Assume the backend already supports any data you need — stub server functions to return mock data where a real API doesn't exist yet.

---

## Task 1: Rechirp Functionality

Add the ability for users to repost someone else's post to their own profile.

**Expectations:**
- Every post has a repost control alongside the existing action buttons
- Reposted posts appear on the reposter's profile feed, clearly showing the original author and that it was reposted
- A user can undo a repost
- Each post displays its repost count
- A user cannot repost their own posts
- Wire this to server functions following the codebase's existing patterns. Stub the backend responses so the UI is fully interactive
- E2E tests covering: repost, undo, count display, repost appearing on profile, own-post restriction

---

## Task 2: Mentions Autocomplete

The app supports @mentions but offers no assistance while typing. Add an autocomplete experience.

**Expectations:**
- Typing `@` followed by characters in the post composition form shows a dropdown of matching users
- The dropdown must use the existing search capabilities already in the codebase — reuse them
- Keyboard navigation within the dropdown (move through options, confirm to insert, dismiss to close)
- The dropdown should appear near where the user is typing, not just anchored to the form element
- Must handle: `@` at start of text, mid-sentence after a space, multiple mentions in one post. Must NOT trigger inside words (e.g., `email@domain`)
- E2E tests covering: dropdown appearance, user selection, text replacement, non-trigger edge cases

---

## Task 3: Infinite Scroll

The feeds currently load a fixed page of posts. Replace this with infinite scroll.

**Expectations:**
- Home and Explore feeds load more posts as the user scrolls, without a manual "load more" button
- Scroll position must be preserved when navigating to a post detail page and back
- Loading and empty states must be handled
- E2E tests covering: initial load, scroll to load more, scroll position restoration

---

## Task 4: Keyboard-Driven Navigation & Accessibility

Make the app fully operable without a mouse.

**Expectations:**
- Keyboard shortcuts to move between posts in any feed, and to perform actions (like, bookmark, open, reply) on the focused post
- A discoverable help overlay showing all available shortcuts
- Shortcuts must not interfere with normal text input (typing in forms, search, etc.)
- The shortcut system must work across all feed views without route-specific logic
- Focused post must be visually distinguished using the project's existing design language
- E2E tests covering: navigation between posts, action shortcuts, shortcut suppression during text input

---

## Task 5: Post Composition with Drafts & Content Warnings

Add draft saving and content warnings to the post creation flow.

**Expectations:**
- If a user starts writing a post and navigates away without posting, the draft is preserved and restored when they return to any page with the composition form
- Drafts persist across page navigation within the session
- Only one draft exists at a time. Posting clears the draft
- Users can optionally mark a post with a content warning. Posts with warnings show the warning text and require an explicit "show" action before revealing the content
- The content warning field only appears when toggled, keeping the default composition form clean
- E2E tests covering: draft preservation on navigation, draft clearing on post, content warning display and reveal behavior

---

## Submission

- `pnpm install && pnpm build` must succeed with zero errors
- All pre-existing E2E tests must pass
- Your new E2E tests must also pass
- Commit your work with clear, atomic commits
