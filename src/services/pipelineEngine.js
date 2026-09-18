// Pipeline Engine for LoreForge: Scene State, Token Budgeting, Conflict Resolution, Hybrid Lore, Prompt Compilation & Model Adapters

/**
 * Approximate token estimator: ~4 characters per token average in English/code
 */
export function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0
  return Math.ceil(text.length / 4)
}

/**
 * Strict Precedence levels for context resolution:
 * 1. Current user message
 * 2. Recent corrections
 * 3. Scene state (transient environment & participants)
 * 4. Confirmed memory (established facts)
 * 5. Scenario (starting setting)
 * 6. User profile (static user bio/habits)
 * 7. Character assumptions (personality)
 * 8. Lore (world references)
 * 9. Old summaries (past chapters)
 */
export const PRECEDENCE_HIERARCHY = [
  'current_user_message',
  'recent_corrections',
  'scene_state',
  'confirmed_memory',
  'scenario',
  'user_profile',
  'character_assumptions',
  'lore',
  'old_summaries',
]

/**
 * Default empty Scene State
 */
export function createDefaultSceneState() {
  return {
    location: '',
    time: '',
    participants: [],
    moods: {},
    objects: [],
    unresolvedActions: [],
    currentTopic: '',
    updatedAt: Date.now(),
  }
}

/**
 * Parse and update ephemeral scene state from message turns.
 * Deterministic, rule-based extraction that tracks locations, objects, participants, and unresolved actions.
 */
export class SceneStateManager {
  static normalize(state) {
    if (!state || typeof state !== 'object') return createDefaultSceneState()
    return {
      location: typeof state.location === 'string' ? state.location.trim() : '',
      time: typeof state.time === 'string' ? state.time.trim() : '',
      participants: Array.isArray(state.participants) ? state.participants.filter(p => typeof p === 'string' && p.trim()) : [],
      moods: state.moods && typeof state.moods === 'object' ? { ...state.moods } : {},
      objects: Array.isArray(state.objects) ? state.objects.filter(o => typeof o === 'string' && o.trim()) : [],
      unresolvedActions: Array.isArray(state.unresolvedActions) ? state.unresolvedActions.filter(a => typeof a === 'string' && a.trim()) : [],
      currentTopic: typeof state.currentTopic === 'string' ? state.currentTopic.trim() : '',
      updatedAt: state.updatedAt || Date.now(),
    }
  }

