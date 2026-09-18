import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { CharacterModal } from './components/CharacterModal'
import { SettingsModal } from './components/SettingsModal'
import { UserPersonaModal } from './components/UserPersonaModal'
import { LorebookModal } from './components/LorebookModal'
import { BrainModal } from './components/BrainModal'
import { storageService } from './services/storageService'
import { createLMStudioClient } from './services/lmStudioClient'
import { DEFAULT_CHARACTERS } from './services/defaultCharacters'
import { createBrain, normalizeBrain, reconcileBrain, cardContext, fingerprint, learningFingerprint, memorySignature, isAutoLearnDue } from './services/brainService'
import { createCharacterTemplate, buildCompiledPromptPipeline } from './services/promptService'
import { replaceMacros } from './utils/macroUtils.js'
import { SceneStateManager } from './services/pipelineEngine.js'

export default function App() {
  // Persistence state
  const [characters, setCharacters] = useState(() => storageService.getCharacters())
  const [activeCharacterId, setActiveCharacterId] = useState(() => storageService.getActiveCharacterId())
  const [sessions, setSessions] = useState(() => storageService.getSessions())
  const [userPersona, setUserPersona] = useState(() => storageService.getUserPersona())
  const [lorebook, setLorebook] = useState(() => storageService.getLorebook())
  const [settings, setSettings] = useState(() => storageService.getSettings())
  const [brains, setBrains] = useState(() => storageService.getBrains())

  // Runtime LM Studio state
  const [models, setModels] = useState([])
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    latencyMs: 0,
    error: null,
    isChecking: true,
  })

  // Chat UI runtime state
  const [input, setInput] = useState('')
  const [attachedImage, setAttachedImage] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const abortControllerRef = useRef(null)
  const currentStreamIdRef = useRef(0)

  // Modals
  const [characterModalState, setCharacterModalState] = useState({ isOpen: false, character: null })
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [personaModalOpen, setPersonaModalOpen] = useState(false)
  const [lorebookModalOpen, setLorebookModalOpen] = useState(false)
  const [brainModalOpen, setBrainModalOpen] = useState(false)
  const [isSynthesizingBrain, setIsSynthesizingBrain] = useState(false)
  const [synthesisProgress, setSynthesisProgress] = useState('')
  const [foregroundBusy, setForegroundBusy] = useState(0)
  const [learningTick, setLearningTick] = useState(0)
  const brainRequestRef = useRef(null)
  const pendingLearningRef = useRef(new Map())
  const seenLearningRef = useRef(new Map())
  const foregroundTokensRef = useRef(new Set())
  const latestRef = useRef(null)
  useLayoutEffect(() => {
    latestRef.current = { characters, sessions, brains, userPersona, settings, connectionStatus }
  }, [characters, sessions, brains, userPersona, settings, connectionStatus])

  const beginForegroundRequest = useCallback(() => {
    brainRequestRef.current?.controller.abort()
    const token = Symbol('foreground')
    foregroundTokensRef.current.add(token)
    setForegroundBusy(foregroundTokensRef.current.size)
    return () => {
      foregroundTokensRef.current.delete(token)
      setForegroundBusy(foregroundTokensRef.current.size)
      setLearningTick(t => t + 1)
    }
  }, [])

  const invalidateLearning = useCallback((charId) => {
    if (!charId || brainRequestRef.current?.charId === charId) brainRequestRef.current?.controller.abort()
  }, [])


  // Initialize LM Studio Client
  const client = useMemo(() => {
    return createLMStudioClient(() => settings)
  }, [settings])

  // Active character object
  const activeCharacter = useMemo(() => {
    return characters.find((c) => c.id === activeCharacterId) || characters[0] || DEFAULT_CHARACTERS[0]
  }, [characters, activeCharacterId])

  // Active character's dedicated Brain Data Bank
  const activeBrain = useMemo(() => {
    if (!activeCharacter?.id) return null
    return reconcileBrain(brains[activeCharacter.id] || createBrain(activeCharacter, userPersona), activeCharacter, userPersona, sessions[activeCharacter.id] || [])
  }, [brains, activeCharacter, userPersona, sessions])

  // Active session ID for active character
  const activeSessionId = useMemo(() => {
    const charSessions = sessions[activeCharacter.id] || []
    const storedActiveId = storageService.getActiveSessionId(activeCharacter.id)
    if (storedActiveId && charSessions.some((s) => s.id === storedActiveId)) {
      return storedActiveId
    }
    return charSessions[0]?.id || null
  }, [sessions, activeCharacter.id])

  // Active session object
  const currentSession = useMemo(() => {
    const charSessions = sessions[activeCharacter.id] || []
    return charSessions.find((s) => s.id === activeSessionId) || null
  }, [sessions, activeCharacter.id, activeSessionId])

  // Active messages
  const currentMessages = useMemo(() => {
    return currentSession?.messages || []
  }, [currentSession])

  // All brain writes are synchronous transactions against the latest App-owned snapshot.
  const handleSaveBrain = useCallback((updatedBrain, targetCharId = null, options = {}) => {
    const charId = targetCharId || activeCharacter?.id
    const current = latestRef.current
    const character = current.characters.find(c => c.id === charId)
    if (!character) return
    invalidateLearning(charId)
    const previous = current.brains[charId]
    if (!options.preservePending) pendingLearningRef.current.delete(charId)
    const normalized = normalizeBrain(updatedBrain, character, current.userPersona)
    const removed = (previous?.memories || []).filter(m => !normalized.memories.some(item => item.id === m.id)).map(memorySignature)
    const saved = { ...normalized, excludedMemories: [...new Set([...normalized.excludedMemories, ...removed])], revision: (previous?.revision || 0) + 1 }
    const next = { ...current.brains, [charId]: saved }
    storageService.saveBrains(next)
    latestRef.current = { ...current, brains: next }
    setBrains(next)
    setLearningTick(t => t + 1)
  }, [activeCharacter.id, invalidateLearning])

  // Ensure active session exists on character change
  useEffect(() => {
    if (!activeCharacter?.id) return

    setSessions((prev) => {
      const charSessions = prev[activeCharacter.id] || []
      if (charSessions.length > 0) return prev

      const now = Date.now()
      const newSessionId = `sess-${now}`
      const initialMessages = []
      if (activeCharacter.greeting) {
        initialMessages.push({
          id: `msg-${now}`,
          role: 'assistant',
          content: replaceMacros(activeCharacter.greeting, { userName: userPersona?.name, charName: activeCharacter.name }),
          createdAt: now,
        })
      }

      const newSession = {
        id: newSessionId,
        title: 'Initial Encounter',
        createdAt: now,
        updatedAt: now,
        messages: initialMessages,
      }

      const updated = {
        ...prev,
        [activeCharacter.id]: [newSession],
      }
      storageService.saveSessions(updated)
      storageService.setActiveSessionId(activeCharacter.id, newSessionId)
      return updated
    })
  }, [activeCharacter?.id, activeCharacter?.greeting, activeCharacter?.name, userPersona?.name])

  // Hydrate image attachments stored in IndexedDB into session state on startup
  useEffect(() => {
    let cancelled = false
    storageService.hydrateSessionImages(sessions).then((hydrated) => {
      if (!cancelled && hydrated) {
        setSessions((prev) => ({ ...prev, ...hydrated }))
      }
    })
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Check LM Studio health & fetch models on mount
  const checkHealthAndModels = useCallback(async () => {
    setConnectionStatus((prev) => ({ ...prev, isChecking: true }))
    const health = await client.checkHealth()
    setConnectionStatus({ ...health, isChecking: false })

    if (health.connected) {
      try {
        const availableModels = await client.getModels()
        setModels(availableModels)

        // If settings model is empty or not in models, pick a sensible one
        if (availableModels.length > 0) {
          const currentModelInList = availableModels.some((m) => m.id === settings.model)
          if (!settings.model || !currentModelInList) {
            const defaultChoice = availableModels[0].id
            setSettings((prev) => {
              const updated = { ...prev, model: defaultChoice }
              storageService.saveSettings(updated)
              return updated
            })
          }
        }
      } catch (err) {
        console.warn('Could not fetch model list:', err)
      }
    }
    return health
  }, [client, settings.model])

  useEffect(() => {
    checkHealthAndModels()

    // Periodic ping every 25 seconds
    const interval = setInterval(() => {
      if (!isStreaming) {
        client.checkHealth().then((h) => {
          setConnectionStatus((prev) => ({ ...prev, ...h, isChecking: false }))
        })
      }
    }, 25000)

    return () => clearInterval(interval)
  }, [checkHealthAndModels, client, isStreaming])

  // Handle selecting a character
  const handleSelectCharacter = (id) => {
    setActiveCharacterId(id)
    storageService.setActiveCharacterId(id)
  }

  // Handle saving characters
  const handleSaveCharacter = useCallback((updatedChar, isNew = false) => {
    let updated
    const index = characters.findIndex((c) => c.id === updatedChar.id)
    if (index >= 0) {
      updated = [...characters]
      updated[index] = updatedChar
    } else {
      updated = [updatedChar, ...characters]
    }
    setCharacters(updated)
    storageService.saveCharacters(updated)
    setActiveCharacterId(updatedChar.id)
    storageService.setActiveCharacterId(updatedChar.id)

    invalidateLearning(updatedChar.id)
    latestRef.current = { ...latestRef.current, characters: updated }
    const brain = reconcileBrain(brains[updatedChar.id] || createBrain(updatedChar, userPersona), updatedChar, userPersona, sessions[updatedChar.id] || [])
    handleSaveBrain(brain, updatedChar.id)
    if (isNew || index < 0) pendingLearningRef.current.set(updatedChar.id, { fromScenario: true, requestedAt: Date.now() })
    setLearningTick(t => t + 1)
  }, [characters, brains, sessions, userPersona, invalidateLearning, handleSaveBrain])

  // Handle deleting a character
  const handleDeleteCharacter = (id) => {
    invalidateLearning(id)
    pendingLearningRef.current.delete(id)
    storageService.markCharacterDeleted(id)
    setCharacters((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      storageService.saveCharacters(updated)

      if (activeCharacterId === id) {
        const nextId = updated[0]?.id || DEFAULT_CHARACTERS[0].id
        setActiveCharacterId(nextId)
        storageService.setActiveCharacterId(nextId)
      }
      return updated
    })
  }

  // Handle resetting characters to defaults
  const handleResetDefaults = () => {
    if (confirm('Reset all character presets to default? This will restore original lore and avatars.')) {
      invalidateLearning()
      storageService.clearDeletedCharactersHistory()
      setCharacters(DEFAULT_CHARACTERS)
      storageService.saveCharacters(DEFAULT_CHARACTERS)
      setActiveCharacterId(DEFAULT_CHARACTERS[0].id)
      storageService.setActiveCharacterId(DEFAULT_CHARACTERS[0].id)
    }
  }

  // Handle importing character JSON
  const handleImportCharacter = useCallback((json) => {
    const newChar = {
      id: `char-${Date.now()}`,
      name: json.name || json.data?.name || 'Imported Hero',
      tagline: json.tagline || json.data?.tagline || 'Imported Character',
      category: json.category || json.data?.category || 'Custom',
      avatar: json.avatar || json.data?.avatar || '',
      tags: json.tags || json.data?.tags || ['Custom', 'Imported'],
      personality: json.personality || json.data?.personality || json.description || '',
      scenario: json.scenario || json.data?.scenario || '',
      systemPrompt: json.systemPrompt || json.data?.systemPrompt || json.system_prompt || '',
      greeting: json.greeting || json.first_mes || json.data?.first_mes || '',
      nsfw: Boolean(json.nsfw ?? json.data?.nsfw),
    }

    handleSaveCharacter(newChar, true)
  }, [handleSaveCharacter])

  // Session actions
  const handleSelectSession = (sessionId) => {
    storageService.setActiveSessionId(activeCharacter.id, sessionId)
    setSessions((prev) => ({ ...prev }))
  }

  const handleNewSession = () => {
    const newSessionId = `sess-${Date.now()}`
    const charSessions = sessions[activeCharacter.id] || []
    const sessionCount = charSessions.length + 1

    const initialMessages = []
    if (activeCharacter.greeting) {
      initialMessages.push({
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: replaceMacros(activeCharacter.greeting, { userName: userPersona?.name, charName: activeCharacter.name }),
        createdAt: Date.now(),
      })
    }

    const newSession = {
      id: newSessionId,
      title: `Chapter ${sessionCount}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: initialMessages,
    }

    const updated = {
      ...sessions,
      [activeCharacter.id]: [newSession, ...charSessions],
    }

    setSessions(updated)
    storageService.saveSessions(updated)
    storageService.setActiveSessionId(activeCharacter.id, newSessionId)
  }

  const handleDeleteSession = (sessionId) => {
    invalidateLearning(activeCharacter.id)
    const charSessions = sessions[activeCharacter.id] || []
    if (charSessions.length <= 1) return

    const filtered = charSessions.filter((s) => s.id !== sessionId)
    const updated = {
      ...sessions,
      [activeCharacter.id]: filtered,
    }

    setSessions(updated)
    storageService.saveSessions(updated)
    storageService.setActiveSessionId(activeCharacter.id, filtered[0].id)
  }

  // Helper to update current session messages
  const updateCurrentSessionMessages = useCallback((newMessages) => {
    invalidateLearning(activeCharacter.id)
    setSessions((prev) => {
      const charSessions = prev[activeCharacter.id] || []
      const targetId = activeSessionId || charSessions[0]?.id
      if (!targetId) return prev
      const updatedSessions = {
        ...prev,
        [activeCharacter.id]: charSessions.map((s) =>
          s.id === targetId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s
        ),
      }
      storageService.saveSessions(updatedSessions)
      return updatedSessions
    })
  }, [activeCharacter.id, activeSessionId, invalidateLearning])

  // Clear all messages in current chat session
  const handleClearSession = () => {
    if (isStreaming) {
      handleStopGeneration()
    }
    setInput('')
    setAttachedImage(null)
    updateCurrentSessionMessages([])
  }

  // Restore the character opening greeting if cleared
  const handleRestoreGreeting = () => {
    if (!activeCharacter?.greeting) return
    const now = Date.now()
    updateCurrentSessionMessages([
      {
        id: `msg-${now}`,
        role: 'assistant',
        content: replaceMacros(activeCharacter.greeting, { userName: userPersona?.name, charName: activeCharacter.name }),
        createdAt: now,
      },
    ])
  }

  // Core streaming executor for new messages and regenerations
  const executeStreamingChat = useCallback(async (targetSessionId, assistantMsgId, promptMessages) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const streamId = ++currentStreamIdRef.current
    const endForeground = beginForegroundRequest()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsStreaming(true)
    setStreamingStatus({ stage: 'connecting', progress: null, label: 'Connecting to LM Studio...' })

    try {
      await client.streamChat({
        messages: promptMessages,
        character: activeCharacter,
        userPersona,
        lorebook,
        settings,
        brain: activeBrain,
        signal: controller.signal,
        onStatus: (status) => {
          if (currentStreamIdRef.current !== streamId) return
          setStreamingStatus(status)
        },
        onReasoningChunk: (_delta, fullReasoning) => {
          if (currentStreamIdRef.current !== streamId) return
          setSessions((prev) => {
            const charSessions = prev[activeCharacter.id] || []
            const targetSession = charSessions.find((s) => s.id === targetSessionId)
            if (!targetSession) return prev

            const updatedMsgs = targetSession.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, reasoningContent: fullReasoning } : m
            )

            return {
              ...prev,
              [activeCharacter.id]: charSessions.map((s) =>
                s.id === targetSessionId ? { ...s, messages: updatedMsgs } : s
              ),
            }
          })
        },
        onChunk: (_delta, fullText) => {
          if (currentStreamIdRef.current !== streamId) return
          setSessions((prev) => {
            const charSessions = prev[activeCharacter.id] || []
            const targetSession = charSessions.find((s) => s.id === targetSessionId)
            if (!targetSession) return prev

            const updatedMsgs = targetSession.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: fullText } : m
            )

            return {
              ...prev,
              [activeCharacter.id]: charSessions.map((s) =>
                s.id === targetSessionId ? { ...s, messages: updatedMsgs } : s
              ),
            }
          })
        },
        onEnd: ({ stats, responseId, modelInstanceId, fullContent, fullReasoning }) => {
          if (currentStreamIdRef.current !== streamId) return
          // Persist the cadence per character, including regeneration/continuation replies.
          const current = latestRef.current
          const character = current.characters.find(c => c.id === activeCharacter.id)
          const target = current.sessions[activeCharacter.id]?.find(s => s.id === targetSessionId)
          if (character && target?.messages.some(m => m.id === assistantMsgId) && fullContent?.trim()) {
            const brain = current.brains[character.id] || createBrain(character, current.userPersona)
            handleSaveBrain({ ...brain, repliesSinceLearning: (brain.repliesSinceLearning || 0) + 1 }, character.id, { preservePending: true })
          }
          setSessions((prev) => {
            const charSessions = prev[activeCharacter.id] || []
            const targetSession = charSessions.find((s) => s.id === targetSessionId)
            if (!targetSession) return prev

            const updatedMsgs = targetSession.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: fullContent || m.content,
                    reasoningContent: fullReasoning || m.reasoningContent,
                    complete: true,
                    failed: false,
                    stats: stats || m.stats,
                    responseId: responseId || m.responseId,
                    model: modelInstanceId || settings.model,
                  }
                : m
            )

            // Post-turn processing: Update ephemeral scene state and thread tracking in background
            try {
              const lastUserTurn = targetSession.messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''
              const charName = character?.name?.trim() || 'Character'
              const userName = current.userPersona?.name?.trim() || 'User'
              const existingScene = targetSession.sceneState || current.brains[character?.id]?.sceneState || null
              const updatedScene = SceneStateManager.applyTurn(existingScene, lastUserTurn, fullContent, charName, userName)

              // Persist scene state into active brain
              if (character) {
                const currentBrain = current.brains[character.id] || createBrain(character, current.userPersona)
                handleSaveBrain({ ...currentBrain, sceneState: updatedScene }, character.id, { preservePending: true })
              }
            } catch (err) {
              console.warn('Post-turn scene processing encountered an issue, chat preserved:', err)
            }

            const updatedSessions = {
              ...prev,
              [activeCharacter.id]: charSessions.map((s) =>
                s.id === targetSessionId ? { ...s, messages: updatedMsgs, updatedAt: Date.now() } : s
              ),
            }
            storageService.saveSessions(updatedSessions)
            return updatedSessions
          })
        },
      })
    } catch (err) {
      if (currentStreamIdRef.current !== streamId) return
      if (err.name === 'AbortError') {
        console.log('Generation aborted by user')
      } else {
        console.error('Chat error:', err)
        setSessions((prev) => {
          const charSessions = prev[activeCharacter.id] || []
          const targetSession = charSessions.find((s) => s.id === targetSessionId)
          if (!targetSession) return prev

          const updatedMsgs = targetSession.messages.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  failed: true,
                  complete: false,
                  content: m.content
                    ? `${m.content}\n\n*[Connection error: ${err.message}]*`
                    : `*[Error: ${err.message}. Ensure LM Studio is running and model is loaded.]*`,
                }
              : m
          )

          const updatedSessions = {
            ...prev,
            [activeCharacter.id]: charSessions.map((s) =>
              s.id === targetSessionId ? { ...s, messages: updatedMsgs } : s
            ),
          }
          storageService.saveSessions(updatedSessions)
          return updatedSessions
        })
      }
    } finally {
      if (currentStreamIdRef.current === streamId) {
        setIsStreaming(false)
        setStreamingStatus(null)
        abortControllerRef.current = null
      }
      endForeground()
    }
  }, [client, activeCharacter, userPersona, lorebook, settings, activeBrain, beginForegroundRequest, handleSaveBrain])

  // Send message with streaming response
  const handleSendMessage = useCallback(async (customUserText = null, control = false) => {
    const textToSend = typeof customUserText === 'string' ? customUserText.trim() : input.trim()
    const imageToSend = attachedImage
    if ((!textToSend && !imageToSend) || isStreaming) return

    setInput('')
    setAttachedImage(null)

    const now = Date.now()

    // 1. Add user message
    const userMsg = {
      id: `msg-${now}`,
      role: 'user',
      control,
      content: textToSend || (imageToSend ? '*[Shares visual imagery]*' : ''),
      image: imageToSend || null,
      createdAt: now,
    }

    // 2. Add placeholder assistant message
    const assistantMsgId = `msg-${now + 1}`
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      complete: false,
      content: '',
      reasoningContent: '',
      stats: null,
      createdAt: now,
    }

    const nextMessages = [...currentMessages, userMsg, assistantMsg]
    updateCurrentSessionMessages(nextMessages)

    // 3. Initiate SSE Streaming
    const messagesForPrompt = [...currentMessages, userMsg]
    await executeStreamingChat(activeSessionId, assistantMsgId, messagesForPrompt)
  }, [input, attachedImage, isStreaming, currentMessages, updateCurrentSessionMessages, executeStreamingChat, activeSessionId])

  // Model Lifecycle: Load Model into VRAM
  const handleLoadModel = async (modelKey) => {
    if (!modelKey || isModelLoading) return
    const endForeground = beginForegroundRequest()
    setIsModelLoading(true)
    try {
      await client.loadModel({
        model: modelKey,
        contextLength: settings.contextLength || 8192,
        flashAttention: settings.flashAttention ?? true,
        ttl: settings.ttl || 0,
      })
      await checkHealthAndModels()
    } catch (err) {
      console.error('Failed to load model into VRAM:', err)
      alert(`Failed to load model: ${err.message}`)
    } finally {
      setIsModelLoading(false)
      endForeground()
    }
  }

  // Model Lifecycle: Eject Model from VRAM
  const handleUnloadModel = async (instanceId) => {
    if (!instanceId || isModelLoading) return
    const endForeground = beginForegroundRequest()
    setIsModelLoading(true)
    try {
      await client.unloadModel(instanceId)
      await checkHealthAndModels()
    } catch (err) {
      console.error('Failed to eject model from VRAM:', err)
      alert(`Failed to unload model: ${err.message}`)
    } finally {
      setIsModelLoading(false)
      endForeground()
    }
  }

  // Stop Generation
  const handleStopGeneration = useCallback(() => {
    currentStreamIdRef.current++
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStreamingStatus(null)
  }, [])

  // Continue generation
  const handleContinueGeneration = async () => {
    if (isStreaming || currentMessages.length === 0) return

    const continuePrompt = `*Continue your narrative and actions naturally without repeating yourself.*`
    handleSendMessage(continuePrompt, true)
  }

  // Regenerate last assistant response
  const handleRegenerate = useCallback(async () => {
    if (isStreaming || currentMessages.length === 0) return

    const lastIdx = currentMessages.map((m) => m.role).lastIndexOf('assistant')
    if (lastIdx < 0) return

    const now = Date.now()
    // Slice out the last assistant message
    const prunedMessages = currentMessages.slice(0, lastIdx)
    const assistantMsgId = `msg-${now}`
    const freshAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      complete: false,
      content: '',
      reasoningContent: '',
      stats: null,
      createdAt: now,
    }

    const nextMessages = [...prunedMessages, freshAssistantMsg]
    updateCurrentSessionMessages(nextMessages)

    await executeStreamingChat(activeSessionId, assistantMsgId, prunedMessages)
  }, [isStreaming, currentMessages, updateCurrentSessionMessages, executeStreamingChat, activeSessionId])

  // Edit an existing message
  const handleEditMessage = (messageId, newContent) => {
    const updatedMsgs = currentMessages.map((m) =>
      m.id === messageId ? { ...m, content: newContent } : m
    )
    updateCurrentSessionMessages(updatedMsgs)
  }

  // Delete an existing message
  const handleDeleteMessage = (messageId) => {
    const updatedMsgs = currentMessages.filter((m) => m.id !== messageId)
    updateCurrentSessionMessages(updatedMsgs)
  }

  // Export chat transcript
  const handleExportChat = () => {
    if (activeCharacter && currentSession) {
      storageService.exportChatMarkdown(activeCharacter, currentSession, currentMessages)
    }
  }

  const requestSnapshot = (charId, current) => fingerprint([
    cardContext(current.characters.find(c => c.id === charId) || {}), current.userPersona,
    current.brains[charId], learningFingerprint(current.sessions[charId] || []), current.settings,
  ])

  const runBrainJob = useCallback(async (charId, fromScenario = false, automatic = false) => {
    const initial = latestRef.current
    const character = initial.characters.find(c => c.id === charId)
    if (!character || brainRequestRef.current || foregroundTokensRef.current.size) return
    const oldBrain = initial.brains[charId] || createBrain(character, initial.userPersona)
    if (!initial.connectionStatus.connected) {
      if (fromScenario) handleSaveBrain(reconcileBrain(oldBrain, character, initial.userPersona, initial.sessions[charId] || []), charId)
      setSynthesisProgress(fromScenario ? 'Authored context refreshed. Learned memories preserved; AI extraction is pending until LM Studio is online.' : 'Learning pending: connect LM Studio. Existing memories are unchanged.')
      return
    }
    const controller = new AbortController()
    const request = { charId, controller, snapshot: requestSnapshot(charId, initial) }
    brainRequestRef.current = request
    setIsSynthesizingBrain(true)
    setSynthesisProgress(`${automatic ? 'Auto-learning' : 'Analyzing'} ${character.name}'s verified context…`)
    try {
      const charSessions = initial.sessions[charId] || []
      const reconciled = reconcileBrain(oldBrain, character, initial.userPersona, charSessions)
      let result
      if (fromScenario) {
        const extracted = await client.generateInitialBrainForCharacter({ character, userPersona: initial.userPersona, settings: initial.settings, signal: controller.signal })
        const retained = reconciled.memories.filter(m => m.provenance !== 'card' || m.status === 'needs_review')
        const additions = extracted.memories.filter(m => !reconciled.excludedMemories.includes(memorySignature(m)) && !retained.some(r => memorySignature(r) === memorySignature(m)))
        result = { ...reconciled, memories: [...retained, ...additions] }
      } else {
        result = await client.analyzeAndSynthesizeBrain({ character, sessions: { [charId]: charSessions }, existingBrain: reconciled, settings: initial.settings, userPersona: initial.userPersona, signal: controller.signal })
      }
      if (controller.signal.aborted || brainRequestRef.current !== request || requestSnapshot(charId, latestRef.current) !== request.snapshot) return
      const current = latestRef.current
      const saved = { ...result, repliesSinceLearning: fromScenario ? (oldBrain.repliesSinceLearning || 0) : 0, revision: (current.brains[charId]?.revision || 0) + 1 }
      const next = { ...current.brains, [charId]: saved }
      storageService.saveBrains(next)
      latestRef.current = { ...current, brains: next }
      setBrains(next)
      if (fromScenario && isAutoLearnDue(saved)) {
        pendingLearningRef.current.set(charId, { fromScenario: false, requestedAt: Date.now() })
      } else {
        pendingLearningRef.current.delete(charId)
      }
      setSynthesisProgress(`${character.name}'s memory is up to date. Unsupported entries remain available for review.`)
    } catch (error) {
      if (error.name !== 'AbortError' && !controller.signal.aborted) {
        pendingLearningRef.current.delete(charId)
        setSynthesisProgress(`Learning failed: ${error.message} Existing memories are unchanged. Use Synthesize Brain to retry.`)
      } else {
        setSynthesisProgress('Learning paused for foreground activity; pending changes will be retried when idle.')
      }
    } finally {
      if (brainRequestRef.current === request) brainRequestRef.current = null
      setIsSynthesizingBrain(false)
      setLearningTick(t => t + 1)
    }
  }, [client, handleSaveBrain])

  const handleSynthesizeBrain = (targetCharId = null, options = {}) => {
    const id = typeof targetCharId === 'string' ? targetCharId : activeCharacter?.id
    if (!id) return
    pendingLearningRef.current.set(id, { fromScenario: Boolean(options.fromScenario), requestedAt: Date.now(), manual: true })
    if (!brainRequestRef.current && !foregroundTokensRef.current.size) void runBrainJob(id, Boolean(options.fromScenario))
    else setSynthesisProgress('Learning queued until the current request finishes.')
  }

  const handleAutoFillUserProfile = useCallback(async () => {
    if (!activeCharacter || !activeBrain) return null
    const charSessions = sessions[activeCharacter.id] || []
    return await client.autoFillUserProfile({
      character: activeCharacter,
      userPersona,
      memories: activeBrain.memories || [],
      sessions: charSessions,
      settings,
    })
  }, [client, activeCharacter, activeBrain, sessions, userPersona, settings])

  // Debounced, serial learning. Streamed partial tokens are not evidence and foreground work wins.
  useEffect(() => {
    for (const character of characters) {
      const charSessions = sessions[character.id] || []
      const signature = fingerprint([learningFingerprint(charSessions), brains[character.id]?.repliesSinceLearning || 0])
      if (seenLearningRef.current.get(character.id) !== signature) {
        seenLearningRef.current.set(character.id, signature)
        if (isAutoLearnDue(brains[character.id])) {
          const previousJob = pendingLearningRef.current.get(character.id)
          pendingLearningRef.current.set(character.id, { ...previousJob, fromScenario: Boolean(previousJob?.fromScenario), requestedAt: Date.now() })
        }
      }
    }
    if (foregroundBusy || isStreaming || isModelLoading || brainRequestRef.current) return
    const entry = [...pendingLearningRef.current.entries()].find(([id, job]) => characters.some(c => c.id === id) && (job.manual || (brains[id]?.enabled !== false && brains[id]?.autoLearn !== false)))
    if (!entry) return
    if (!connectionStatus.connected) {
      setSynthesisProgress('Learning pending: connect LM Studio. Existing memories are unchanged.')
      return
    }
    const [id, job] = entry
    const timer = setTimeout(() => { void runBrainJob(id, job.fromScenario, !job.manual) }, Math.max(0, 2000 - (Date.now() - job.requestedAt)))
    return () => clearTimeout(timer)
  }, [sessions, characters, userPersona, brains, foregroundBusy, isStreaming, isModelLoading, connectionStatus.connected, learningTick, runBrainJob])

  useEffect(() => () => { brainRequestRef.current?.controller.abort(); abortControllerRef.current?.abort() }, [])

  const characterTemplate = useMemo(() => createCharacterTemplate(userPersona), [userPersona])
  const promptPipeline = useMemo(() => {
    if (!activeCharacter) return null
    return buildCompiledPromptPipeline({
      character: activeCharacter,
      persona: userPersona,
      lorebook,
      history: currentMessages,
      mature: settings.nsfwMode,
      brain: activeBrain,
      sceneState: activeBrain?.sceneState || null,
      settings,
    })
  }, [activeCharacter, userPersona, lorebook, currentMessages, settings, activeBrain])
  const fullPromptPreview = useMemo(() => promptPipeline?.systemPrompt || '', [promptPipeline])


  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        connectionStatus={connectionStatus}
        onRefreshHealth={checkHealthAndModels}
        models={models}
        selectedModel={settings.model}
        onSelectModel={(modelId) => {
          invalidateLearning()
          const updated = { ...settings, model: modelId }
          setSettings(updated)
          storageService.saveSettings(updated)
        }}
        onLoadModel={handleLoadModel}
        onUnloadModel={handleUnloadModel}
        isModelLoading={isModelLoading}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenPersona={() => setPersonaModalOpen(true)}
        onOpenLorebook={() => setLorebookModalOpen(true)}
        onOpenBrain={() => setBrainModalOpen(true)}
        brainMemoriesCount={activeBrain?.memories?.length || 0}
        isBrainSynthesizing={isSynthesizingBrain}
        brainEnabled={activeBrain?.enabled !== false}
        userPersona={userPersona}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main App Layout */}
      <div className="main-content">
        <Sidebar
          characters={characters}
          activeCharacterId={activeCharacterId}
          onSelectCharacter={handleSelectCharacter}
          onCreateCharacter={() => setCharacterModalState({ isOpen: true, character: null })}
          onImportCharacter={handleImportCharacter}
          onExportCharacter={storageService.exportCharacter}
          onResetDefaults={handleResetDefaults}
          collapsed={sidebarCollapsed}
        />

        <ChatArea
          character={activeCharacter}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onClearSession={handleClearSession}
          onRestoreGreeting={handleRestoreGreeting}
          onDeleteSession={handleDeleteSession}
          onEditCharacter={() => setCharacterModalState({ isOpen: true, character: activeCharacter })}
          onExportChat={handleExportChat}
          messages={currentMessages}
          input={input}
          setInput={setInput}
          attachedImage={attachedImage}
          setAttachedImage={setAttachedImage}
          hasVisionSupport={Boolean(models.find((m) => m.id === settings.model || m.key === settings.model)?.capabilities?.vision)}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onContinueGeneration={handleContinueGeneration}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          isStreaming={isStreaming}
          streamingStatus={streamingStatus}
          userPersona={userPersona}
          brain={activeBrain}
          lorebook={lorebook}
          settings={settings}
          onOpenBrain={() => setBrainModalOpen(true)}
          onOpenLorebook={() => setLorebookModalOpen(true)}
          promptPipeline={promptPipeline}
        />
      </div>

      {/* Modals */}
      <CharacterModal
        isOpen={characterModalState.isOpen}
        character={characterModalState.character}
        onClose={() => setCharacterModalState({ isOpen: false, character: null })}
        onSaveCharacter={handleSaveCharacter}
        onDeleteCharacter={handleDeleteCharacter}
        onExportCharacter={storageService.exportCharacter}
        client={client}
        userPersona={userPersona}
        template={characterTemplate}
        beginForegroundRequest={beginForegroundRequest}
        getDraft={storageService.getCharacterDraft}
        saveDraft={storageService.saveCharacterDraft}
        clearDraft={storageService.clearCharacterDraft}
        settings={settings}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          invalidateLearning()
          setSettings(newSettings)
          storageService.saveSettings(newSettings)
        }}
        models={models}
        onRefreshHealth={checkHealthAndModels}
        connectionStatus={connectionStatus}
      />

      <UserPersonaModal
        isOpen={personaModalOpen}
        onClose={() => setPersonaModalOpen(false)}
        persona={userPersona}
        onSavePersona={(newPersona) => {
          invalidateLearning()
          setUserPersona(newPersona)
          storageService.saveUserPersona(newPersona)
        }}
      />

      <LorebookModal
        isOpen={lorebookModalOpen}
        onClose={() => setLorebookModalOpen(false)}
        lorebook={lorebook}
        onSaveLorebook={(newLore) => {
          setLorebook(newLore)
          storageService.saveLorebook(newLore)
        }}
      />

      <BrainModal
        isOpen={brainModalOpen}
        onClose={() => setBrainModalOpen(false)}
        brain={activeBrain}
        userPersona={userPersona}
        promptPreview={fullPromptPreview}
        onResetBrain={() => handleSaveBrain(createBrain(activeCharacter, userPersona), activeCharacter.id)}
        character={activeCharacter}
        characters={characters}
        onSaveBrain={handleSaveBrain}
        onSynthesizeBrain={handleSynthesizeBrain}
        onAutoFillProfile={handleAutoFillUserProfile}
        isSynthesizing={isSynthesizingBrain}
        synthesisProgress={synthesisProgress}
        isAiOnline={connectionStatus.connected}
      />
    </div>
  )
}
