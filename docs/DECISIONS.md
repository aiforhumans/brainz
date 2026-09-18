# Prompt and memory decisions

## Character behavior

Character facts and individual voice belong to the authored card. The scenario describes the opening, not an immutable scene or emotion. Shared craft rules encourage natural pacing without banning warmth, formality, questions or strong emotions. Explicit user corrections and later scene developments override stale observations. The model must not invent user actions, private thoughts or shared experiences.

Built-in Laura/Esther relationships remain authored as Mark's family. Selecting another persona does not silently rewrite custom cards or named people. The UI and new generation use the selected persona. Only exact unchanged preset fields are migrated.

Character cards, system directives, scenarios, greetings, lorebook entries, and generation blueprints support modular `{{user}}` and `{{char}}` macros (case-insensitive). Prompts and UI views resolve these against the active user persona and character dynamically, preventing user persona names from being conflated with generated character identities.

## Prompt Precedence & Context Pipeline

The prompt compilation pipeline strictly resolves context according to authority:
`current user message > recent corrections > scene state > confirmed memory > scenario > user profile > character assumptions > lore > old summaries`.
Deterministic contradiction detection automatically supersedes outdated memories across location, preferences, and relationship status. A strict Token Budget Manager protects generation reserves (`maxTokens`) and trims distant summaries and low-priority items first.

The Model Adapter formats requests across Native Chat (role messages), LM Studio Native SSE (`/api/v1/chat`), and Legacy Transcripts, with safe logging that sanitizes bulky base64 multimodal image payloads. Background post-turn updates track ephemeral scene state (location, participants, items, unresolved action threads) without blocking dialogue streaming or risking response corruption.

## Request optimization

Background tasks (brain synthesis, initial extraction, user profile auto-fill) use fixed, right-sized `maxTokens` caps independent of the user's chat generation budget. Synthesis caps at 1400, extraction at 800, auto-fill at 600. These match actual output sizes with reasonable headroom, rather than inheriting the user's chat `maxTokens` which wastes generation budget and slows inference.

Background task input payloads are trimmed to identity-relevant fields only: compact card context (truncated personality/scenario), capped candidate memory content, and chunk message content truncated per item. This reduces prompt processing time proportionally to input token reduction.

Dialogue rules (`HUMAN_DIALOGUE_RULES`) are condensed to ~60% of their original length without losing behavioral semantics. The `behavior_rules` and `continuity_precedence` prompt sections are merged into one, saving XML tag overhead and avoiding repeated concepts. Token budget allocation adapts dynamically: empty sections (no summaries, no lore) redistribute their budget to memories and conversation history.

A lightweight prompt fingerprint cache avoids rebuilding identical system prompts on regenerations of the same turn. Session chunking uses larger windows (10,000 chars, 20 messages) to reduce the number of LLM calls per synthesis by ~25%.

## Memory authority

A blank initial brain is valid. User observations must not be inferred from character traits. Character context, manual user information, and learned observations are separate. AI-extracted backstory requires a verbatim card quote. Conversation memory cites stable message IDs and content fingerprints; fictional events and uncertain impressions are explicitly classified.

Legacy memories remain available for review; they are not silently deleted or presented as verified facts. Low confidence remains low. Manual facts are protected from automatic correction; editing or confirming a memory gives it manual authority. Removed entries are remembered as exclusions to avoid automatic recreation.

## Learning and continuity

Chapters share continuity within a character. Auto-Learn initializes new characters, then runs after eight completed nonempty replies per character, including regeneration/continuation. A persisted counter resets only after successful conversation synthesis; source edits wait for that batch or manual synthesis. Learning runs serially after two idle seconds and is canceled/deferred by foreground inference. Source changes refresh the whole affected session through chronological chunks and rolling summaries. App accepts results only if its source snapshot still matches; errors and cancellations do not replace the brain. Manual scenario refresh changes derived card context without discarding conversation history.

Changed cards/personas conservatively mark derived claims for review, since deterministic code cannot reliably decide whether two prose statements contradict. Learning can revalidate them from actual messages. No inferred confidence score proves factual accuracy; human review remains available.

## Persistence and compatibility

Active brains use `loreforge_brains_by_char_v3`. Existing v2 and v1 keys remain untouched for recovery. Legacy imported payloads are archived inside the normalized brain. Other storage schemas and both LM Studio chat transports remain supported. Model response JSON is validated on both structured and fallback paths before updating application state.