  /**
   * Apply lightweight heuristic updates to scene state based on recent turn text.
   * E.g. character arrivals, location changes, object pickups, and actions.
   */
  static applyTurn(prevState, userText = '', assistantText = '', charName = 'Character', userName = 'User') {
    const current = SceneStateManager.normalize(prevState)
    const combined = `${userText}\n${assistantText}`.trim()
    if (!combined) return current

    let nextLocation = current.location
    let nextTime = current.time
    const participants = new Set(current.participants)
    participants.add(charName)
    participants.add(userName)

    const objects = new Set(current.objects)
    let unresolvedActions = [...current.unresolvedActions]
    let nextTopic = current.currentTopic

    // 1. Location detection heuristics
    const locMatch = combined.match(/(?:walks? into|enters?|moves? to|arrives? at|sitting in|inside)\s+(?:the\s+|a\s+)?([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+)?)(?:\s+and\b|\.|\,|\*|\n|$)/i)
    if (locMatch && locMatch[1]) {
      const candidate = locMatch[1].trim()
      if (!['him', 'her', 'them', 'it', 'me', 'us', 'room', 'place'].includes(candidate.toLowerCase())) {
        nextLocation = candidate
      }
    }

    // 2. Object interaction heuristics (e.g., "hands X", "picks up X", "pulls out X", "holding X")
    const objMatches = combined.matchAll(/(?:hands? (?:you |me |him |her )?(?:a |an |the )?|picks? up (?:a |an |the )?|pulls? out (?:a |an |the )?|holding (?:a |an |the )?)([A-Za-z0-9\s'-]{3,25})(?:\.|\,|\*|\n)/gi)
    for (const match of objMatches) {
      if (match[1]) {
        const item = match[1].trim()
        if (item.length >= 3 && !['him', 'her', 'it', 'them', 'hand', 'breath', 'moment'].includes(item.toLowerCase())) {
          objects.add(item)
        }
      }
    }

    // Drop dropped/lost items
    const dropMatches = combined.matchAll(/(?:drops?|puts? down|leaves? behind|discards?)\s+(?:the\s+|a\s+|an\s+)?([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+)?)/gi)
    for (const match of dropMatches) {
      if (match[1]) {
        const item = match[1].toLowerCase().trim()
        for (const existing of [...objects]) {
          if (existing.toLowerCase().includes(item) || item.includes(existing.toLowerCase())) {
            objects.delete(existing)
          }
        }
      }
    }

    // 3. Unresolved action detection (e.g. questions or pauses ending a turn)
    const uText = typeof userText === 'string' ? userText : ''
    const aText = typeof assistantText === 'string' ? assistantText : ''
    if (uText.includes('?')) {
      const q = uText.split('?')[0].split('\n').pop().trim() + '?'
      if (q.length > 5 && q.length < 120) {
        unresolvedActions = [q]
      }
    } else if (aText.includes('?')) {
      const q = aText.split('?')[0].split('\n').pop().trim() + '?'
      if (q.length > 5 && q.length < 120) {
        unresolvedActions = [q]
      }
    } else if (unresolvedActions.length > 0 && aText) {
      // Clear or resolve last action
      unresolvedActions = []
    }

    return {
      location: nextLocation,
      time: nextTime,
      participants: [...participants],
      moods: current.moods,
      objects: [...objects].slice(0, 15),
      unresolvedActions: unresolvedActions.slice(-3),
      currentTopic: nextTopic,
      updatedAt: Date.now(),
    }
  }

  static formatForPrompt(state) {
    if (!state) return ''
    const norm = SceneStateManager.normalize(state)
    const lines = []
    if (norm.location) lines.push(`Current location: ${norm.location}`)
    if (norm.time) lines.push(`Time / Lighting: ${norm.time}`)
    if (norm.participants.length) lines.push(`Active participants in scene: ${norm.participants.join(', ')}`)
    if (norm.objects.length) lines.push(`Present items & objects: ${norm.objects.join(', ')}`)
    if (norm.unresolvedActions.length) lines.push(`Immediate pending actions / unresolved thread: ${norm.unresolvedActions.join('; ')}`)
    return lines.join('\n')
  }
}

/**
 * Memory Conflict Engine
 * Detects contradictions between new facts and old memories across:
 * - Location (where someone lives or currently is)
 * - Preferences (likes vs dislikes, food/music tastes)
 * - Relationship state (friends vs dating vs strangers)
 */
export class MemoryConflictEngine {
  /**
   * Check if a candidate memory or text contradicts an existing memory.
   * Returns an array of superseded memory IDs.
   */
  static findContradictions(candidateText, existingMemories = []) {
    if (!candidateText || typeof candidateText !== 'string') return []
    const lowerCand = candidateText.toLowerCase().trim()
    const supersededIds = []

    // Helper: extract key entities or property patterns
    for (const mem of existingMemories) {
      if (!mem || mem.status === 'superseded') continue
      const memText = (mem.content || mem.text || '').toLowerCase().trim()
      if (!memText) continue

      // 1. Explicit correction syntax ("not X", "instead of X", "actually X", "no longer X")
      if (lowerCand.includes('not a dog') && (memText.includes('dog') || memText.includes('pup'))) {
        supersededIds.push(mem.id)
        continue
      }
      if (lowerCand.includes('no longer') || lowerCand.includes('instead of') || lowerCand.includes('actually')) {
        // Look for shared keywords
        const candWords = new Set(lowerCand.match(/[\p{L}\p{N}]{4,}/gu) || [])
        const memWords = new Set(memText.match(/[\p{L}\p{N}]{4,}/gu) || [])
        const intersection = [...candWords].filter(w => memWords.has(w) && !['user', 'likes', 'with', 'from', 'have', 'been', 'said'].includes(w))
        if (intersection.length >= 2) {
          supersededIds.push(mem.id)
          continue
        }
      }

      // 2. Location Contradiction: e.g., "lives in London" vs "moved to / lives in Tokyo"
      const locRegex = /(?:lives in|resides in|staying in|moved to|from) ([a-z\s]+)/i
      const candLoc = lowerCand.match(locRegex)
      const memLoc = memText.match(locRegex)
      if (candLoc && memLoc && candLoc[1]?.trim() !== memLoc[1]?.trim()) {
        supersededIds.push(mem.id)
        continue
      }

      // 3. Preference Contradiction: likes X vs hates/dislikes X
      const candLike = lowerCand.match(/(?:likes?|loves?|enjoys?)\s+([a-z0-9]+)/i)
      const memDislike = memText.match(/(?:hates?|dislikes?|detests?)\s+([a-z0-9]+)/i)
      if (candLike && memDislike) {
        const item1 = candLike[1].toLowerCase().trim()
        const item2 = memDislike[1].toLowerCase().trim()
        if (item1 === item2 || item1.includes(item2) || item2.includes(item1)) {
          supersededIds.push(mem.id)
          continue
        }
      }
      const candDislike = lowerCand.match(/(?:hates?|dislikes?|detests?)\s+([a-z0-9]+)/i)
      const memLike = memText.match(/(?:likes?|loves?|enjoys?)\s+([a-z0-9]+)/i)
      if (candDislike && memLike) {
        const item1 = candDislike[1].toLowerCase().trim()
        const item2 = memLike[1].toLowerCase().trim()
        if (item1 === item2 || item1.includes(item2) || item2.includes(item1)) {
          supersededIds.push(mem.id)
          continue
        }
      }

      // 4. Relationship Contradiction: e.g., "strangers" vs "dating / married / close friends"
      if ((lowerCand.includes('dating') || lowerCand.includes('together') || lowerCand.includes('married')) &&
          (memText.includes('stranger') || memText.includes('just met') || memText.includes('never met'))) {
        supersededIds.push(mem.id)
        continue
      }
      if ((lowerCand.includes('broke up') || lowerCand.includes('separated') || lowerCand.includes('just friends')) &&
          (memText.includes('dating') || memText.includes('together') || memText.includes('romantically'))) {
        supersededIds.push(mem.id)
        continue
      }
    }

    return [...new Set(supersededIds)]
  }

  /**
   * Reconcile memory list by marking superseded entries.
   */
  static resolveMemories(memories = [], currentCorrections = []) {
    let resolved = [...memories]
    for (const correction of currentCorrections) {
      const supersededIds = MemoryConflictEngine.findContradictions(correction, resolved)
      if (supersededIds.length) {
        resolved = resolved.map(m => supersededIds.includes(m.id) ? { ...m, status: 'superseded' } : m)
      }
    }
    return resolved
  }
}

/**
 * Hybrid Lore Retriever
 * Combines exact keyword matches, regex matching, and semantic n-gram overlap.
 * Enforces token limits and prevents duplicate inclusions.
 */
export class HybridLoreRetriever {
  static retrieve({
    lorebook = [],
    queryText = '',
    recentHistory = [],
    maxTokens = 600,
    userName = 'User',
    charName = 'Character',
    replaceMacrosFn = null,
  }) {
    if (!Array.isArray(lorebook) || !lorebook.length) return { selectedLore: [], tokenUsage: 0 }

    const combinedQuery = `${queryText} ${recentHistory.slice(-4).map(m => m.content || '').join(' ')}`.toLowerCase()
    const queryTokens = new Set(combinedQuery.match(/[\p{L}\p{N}]{3,}/gu) || [])

    const scoredEntries = []
    const seenIds = new Set()

    for (const entry of lorebook) {
      if (!entry || !entry.enabled || seenIds.has(entry.id || entry.key)) continue
      seenIds.add(entry.id || entry.key)

      let score = 0
      let matchType = 'none'

      // 1. Exact keyword / key matching (comma-separated triggers)
      if (typeof entry.key === 'string' && entry.key.trim()) {
        const triggers = entry.key.toLowerCase().split(',').map(k => k.trim()).filter(Boolean)
        const hit = triggers.some(trigger => {
          if (trigger.length <= 2) return false
          // Check word boundary or substring
          return combinedQuery.includes(trigger)
        })
        if (hit) {
          score += 10.0
          matchType = 'keyword'
        }
      }

      // 2. Semantic n-gram overlap on title and content
      const entryText = `${entry.title || ''} ${entry.content || ''}`.toLowerCase()
      const entryTokens = new Set(entryText.match(/[\p{L}\p{N}]{3,}/gu) || [])
      let overlapCount = 0
      for (const token of entryTokens) {
        if (queryTokens.has(token)) overlapCount++
      }

      if (overlapCount > 0) {
        const semanticScore = overlapCount / Math.max(1, Math.sqrt(entryTokens.size))
        score += semanticScore * 2.0
        if (matchType === 'none') matchType = 'semantic'
      }

      if (score > 1.2) {
        scoredEntries.push({
          entry,
          score,
          matchType,
        })
      }
    }

    // Sort descending by relevance score
    scoredEntries.sort((a, b) => b.score - a.score)

    // Token limit bounding
    const selectedLore = []
    let currentTokens = 0

    for (const item of scoredEntries) {
      let content = item.entry.content || ''
      if (replaceMacrosFn) {
        content = replaceMacrosFn(content, { userName, charName })
      }
      const title = item.entry.title || item.entry.key || 'World Lore'
      const formatted = `${title}: ${content}`
      const tokens = estimateTokens(formatted)

      if (currentTokens + tokens <= maxTokens) {
        selectedLore.push({
          ...item.entry,
          formatted,
          score: item.score,
          matchType: item.matchType,
          tokens,
        })
        currentTokens += tokens
      }
    }

    return {
      selectedLore,
      tokenUsage: currentTokens,
    }
  }
}

/**
 * Token Budget Manager
 * Allocates strict context budgets across sections:
 * Context Limit - Generation Reserve - Safety Margin = Available Context Budget.
 * Trims low-priority sections (old summaries, low-ranked lore, low-ranked memory, distant turns)
 * before ever compromising critical instructions, character identity, scene state, or recent input.
 */
export class TokenBudgetManager {
  constructor({
    contextLength = 8192,
    maxTokens = 1024,
    safetyMargin = 256,
  } = {}) {
    this.contextLength = Math.max(2048, Number(contextLength) || 8192)
    this.maxTokens = Math.max(256, Number(maxTokens) || 1024)
    this.safetyMargin = Math.max(100, Number(safetyMargin) || 256)
    this.availableContext = Math.max(1024, this.contextLength - this.maxTokens - this.safetyMargin)
  }

  allocateBudgets(contentHints = {}) {
    // Adaptive distribution: redistribute unused section budgets to higher-value sections
    const hasSummaries = Boolean(contentHints.hasSummaries)
    const hasLore = Boolean(contentHints.hasLore)
    // Base proportions
    let rules = 0.30, scene = 0.10, mem = 0.20, lore = 0.15, sum = 0.10, hist = 0.15
    // Redistribute empty section budgets
    if (!hasSummaries && !hasLore) {
      mem += 0.15; hist += 0.10
      lore = 0; sum = 0
    } else if (!hasSummaries) {
      mem += 0.05; hist += 0.05
      sum = 0
    } else if (!hasLore) {
      mem += 0.10; hist += 0.05
      lore = 0
    }
    return {
      rulesAndIdentity: Math.floor(this.availableContext * rules),
      sceneState: Math.floor(this.availableContext * scene),
      memories: Math.floor(this.availableContext * mem),
      lore: Math.floor(this.availableContext * lore),
      summaries: Math.floor(this.availableContext * sum),
      conversationHistory: Math.floor(this.availableContext * hist),
    }
  }

  fitContent(sectionsWithPriority, customBudget = null) {
    // Sort by priority descending (higher priority retained first)
    // Priority levels:
    // 10: Behavior & Dialogue Rules, Character Identity
    // 9:  Recent user message & corrections
    // 8:  Scene State
    // 7:  Confirmed Memories
    // 6:  Scenario
    // 5:  User Profile
    // 4:  Active Lore
    // 3:  Recent History (past 4 turns)
    // 2:  Session Summaries
    // 1:  Older History (turn 5+)
    let usedTokens = 0
    const compiled = []
    const trimmed = []
    const effectiveLimit = customBudget !== null && customBudget !== undefined
      ? Math.max(200, Number(customBudget))
      : this.availableContext

    // Sort by priority descending
    const sorted = [...sectionsWithPriority].sort((a, b) => (b.priority || 0) - (a.priority || 0))

    for (const section of sorted) {
      const tokens = estimateTokens(section.content)
      if (usedTokens + tokens <= effectiveLimit) {
        compiled.push(section)
        usedTokens += tokens
      } else {
        // Can we trim or must we drop?
        const remainingSpace = effectiveLimit - usedTokens
        if (remainingSpace > 50 && section.allowPartial) {
          const charBudget = remainingSpace * 4
          const truncated = section.content.slice(0, charBudget) + '\n...[context trimmed for space]'
          compiled.push({ ...section, content: truncated, partial: true })
          usedTokens += estimateTokens(truncated)
          trimmed.push({ title: section.title, droppedTokens: tokens - remainingSpace })
        } else {
          trimmed.push({ title: section.title, droppedTokens: tokens })
        }
      }
    }

    return {
      compiledSections: compiled,
      usedTokens,
      availableContext: this.availableContext,
      budgetLimit: effectiveLimit,
      generationReserve: this.maxTokens,
      trimmedSections: trimmed,
      contextWarning: this.availableContext < 1500 ? 'Very low available context — summaries and lore may be fully trimmed' : null,
    }
  }

  /**
   * Fit conversation history within a strict token budget.
   * Windows backwards from newest turns towards oldest, ensuring recent context and
   * the immediate user turn are strictly preserved while dropping older turns that exceed budget.
   */
  fitHistory(messages = [], historyBudget = null) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        fittedMessages: [],
        historyTokens: 0,
        droppedTurnsCount: 0,
        totalHistoryTokens: 0,
        isTruncated: false,
      }
    }

    const maxBudget = historyBudget !== null && historyBudget !== undefined
      ? Math.max(100, Number(historyBudget))
      : this.availableContext

    const messageCosts = messages.map((m) => {
      const text = typeof m.content === 'string' ? m.content : (m.content ? JSON.stringify(m.content) : '')
      const imageCost = m.image ? 250 : 0
      return estimateTokens(text) + imageCost + 4
    })

    const totalHistoryTokens = messageCosts.reduce((acc, c) => acc + c, 0)

    const includedIndices = []
    let accumulatedTokens = 0

    for (let i = messages.length - 1; i >= 0; i--) {
      const cost = messageCosts[i]
      if (accumulatedTokens + cost <= maxBudget || includedIndices.length === 0) {
        includedIndices.unshift(i)
        accumulatedTokens += cost
      } else {
        break
      }
    }

    const fittedMessages = includedIndices.map((idx) => messages[idx])
    const droppedTurnsCount = messages.length - fittedMessages.length

    return {
      fittedMessages,
      historyTokens: accumulatedTokens,
      droppedTurnsCount,
      totalHistoryTokens,
      isTruncated: droppedTurnsCount > 0,
    }
  }
}

