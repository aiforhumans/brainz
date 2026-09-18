# src/ — React Application Source

## Purpose

Contains the entire LoreForge React application: entry point, root component, global styles, and three domain sub-trees (components, services, utils).

## Ownership

- Owner: Mark
- All files here are production source — never generated output

## Local Contracts

- **`main.jsx`**: React 19 entry point. Mounts `<App />` into `#root`. Do not add providers or global wrappers here without updating this contract.
- **`App.jsx`**: Owns persistent application state, service instances, and inference scheduling. State flows down through props; events bubble back up. Existing modal form state stays local. No Context API or external state library.
- Automatic learning runs at new-character creation and after every eight successfully completed nonempty replies per character (including regeneration/continuation). The counter persists in the brain and resets only after successful conversation synthesis; card extraction preserves it. Edits invalidate evidence but wait for the next batch or manual synthesis. Learning is serial and debounced for two idle seconds. Foreground chat, generation and model lifecycle requests abort/defer learning. Before committing, compare the current character, persona, sessions, settings and brain snapshot with the request snapshot. Never let a stale result overwrite edits, reset data or another character.
- Queue and revision controls use refs owned by App. Incomplete, failed and synthetic Continue messages are excluded from learning. Failures preserve the current brain; manual synthesis retries failed analysis.
- Brain saves normalize legacy imports, increment revision and preserve deletion exclusions. Scenario refresh merges authored backstory without resetting learned history.
- **`index.css`**: Global design system — CSS custom properties, glassmorphic utility classes, animations, and responsive breakpoints. All component styles must reference tokens defined here. No component may define its own conflicting root-level CSS custom properties.
- **`App.css`**: App-shell layout overrides (sidebar + main content split). Keep it minimal.
- **`assets/`**: Static image files only. No JS/CSS in this folder.
- Component-level JSX goes in `components/`; data, API, and persistence logic goes in `services/`; pure transformation functions go in `utils/`.

## Work Guidance

- When adding a new modal, follow the existing pattern: boolean state in `App.jsx` (`xModalOpen`), open/close callbacks passed as props, modal rendered at the bottom of `App`'s JSX.
- When adding a new persisted key, define it in `STORAGE_KEYS` inside `storageService.js` and expose it through the `storageService` singleton — never call `localStorage` directly from a component.
- CSS class names follow a flat BEM-lite convention (e.g. `.sidebar`, `.sidebar-header`, `.sidebar__item--active`). Match surrounding patterns when adding new classes.
- All icons must come from `lucide-react`. Pick the closest semantic icon; do not use emoji as icons.

## Verification

- `npm run lint` from the repo root must pass with zero errors after source edits.
- Run `node scripts/verify-coherence.mjs` after prompt, generation, memory, storage or orchestration changes.
- Smoke-test affected desktop workflows using the root verification checklist; keep test data isolated from user conversations.

## Child DOX Index

- [`components/AGENTS.md`](components/AGENTS.md) — UI component layer: all React JSX components, their props contracts, and modal patterns.
- [`services/AGENTS.md`](services/AGENTS.md) — Service layer: LM Studio client, shared prompts, evidence-based memory, LocalStorage migrations and default data.
- [`utils/AGENTS.md`](utils/AGENTS.md) — Utility functions: pure text-transformation helpers.
