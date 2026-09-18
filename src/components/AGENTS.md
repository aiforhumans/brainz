# components/ — UI Component Layer

## Purpose

All React JSX components that render the LoreForge UI. Each file owns one named component. App supplies external data, service instances and request callbacks through props. Components never access LocalStorage directly; CharacterModal may use the supplied client under the lifecycle contract below.

## Ownership

- Owner: Mark
- Consumers: `App.jsx` imports and composes all components listed below

## Component Inventory

| File | Component | Role |
|---|---|---|
| `App.jsx` (parent) | `App` | Owns application state and inference scheduling; not in this folder |
| `Navbar.jsx` | `Navbar` | Top bar: brand, model selector, health badge, connection latency |
| `Sidebar.jsx` | `Sidebar` | Character list, NSFW filter toggle, search, session counts |
| `ChatArea.jsx` | `ChatArea` | Chat thread container, session tab strip |
| `ChatInput.jsx` | `ChatInput` | Message textarea, image attachment, streaming status HUD, continue button |
| `MessageItem.jsx` | `MessageItem` | Single message bubble, thought-process accordion, generation telemetry pill |
| `CharacterModal.jsx` | `CharacterModal` | Character CRUD and drafts through App callbacks; persona-aware generation, whole-card rewrite, field polish, import/export JSON |
| `SettingsModal.jsx` | `SettingsModal` | Generation parameters, sampler controls, server URL, model VRAM lifecycle |
| `UserPersonaModal.jsx` | `UserPersonaModal` | User roleplay profile (name, title, avatar, bio) |
| `LorebookModal.jsx` | `LorebookModal` | Lorebook entries: keyword triggers, content, enable/disable |
| `BrainModal.jsx` | `BrainModal` | Per-character memory review, manual profile, evidence/status display, import/export, learning controls and full prompt preview |
| `TokenOverviewBar.jsx` | `TokenOverviewBar` | Main window bottom footer: real-time memory tokens, lore tokens, chat history, context utilization progress bar, and expandable diagnostics drawer |

## Local Contracts

- **Props only**: Components receive all data and callbacks through props. No `useContext`, no module-level stores.
- **No direct localStorage**: Never call `localStorage` or import `storageService` from a component. State changes flow back to `App.jsx` via callbacks, which then persist.
- **Character generation lifecycle**: Use the supplied foreground-request callback and abort signal; do not apply results after the card changes or the editor closes. Whole-card rewrites include all four narrative fields in one request. Untouched templates are not authored constraints. Blueprints use `{{user}}` for modular persona reference, and whole-card generation never locks the character's name to the user's persona.
- **Macro resolution**: `MessageItem` and `App` resolve `{{user}}` and `{{char}}` macros against the active user persona and character.
- **Brain UI**: Receive the actual full prompt preview, reset callback, and profile auto-fill callback from App; do not reconstruct prompts or call storage. Manual edits/confirmation become explicitly authored facts. Imported JSON is normalized by App; unverified legacy entries require review. Auto-Learn initializes new characters and then runs after every eight completed replies while idle, pausing for foreground activity.
- **No direct LM Studio calls**: Only `App.jsx` holds the `client` instance and calls service methods. Exception: `CharacterModal` uses `lmStudioClient` for AI auto-generate/rewrite — it must receive the `client` instance as a prop (or call a callback), not instantiate its own.
- **Modal pattern**: Modals are mounted at the root of `App.jsx`'s JSX; an `isOpen` boolean controls visibility and an `onClose` callback dismisses them. Invalidate pending editor requests when closing.
- **Styling**: Use CSS class names from `index.css`. Do not introduce inline `style={{}}` props; use classes and CSS custom properties. Existing legacy inline styles do not authorize new ones. No Tailwind.
- **Icons**: `lucide-react` only. Import named icons at the top of each file.

## Work Guidance

- When adding a new component, create a new `.jsx` file; export a named function (not default export).
- When adding a new modal, add a state pair (`xOpen`/`setXOpen`) in `App.jsx`, thread open/close props, and render the modal at the bottom of `App`'s return JSX.
- Streaming HUD stages are driven by `streamingStatus` prop passed to `ChatInput`. Do not add new status strings without updating both `App.jsx` (producer) and `ChatInput.jsx` (consumer).
- Roleplay text highlighting (asterisk actions, quoted dialogue) is handled by `utils/roleplayFormatter.jsx` — import and use it in `MessageItem.jsx`; do not duplicate the logic.
- Thought-process accordion state is local to `MessageItem` — this is intentional, do not hoist it.
- Generation telemetry (tok/s, TTFT, total tokens) is derived from the `chat.end` SSE event payload and stored on the message object by `App.jsx`; `MessageItem` only reads and displays it.

## Verification

- `npm run lint` from repo root must pass after source edits.
- Smoke-test new modals by opening them manually in the browser at `http://localhost:5173/`.

## Child DOX Index

No sub-folders. All component files are at this level.