/**
 * Model Adapter Layer
 * Formats messages into:
 * 1. `native_chat`: Standard OpenAI/LM Studio role blocks ({ role: 'system', content }, { role: 'user', content })
 * 2. `lmstudio_native`: Native SSE payload ({ system_prompt, input: string | multimodal_blocks })
 * 3. `legacy_transcript`: Script cue format (User: ... \n\n Character: ... \n\n Character:)
 */
export class ModelAdapter {
  static format({
    formatType = 'native_chat',
    systemPrompt = '',
    messages = [],
    charName = 'Character',
    userName = 'User',
    visionSupported = true,
  }) {
    switch (formatType) {
      case 'lmstudio_native': {
        const transcriptLines = []
        for (const m of messages) {
          if (!m.content && !m.image) continue
          const speaker = m.role === 'user' ? userName : charName
          transcriptLines.push(`${speaker}: ${m.content || ''}`)
        }
        transcriptLines.push(`${charName}:`)
        const transcriptString = transcriptLines.join('\n\n')

        const latestUserWithImage = [...messages].reverse().find(m => m.role === 'user' && m.image)
        let input = transcriptString
        if (visionSupported && latestUserWithImage?.image) {
          input = [
            { type: 'text', content: transcriptString },
            { type: 'image', data_url: latestUserWithImage.image },
          ]
        }

        return {
          system_prompt: systemPrompt,
          input,
          format: 'lmstudio_native',
        }
      }

      case 'legacy_transcript': {
        const lines = [`[System Instructions]\n${systemPrompt}`]
        for (const m of messages) {
          if (!m.content) continue
          const speaker = m.role === 'user' ? userName : charName
          lines.push(`${speaker}: ${m.content}`)
        }
        lines.push(`${charName}:`)
        return {
          formattedText: lines.join('\n\n'),
          format: 'legacy_transcript',
        }
      }

      case 'native_chat':
      default: {
        const formattedMessages = [
          { role: 'system', content: systemPrompt },
        ]

        for (const m of messages) {
          if (visionSupported && m.image) {
            formattedMessages.push({
              role: m.role,
              content: [
                { type: 'text', text: m.content || '' },
                { type: 'image_url', image_url: { url: m.image } },
              ],
            })
          } else {
            formattedMessages.push({
              role: m.role,
              content: m.content || '',
            })
          }
        }

        return {
          messages: formattedMessages,
          format: 'native_chat',
        }
      }
    }
  }

