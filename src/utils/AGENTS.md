# utils/ — Utility Functions

## Purpose

Pure, stateless transformation helpers with no side effects, no DOM access, and no React state. Currently contains one file.

## Ownership

- Owner: Mark
- Consumers: `MessageItem.jsx` imports `roleplayFormatter.jsx` for chat text rendering.

## File Inventory

### `roleplayFormatter.jsx`

- Exports a React component (or render function) that formats roleplay text:
  - `*text*` (asterisk-wrapped) → soft purple italic (physical actions and expressions)
  - `"text"` (double-quoted) → crisp high-contrast white (spoken dialogue)
- Pure: given a string, returns consistent JSX. No state, no effects.
- Used exclusively in `MessageItem.jsx`. Do not duplicate this logic elsewhere.

### `macroUtils.js`

- Exports pure macro-replacement functions:
  - `replaceMacros(text, { userName, charName })`: Replaces `{{user}}` and `{{char}}` (case-insensitive) with respective participant names.
  - `resolveCharacterMacros(character, userPersona)`: Returns a shallow copy of a character card with macros resolved across narrative text fields (`tagline`, `personality`, `scenario`, `systemPrompt`, `greeting`).
- Pure: stateless string operations. No side effects, no React state.

## Local Contracts

- All files in this folder must be pure functions or pure React render helpers.
- No `localStorage`, no `fetch`, no React hooks (`useState`, `useEffect`, etc.).
- If a helper requires state or side effects it belongs in `services/` or `components/`, not here.

## Work Guidance

- When adding a new text-transformation utility, create a new `.js` or `.jsx` file named after its purpose.
- Prefer named exports.
- Keep each utility focused on a single concern.

## Verification

- `npm run lint` must pass after any edit.

## Child DOX Index

No sub-folders.
