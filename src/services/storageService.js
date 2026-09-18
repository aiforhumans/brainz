// Storage and persistence service for LoreForge
import { DEFAULT_CHARACTERS, migrateDefaultCharacter } from './defaultCharacters.js'
import { createBrain, normalizeBrain } from './brainService.js'
import { imageStorage } from './imageStorage.js'

export { imageStorage }

const STORAGE_KEYS = {
  CHARACTERS: 'loreforge_characters_v1',
  ACTIVE_CHAR_ID: 'loreforge_active_char_id',
  SESSIONS: 'loreforge_sessions_v1',
  ACTIVE_SESSION_ID: 'loreforge_active_session_id',
  SETTINGS: 'loreforge_settings_v1',
  USER_PERSONA: 'loreforge_user_persona_v1',
  LOREBOOK: 'loreforge_lorebook_v1',
  BRAIN: 'loreforge_brain_v1',
  BRAINS: 'loreforge_brains_by_char_v3',
  LEGACY_BRAINS: 'loreforge_brains_by_char_v2',
}

export const DEFAULT_USER_PERSONA = {
  name: 'Mark',
  title: '',
  avatar: '',
  bio: 'Mark — just a regular guy having real conversations.',
}

export const DEFAULT_SETTINGS = {
  serverUrl: '/lmstudio-proxy', // proxied through Vite to avoid CORS issues
  directUrl: 'http://localhost:1234',
  useProxy: true,
  model: 'google/gemma-4-e4b',
  temperature: 0.85,
  topP: 0.92,
  topK: 40,
  minP: 0.08, // Scaled confidence threshold sampling (modern standard for RP)
  maxTokens: 1024,
  repeatPenalty: 1.12, // Repetition penalty (prevents phrase/dialogue loops)
  reasoning: 'auto', // 'auto' | 'off' | 'low' | 'medium' | 'high' | 'on'
  ttl: 0, // Idle auto-eviction timeout in seconds (0 = disabled)
  contextLength: 8192, // Default context length when loading models into VRAM
  flashAttention: true, // Optimize attention computation on llama.cpp models
  presencePenalty: 0.15,
  frequencyPenalty: 0.1,
  stream: true,
  autoScroll: true,
  themeAccent: 'purple',
  nsfwMode: true,
}

export const DEFAULT_LOREBOOK = [
  {
    id: 'lore-1',
    key: 'karak',
    title: 'Mount Karak & The Deep Forge',
    content: 'Mount Karak is a dormant volcanic mountain laced with ancient basalt caverns. Legend tells of the First Runesmiths who forged the Core Relics here.',
    enabled: true,
  },
  {
    id: 'lore-2',
    key: 'corpsec',
    title: 'CorpSec & Neo-Kowloon',
    content: 'Corporate Security forces operate with absolute surveillance jurisdiction in Neo-Kowloon, hunting unregistered deckers and illegal wetware.',
    enabled: true,
  },
  {
    id: 'lore-3',
    key: 'aethelgard',
    title: 'DSS Aethelgard & The Void Reach',
    content: 'DSS Aethelgard is an experimental deep-range scout ship outfitted with an autonomous crystalline quantum core (Aura-7).',
    enabled: true,
  },
]

export const isLauraCharacter = (charId = '', charName = '') => {
  const normalizedId = String(charId || '').trim().toLowerCase()
  const normalizedName = String(charName || '').trim().toLowerCase()
  return normalizedId === 'char-laura' && normalizedName === 'laura'
}

export const isEstherCharacter = (charId = '', charName = '') => {
  const normalizedId = String(charId || '').trim().toLowerCase()
  const normalizedName = String(charName || '').trim().toLowerCase()
  return normalizedId === 'char-esther' && normalizedName === 'esther'
}

// Offline initialization uses authored context only; no speculative traits or experiences.
export const generateContextualBrain = (character = {}, userPersona = null) => createBrain(character, userPersona)

export const createDefaultBrainForCharacter = (charId = '', charName = '', characterData = null, userPersona = null) => {
  const character = characterData || DEFAULT_CHARACTERS.find(c => c.id === charId && c.name === charName) || { id: charId, name: charName }
  return createBrain(character, userPersona)
}

export const sanitizeBrainForCharacter = (brain, charId = '', charName = '', characterData = null, userPersona = null) => normalizeBrain(brain || createDefaultBrainForCharacter(charId, charName, characterData, userPersona), characterData || { id: charId, name: charName }, userPersona)