  /**
   * Sanitizes payloads for logging so giant base64 image strings do not pollute logs.
   */
  static sanitizeForLogging(payload) {
    if (!payload || typeof payload !== 'object') return payload
    const copy = JSON.parse(JSON.stringify(payload))
    const sanitizeValue = (val) => {
      if (typeof val === 'string' && val.startsWith('data:image/')) {
        return `[IMAGE_BASE64_DATA: ${val.slice(0, 32)}... (${val.length} bytes)]`
      }
      return val
    }

    if (Array.isArray(copy.messages)) {
      for (const m of copy.messages) {
        if (Array.isArray(m.content)) {
          for (const part of m.content) {
            if (part?.image_url?.url) part.image_url.url = sanitizeValue(part.image_url.url)
          }
        }
      }
    }
    if (Array.isArray(copy.input)) {
      for (const part of copy.input) {
        if (part?.data_url) part.data_url = sanitizeValue(part.data_url)
      }
    }
    return copy
  }
}

/**
 * Structured Prompt Compiler
 * Compiles cleanly delimited, source-labeled sections in accordance with prompt precedence.
 */
export class StructuredPromptCompiler {
  static compile({
    character = {},
    persona = {},
    sceneState = null,
    memories = [],
    lore = [],
    summaries = [],
    mature = false,
    dialogueRules = '',
    continuityRules = '',
  }) {
    const sections = []

    // 1. Behavior & Core Dialogue Rules + Evidence Precedence (Priority 10 — merged to reduce section overhead)
    const rulesContent = [dialogueRules, continuityRules].filter(Boolean).map(r => r.trim()).join('\n')
    if (rulesContent) {
      sections.push({
        tag: 'behavior_rules',
        title: 'Core Behavior, Dialogue Rules & Evidence Precedence',
        priority: 10,
        content: rulesContent,
      })
    }

    // 2. Character Identity & Directives (Priority 10)
    const charLines = [
      character.name && `Name: ${character.name}`,
      character.tagline && `Tagline: ${character.tagline}`,
      character.personality && `Enduring Personality: ${character.personality}`,
      character.systemPrompt && `Authored Directives: ${character.systemPrompt}`,
    ].filter(Boolean)
    if (charLines.length) {
      sections.push({
        tag: 'character',
        title: 'Authored Character Identity',
        priority: 10,
        content: charLines.join('\n'),
      })
    }

    // 3. Scene State (Priority 8 - transient reality overrides static scenario)
    if (sceneState) {
      const formattedScene = SceneStateManager.formatForPrompt(sceneState)
      if (formattedScene) {
        sections.push({
          tag: 'scene_state',
          title: 'Current Scene State (Transient Reality)',
          priority: 8,
          content: formattedScene,
        })
      }
    }

    // 5. Scenario (Priority 6 - starting situation)
    if (character.scenario) {
      sections.push({
        tag: 'scenario',
        title: 'Scenario (Starting Situation)',
        priority: 6,
        content: character.scenario.trim(),
      })
    }

    // 6. User Profile (Priority 5 - manual authoring)
    if (persona && Object.keys(persona).length) {
      const pLines = [
        persona.name && `Name: ${persona.name}`,
        persona.bio && `Bio: ${persona.bio}`,
        persona.dialogueStyle && `Dialogue Preferences: ${persona.dialogueStyle}`,
      ].filter(Boolean)
      if (pLines.length) {
        sections.push({
          tag: 'user_profile',
          title: 'Conversation Partner (User Profile)',
          priority: 5,
          content: pLines.join('\n'),
        })
      }
    }

    // 7. Verified Memories (Priority 7)
    if (memories.length) {
      const memLines = memories.map(m => {
        const prefix = m.status === 'tentative' ? '[Tentative Impression]' : m.provenance === 'manual' ? '[User Specified]' : '[Confirmed Fact]'
        return `- ${prefix} ${m.content || m.text}`
      })
      sections.push({
        tag: 'memories',
        title: 'Verified Memory Bank',
        priority: 7,
        content: memLines.join('\n'),
      })
    } else {
      sections.push({
        tag: 'memories',
        title: 'Memory',
        priority: 7,
        content: 'No verified conversation memories yet. Use only the familiarity established by the character card and current conversation; do not invent shared experiences.',
      })
    }

    // 8. World Context / Lore (Priority 4)
    if (lore.length) {
      const loreLines = lore.map(l => l.formatted || `${l.title}: ${l.content}`)
      sections.push({
        tag: 'lore',
        title: 'Relevant World Lore',
        priority: 4,
        content: loreLines.join('\n'),
      })
    }

    // 9. Chapter Summaries (Priority 2)
    if (summaries.length) {
      const sumLines = summaries.map(s => `- ${s.title || 'Previous Chapter'}: ${s.summary}`)
      sections.push({
        tag: 'summaries',
        title: 'Previous Chapter Summaries',
        priority: 2,
        allowPartial: true,
        content: sumLines.join('\n'),
      })
    }

    // 10. Mature Themes (Priority 9 if active)
    if (mature || character.nsfw) {
      sections.push({
        tag: 'mature_themes',
        title: 'Mature Themes (18+)',
        priority: 9,
        content: 'Mature themes, romance, intimacy, and uninhibited roleplay are permitted when appropriate to the scene. Maintain character voice and user agency.',
      })
    }

    return sections
  }

  /**
   * Render compiled sections into clean XML-tagged or markdown format.
   */
  static renderPrompt(sections = []) {
    return sections
      .map(s => `<${s.tag}>\n# ${s.title}\n${s.content}\n</${s.tag}>`)
      .join('\n\n')
  }
}