export const DEFAULT_BRAIN = createDefaultBrainForCharacter('char-laura', 'Laura')

export const storageService = {
  // Brain Generators & Sanitizers
  createDefaultBrainForCharacter,
  generateContextualBrain,
  sanitizeBrainForCharacter,
  isLauraCharacter,
  isEstherCharacter,

  // Characters
  getDeletedCharacterIds() {
    try {
      const data = localStorage.getItem('loreforge_deleted_char_ids')
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  markCharacterDeleted(id) {
    try {
      const list = this.getDeletedCharacterIds()
      if (!list.includes(id)) {
        list.push(id)
        localStorage.setItem('loreforge_deleted_char_ids', JSON.stringify(list))
      }
    } catch (e) {
      console.warn('Failed to mark character deleted', e)
    }
  },

  clearDeletedCharactersHistory() {
    try {
      localStorage.removeItem('loreforge_deleted_char_ids')
    } catch (e) {
      console.warn('Failed to clear deleted characters history', e)
    }
  },

  getCharacters() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS)
      if (data) {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Standard: re-inject any missing defaults (unless user explicitly deleted them)
          let list = parsed.map(migrateDefaultCharacter)
          let changed = list.some((c, i) => c !== parsed[i])
          const deletedIds = this.getDeletedCharacterIds()
          for (const defChar of DEFAULT_CHARACTERS) {
            if (!deletedIds.includes(defChar.id) && !list.some((c) => c.id === defChar.id)) {
              list.unshift(defChar)
              changed = true
            }
          }
          if (changed) {
            this.saveCharacters(list)
          }
          return list
        }
      }
    } catch (e) {
      console.error('Failed to load characters from localStorage', e)
    }
    this.saveCharacters(DEFAULT_CHARACTERS)
    return DEFAULT_CHARACTERS
  },

  saveCharacters(chars) {
    try {
      localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(chars))
    } catch (e) {
      console.error('Failed to save characters', e)
    }
  },

  // Purge session data for character IDs that no longer exist
  // validCharacterIds: Set<string> of IDs that should be kept
  purgeOrphanedSessions(validCharacterIds) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS)
      if (!data) return
      const parsed = JSON.parse(data)
      const cleaned = {}
      for (const [charId, charSessions] of Object.entries(parsed)) {
        if (validCharacterIds.has(charId)) {
          cleaned[charId] = charSessions
        }
        // else: drop sessions for this character entirely
      }
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(cleaned))
    } catch (e) {
      console.warn('Failed to purge orphaned sessions', e)
    }
  },

  getActiveCharacterId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAR_ID) || DEFAULT_CHARACTERS[0].id
  },

  setActiveCharacterId(id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAR_ID, id)
  },

  // Sessions
  getSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS)
      return data ? JSON.parse(data) : {}
    } catch (e) {
      console.error('Failed to load sessions', e)
      return {}
    }
  },

  saveSessions(sessions) {
    let sanitized = {}
    try {
      for (const [charId, charSessions] of Object.entries(sessions || {})) {
        if (!Array.isArray(charSessions)) continue
        sanitized[charId] = charSessions.map((s) => ({
          id: String(s.id || ''),
          title: String(s.title || 'Chat Session'),
          createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
          updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
          messages: Array.isArray(s.messages)
            ? s.messages.map((m) => {
                let imageRef = typeof m.image === 'string' ? m.image : null
                if (imageRef && imageRef.startsWith('data:image/')) {
                  const imageKey = `idb:img_${m.id || Date.now()}`
                  imageStorage.saveImage(imageKey, imageRef).catch((err) => {
                    console.warn('Could not persist image to IndexedDB', err)
                  })
                  imageRef = imageKey
                }
                return {
                  id: String(m.id || ''),
                  role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
                  content: typeof m.content === 'string' ? m.content : (m.content ? String(m.content.text || m.content.content || '') : ''),
                  reasoningContent: typeof m.reasoningContent === 'string' ? m.reasoningContent : '',
                  image: imageRef,
                  complete: m.complete !== undefined ? Boolean(m.complete) : true,
                  failed: Boolean(m.failed),
                  control: Boolean(m.control),
                  stats: m.stats && typeof m.stats === 'object' ? {
                    tokens_per_second: Number(m.stats.tokens_per_second) || 0,
                    time_to_first_token_seconds: Number(m.stats.time_to_first_token_seconds) || 0,
                    total_output_tokens: Number(m.stats.total_output_tokens) || 0,
                  } : null,
                  createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
                  model: typeof m.model === 'string' ? m.model : null,
                  responseId: typeof m.responseId === 'string' ? m.responseId : null,
                }
              })
            : [],
        }))
      }
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sanitized))
    } catch (e) {
      console.error('Failed to save sessions', e)
      // Emergency recovery: if quota exceeded, strip any legacy/large images to avoid breaking chat persistence
      try {
        const stripped = JSON.parse(JSON.stringify(sanitized))
        for (const charSessions of Object.values(stripped)) {
          if (!Array.isArray(charSessions)) continue
          for (const s of charSessions) {
            if (!Array.isArray(s.messages)) continue
            for (const msg of s.messages) {
              if (msg.image && !msg.image.startsWith('idb:')) {
                msg.image = null
              }
            }
          }
        }
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(stripped))
      } catch (quotaErr) {
        console.error('Emergency quota recovery for sessions failed', quotaErr)
      }
    }
  },

  async hydrateSessionImages(sessions) {
    if (!sessions || typeof sessions !== 'object') return null
    let anyHydrated = false
    const hydratedSessions = {}
    for (const [charId, charSessions] of Object.entries(sessions)) {
      if (!Array.isArray(charSessions)) {
        hydratedSessions[charId] = charSessions
        continue
      }
      const updatedCharSessions = await Promise.all(
        charSessions.map(async (session) => {
          if (!Array.isArray(session.messages)) return session
          let sessionChanged = false
          const updatedMessages = await Promise.all(
            session.messages.map(async (msg) => {
              if (msg.image && typeof msg.image === 'string' && msg.image.startsWith('idb:')) {
                try {
                  const dataUrl = await imageStorage.getImage(msg.image)
                  if (dataUrl) {
                    sessionChanged = true
                    anyHydrated = true
                    return { ...msg, image: dataUrl }
                  }
                } catch (err) {
                  console.warn('Failed to hydrate image for message', msg.id, err)
                }
              }
              return msg
            })
          )
          return sessionChanged ? { ...session, messages: updatedMessages } : session
        })
      )
      hydratedSessions[charId] = updatedCharSessions
    }
    return anyHydrated ? hydratedSessions : null
  },

  getActiveSessionId(charId) {
    try {
      const activeMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID) || '{}')
      return activeMap[charId] || null
    } catch {
      return null
    }
  },

  setActiveSessionId(charId, sessionId) {
    try {
      const activeMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID) || '{}')
      activeMap[charId] = sessionId
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, JSON.stringify(activeMap))
    } catch (e) {
      console.error('Failed to set active session ID', e)
    }
  },

  // User Persona
  getUserPersona() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PERSONA)
      if (data) {
        const parsed = JSON.parse(data)
        // Automatic migration: upgrade legacy or placeholder names to 'Mark'
        const isLegacyName = parsed.name === 'Traveler' || parsed.name === 'Alex' || parsed.name === 'Wanderer'
        const isLegacyTitle = parsed.title === 'Wanderer'
        const isLegacyBio = parsed.bio && (parsed.bio.includes('perceptive traveler') || parsed.bio.includes('authentic, thoughtful conversational partner'))
        if (isLegacyName || isLegacyTitle || isLegacyBio) {
          const migrated = {
            ...DEFAULT_USER_PERSONA,
            ...parsed,
            name: isLegacyName ? 'Mark' : parsed.name,
            title: isLegacyTitle ? '' : parsed.title,
            bio: isLegacyBio ? DEFAULT_USER_PERSONA.bio : parsed.bio,
          }
          this.saveUserPersona(migrated)
          return migrated
        }
        return { ...DEFAULT_USER_PERSONA, ...parsed }
      }
      return DEFAULT_USER_PERSONA
    } catch {
      return DEFAULT_USER_PERSONA
    }
  },

  saveUserPersona(persona) {
    localStorage.setItem(STORAGE_KEYS.USER_PERSONA, JSON.stringify(persona))
  },

  // Lorebook
  getLorebook() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOREBOOK)
      return data ? JSON.parse(data) : DEFAULT_LOREBOOK
    } catch {
      return DEFAULT_LOREBOOK
    }
  },

  saveLorebook(lore) {
    localStorage.setItem(STORAGE_KEYS.LOREBOOK, JSON.stringify(lore))
  },

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  },

  // Character Draft Persistence
  getCharacterDraft() {
    try {
      const data = localStorage.getItem('loreforge_character_draft_v1')
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.warn('Failed to load character draft', e)
      return null
    }
  },

  saveCharacterDraft(draft) {
    try {
      localStorage.setItem('loreforge_character_draft_v1', JSON.stringify(draft))
    } catch (e) {
      console.warn('Failed to save character draft', e)
    }
  },

  clearCharacterDraft() {
    try {
      localStorage.removeItem('loreforge_character_draft_v1')
    } catch (e) {
      console.warn('Failed to clear character draft', e)
    }
  },

  // The Brain & Cross-Chat Memory Data Bank (Per-Character Storage)
  getBrains() {
    const characters = this.getCharacters()
    const persona = this.getUserPersona()
    const current = localStorage.getItem(STORAGE_KEYS.BRAINS)
    const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_BRAINS)
    const single = localStorage.getItem(STORAGE_KEYS.BRAIN)
    try {
      const raw = current || legacy
      const parsed = raw ? JSON.parse(raw) : single ? { 'char-laura': JSON.parse(single) } : {}
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid brain bank')
      const result = {}
      for (const [id, brain] of Object.entries(parsed)) {
        result[id] = normalizeBrain(brain, characters.find(c => c.id === id) || { id }, persona)
      }
      for (const character of characters) {
        if (!result[character.id]) result[character.id] = createBrain(character, persona)
      }
      // Never modify v1/v2 originals. A failed write leaves them available for retry/recovery.
      if (!current) this.saveBrains(result)
      return result
    } catch (error) {
      console.error('Brain data could not be read; original storage was left untouched.', error)
      return Object.fromEntries(characters.map(c => [c.id, createBrain(c, persona)]))
    }
  },

  saveBrains(brains) {
    try {
      localStorage.setItem(STORAGE_KEYS.BRAINS, JSON.stringify(brains || {}))
    } catch (e) {
      console.error('Failed to save brains to localStorage', e)
      try {
        // Purge deprecated storage keys to recover critical quota
        localStorage.removeItem(STORAGE_KEYS.LEGACY_BRAINS)
        localStorage.removeItem(STORAGE_KEYS.BRAIN)
        localStorage.setItem(STORAGE_KEYS.BRAINS, JSON.stringify(brains || {}))
      } catch (recoveryErr) {
        console.error('Emergency brain recovery failed due to storage quota', recoveryErr)
      }
    }
  },

  getBrain(charId = '', charName = '', characterData = null) {
    const character = characterData || this.getCharacters().find(c => c.id === charId) || { id: charId, name: charName }
    return this.getBrains()[charId] || createBrain(character, this.getUserPersona())
  },

  saveBrain(charIdOrBrain, brainData = null) {
    const id = typeof charIdOrBrain === 'string' ? charIdOrBrain : charIdOrBrain.characterId || 'char-laura'
    const brain = typeof charIdOrBrain === 'string' ? brainData : charIdOrBrain
    if (!brain) return
    const character = this.getCharacters().find(c => c.id === id) || { id }
    const all = this.getBrains()
    all[id] = normalizeBrain(brain, character, this.getUserPersona())
    this.saveBrains(all)
  },

  resetBrainForCharacter(charId, charName = '', characterData = null) {
    let charObj = characterData
    if (!charObj) {
      try {
        charObj = this.getCharacters().find((c) => c.id === charId) || null
      } catch {}
    }
    const cleanBrain = createDefaultBrainForCharacter(charId, charName || charObj?.name || '', charObj, this.getUserPersona())
    this.saveBrain(charId, cleanBrain)
    return cleanBrain
  },

  resetBrainToDefault(charId = 'char-laura', charName = 'Laura') {
    return this.resetBrainForCharacter(charId, charName)
  },

  // Export character to JSON
  exportCharacter(character) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(character, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `${character.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_card.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  },

  // Export chat log
  exportChatMarkdown(character, session, messages) {
    let md = `# Roleplay Transcript: ${character.name}\n`
    md += `*Session: ${session?.title || 'Chat'} - Generated on ${new Date().toLocaleString()}*\n\n`
    md += `**Character Scenario:** ${character.scenario}\n\n`
    md += `---\n\n`

    messages.forEach((msg) => {
      const sender = msg.role === 'user' ? 'You' : character.name
      md += `### ${sender} (${new Date(msg.createdAt).toLocaleTimeString()})\n\n${msg.content}\n\n`
    })

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.name.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.md`
    a.click()
    URL.revokeObjectURL(url)
  },
}
