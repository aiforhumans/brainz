import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import {
  X,
  Save,
  Trash2,
  Download,
  Sparkles,
  Wand2,
  RefreshCw,
  Flame,
  Check,
  AlertCircle,
  Upload,
  Plus,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MessageSquare,
  User,
} from 'lucide-react'
import { imageStorage } from '../services/imageStorage.js'
import { AvatarImage } from './AvatarImage'
import { formatRoleplayContent } from '../utils/roleplayFormatter.jsx'
import { replaceMacros } from '../utils/macroUtils.js'
import { estimateTokens } from '../services/pipelineEngine.js'

export function CharacterModal({
  isOpen,
  onClose,
  character,
  onSaveCharacter,
  onDeleteCharacter,
  onExportCharacter,
  client,
  settings,
  userPersona,
  template,
  beginForegroundRequest,
  getDraft,
  saveDraft,
  clearDraft,
}) {
  const DEFAULT_CHARACTER_TEMPLATE = template
  const generationControllerRef = useRef(null)
  const formRef = useRef(null)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState(DEFAULT_CHARACTER_TEMPLATE)
  useLayoutEffect(() => { formRef.current = formData }, [formData])

  // Studio UI state
  const [conceptPrompt, setConceptPrompt] = useState('')
  const [aiStyle, setAiStyle] = useState('detailed')
  const [showBlueprintBar, setShowBlueprintBar] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingField, setGeneratingField] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [aiSuccessMessage, setAiSuccessMessage] = useState(null)
  const [shake, setShake] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [activePreviewGreetingIndex, setActivePreviewGreetingIndex] = useState(0)
  const initialSnapshotRef = useRef('')

  useEffect(() => () => generationControllerRef.current?.abort(), [isOpen, character, userPersona])

  // Populate form on open or character switch
  useEffect(() => {
    if (!isOpen) return

    if (character) {
      const data = {
        name: character.name || '',
        tagline: character.tagline || '',
        category: character.category || 'Realistic',
        avatar: character.avatar || '',
        tags: Array.isArray(character.tags) ? character.tags.join(', ') : (character.tags || ''),
        personality: character.personality || '',
        scenario: character.scenario || '',
        systemPrompt: character.systemPrompt || '',
        greeting: character.greeting || '',
        alternateGreetings: Array.isArray(character.alternateGreetings)
          ? character.alternateGreetings.map((g, i) => (typeof g === 'string' ? { id: `alt-${i}`, label: `Scenario ${i + 1}`, text: g } : g))
          : [],
        nsfw: Boolean(character.nsfw),
      }
      setFormData(data)
      setConceptPrompt('')
      setHasRestoredDraft(false)
      setShowBlueprintBar(false)
      initialSnapshotRef.current = JSON.stringify({ formData: data, conceptPrompt: '' })
    } else {
      const draft = getDraft()
      if (
        draft &&
        draft.formData &&
        (draft.formData.name || draft.formData.personality || draft.formData.scenario || draft.conceptPrompt)
      ) {
        setFormData({
          ...DEFAULT_CHARACTER_TEMPLATE,
          ...draft.formData,
          alternateGreetings: Array.isArray(draft.formData.alternateGreetings) ? draft.formData.alternateGreetings : [],
        })
        setConceptPrompt(draft.conceptPrompt || '')
        setHasRestoredDraft(true)
        setShowBlueprintBar(Boolean(draft.conceptPrompt))
        initialSnapshotRef.current = JSON.stringify({
          formData: draft.formData,
          conceptPrompt: draft.conceptPrompt || '',
        })
      } else {
        setFormData(DEFAULT_CHARACTER_TEMPLATE)
        setConceptPrompt('')
        setHasRestoredDraft(false)
        setShowBlueprintBar(true)
        initialSnapshotRef.current = JSON.stringify({
          formData: DEFAULT_CHARACTER_TEMPLATE,
          conceptPrompt: '',
        })
      }
    }
    setAiError(null)
    setAiSuccessMessage(null)
    setShowDeleteConfirm(false)
    setActivePreviewGreetingIndex(0)
  }, [character, isOpen, DEFAULT_CHARACTER_TEMPLATE, getDraft])

  // Auto-save draft for new character creation
  useEffect(() => {
    if (!isOpen || character) return

    const hasContent =
      Boolean(formData.name?.trim()) ||
      Boolean(formData.personality?.trim()) ||
      Boolean(formData.scenario?.trim()) ||
      Boolean(formData.tagline?.trim()) ||
      Boolean(conceptPrompt?.trim())

    if (hasContent) {
      saveDraft({
        formData,
        conceptPrompt,
        updatedAt: Date.now(),
      })
    }
  }, [formData, conceptPrompt, isOpen, character, saveDraft])

  const isFormDirty = useCallback(() => {
    if (!initialSnapshotRef.current) return false
    const currentSnapshot = JSON.stringify({ formData, conceptPrompt })
    return currentSnapshot !== initialSnapshotRef.current
  }, [formData, conceptPrompt])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  const handleCloseAttempt = useCallback(() => {
    if (isFormDirty()) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in the character studio. Are you sure you want to discard your edits and close?'
      )
      if (confirmDiscard) {
        onClose()
      } else {
        triggerShake()
      }
    } else {
      onClose()
    }
  }, [isFormDirty, onClose])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseAttempt()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCloseAttempt])

  // Token calculations
  const personalityTokens = useMemo(() => estimateTokens(formData.personality || ''), [formData.personality])
  const scenarioTokens = useMemo(() => estimateTokens(formData.scenario || ''), [formData.scenario])
  const primaryGreetingTokens = useMemo(() => estimateTokens(formData.greeting || ''), [formData.greeting])
  const alternateGreetingsTokens = useMemo(() => {
    return (formData.alternateGreetings || []).reduce((sum, g) => sum + estimateTokens(g.text || ''), 0)
  }, [formData.alternateGreetings])
  const systemPromptTokens = useMemo(() => estimateTokens(formData.systemPrompt || ''), [formData.systemPrompt])
  const totalDefinitionTokens = personalityTokens + scenarioTokens + primaryGreetingTokens + alternateGreetingsTokens + systemPromptTokens

  // Active greeting for formatted preview
  const allGreetings = useMemo(() => {
    const list = []
    if (formData.greeting) {
      list.push({ label: 'Primary', text: formData.greeting })
    }
    if (Array.isArray(formData.alternateGreetings)) {
      formData.alternateGreetings.forEach((g, i) => {
        if (g.text) {
          list.push({ label: g.label || `Scenario ${i + 1}`, text: g.text })
        }
      })
    }
    return list
  }, [formData.greeting, formData.alternateGreetings])

  const activeGreetingText = useMemo(() => {
    if (allGreetings.length === 0) return formData.greeting || ''
    const item = allGreetings[activePreviewGreetingIndex] || allGreetings[0]
    return item?.text || formData.greeting || ''
  }, [allGreetings, activePreviewGreetingIndex, formData.greeting])

  const substitutedGreetingProse = useMemo(() => {
    if (!activeGreetingText) return ''
    return replaceMacros(activeGreetingText, {
      userName: userPersona?.name || 'You',
      charName: formData.name || 'Character',
    })
  }, [activeGreetingText, userPersona?.name, formData.name])

  const handleDiscardDraft = () => {
    if (window.confirm('Clear your unsaved draft and reset the character studio?')) {
      clearDraft()
      setFormData(DEFAULT_CHARACTER_TEMPLATE)
      setConceptPrompt('')
      setHasRestoredDraft(false)
      initialSnapshotRef.current = JSON.stringify({ formData: DEFAULT_CHARACTER_TEMPLATE, conceptPrompt: '' })
    }
  }

  const startGeneration = () => {
    const controller = new AbortController()
    generationControllerRef.current?.abort()
    generationControllerRef.current = controller
    const endForeground = beginForegroundRequest()
    const snapshot = JSON.stringify(formData)
    return {
      signal: controller.signal,
      finish: endForeground,
      verify: () => {
        controller.signal.throwIfAborted()
        if (JSON.stringify(formRef.current) !== snapshot) {
          throw new Error('The card changed while generation was running. Your edits were preserved.')
        }
      },
    }
  }

  // Avatar file upload handler
  const handleAvatarFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result
      if (typeof dataUrl === 'string') {
        const key = `idb:avatar_${Date.now()}`
        await imageStorage.saveImage(key, dataUrl)
        setFormData((prev) => ({ ...prev, avatar: key }))
      }
    }
    reader.readAsDataURL(file)
  }

  // Auto-generate whole card from concept prompt
  const handleAutoGenerateFromConcept = async (onlyFillEmpty = false) => {
    if (!conceptPrompt.trim()) {
      setAiError('Please enter a character concept, story trope, or scene premise first.')
      return
    }
    const request = startGeneration()
    setIsGenerating(true)
    setGeneratingField('full')
    setAiError(null)
    setAiSuccessMessage(null)

    try {
      const generated = await client.autoGenerateCharacterCard({
        concept: conceptPrompt.trim(),
        existingFields: Object.fromEntries(
          Object.entries(formData).filter(([key, value]) => !['avatar'].includes(key) && value !== DEFAULT_CHARACTER_TEMPLATE[key] && value !== '')
        ),
        style: aiStyle,
        isNsfw: formData.nsfw,
        settings,
        userPersona,
        signal: request.signal,
      })

      if (!generated) throw new Error('No character data received from AI model')

      request.verify()
      setFormData((prev) => {
        const isPersonaName = (n) => Boolean(n?.trim() && userPersona?.name?.trim() && n.trim().toLowerCase() === userPersona.name.trim().toLowerCase())

        if (onlyFillEmpty) {
          return {
            ...prev,
            name: (prev.name?.trim() && !isPersonaName(prev.name)) ? prev.name : (generated.name || prev.name),
            tagline: prev.tagline?.trim() ? prev.tagline : (generated.tagline || prev.tagline),
            category: prev.category?.trim() && prev.category !== DEFAULT_CHARACTER_TEMPLATE.category ? prev.category : (generated.category || prev.category),
            tags: prev.tags?.trim() && prev.tags !== DEFAULT_CHARACTER_TEMPLATE.tags
              ? prev.tags
              : (Array.isArray(generated.tags) ? generated.tags.join(', ') : (generated.tags || prev.tags)),
            personality: prev.personality?.trim() ? prev.personality : (generated.personality || prev.personality),
            scenario: prev.scenario?.trim() ? prev.scenario : (generated.scenario || prev.scenario),
            greeting: prev.greeting?.trim() && prev.greeting !== DEFAULT_CHARACTER_TEMPLATE.greeting
              ? prev.greeting
              : (generated.greeting || prev.greeting),
            systemPrompt: prev.systemPrompt?.trim() && prev.systemPrompt !== DEFAULT_CHARACTER_TEMPLATE.systemPrompt
              ? prev.systemPrompt
              : (generated.systemPrompt || prev.systemPrompt),
            nsfw: generated.nsfw !== undefined ? Boolean(generated.nsfw) : prev.nsfw,
          }
        }

        return {
          ...prev,
          name: (prev.name?.trim() && !isPersonaName(prev.name)) ? prev.name : (generated.name || prev.name),
          tagline: generated.tagline || prev.tagline,
          category: generated.category || prev.category,
          tags: Array.isArray(generated.tags) ? generated.tags.join(', ') : (generated.tags || prev.tags),
          personality: generated.personality || prev.personality,
          scenario: generated.scenario || prev.scenario,
          greeting: generated.greeting || prev.greeting,
          systemPrompt: generated.systemPrompt || prev.systemPrompt,
          nsfw: generated.nsfw !== undefined ? Boolean(generated.nsfw) : prev.nsfw,
        }
      })

      setAiSuccessMessage('Character card written successfully by local model!')
      setTimeout(() => setAiSuccessMessage(null), 3500)
    } catch (err) {
      console.error('Character generation failed:', err)
      setAiError(err.message || 'Generation failed. Ensure LM Studio is online and a model is loaded.')
    } finally {
      request.finish()
      setIsGenerating(false)
      setGeneratingField(null)
    }
  }

  // Optimize individual field with local AI
  const handleOptimizeField = async (field) => {
    if (isGenerating) return
    const request = startGeneration()
    setIsGenerating(true)
    setGeneratingField(field)
    setAiError(null)
    setAiSuccessMessage(null)

    try {
      const enhanced = await client.optimizeCharacterField({
        field,
        currentValue: formData[field],
        characterContext: formData,
        style: aiStyle,
        isNsfw: formData.nsfw,
        settings,
        userPersona,
        signal: request.signal,
      })

      request.verify()
      if (enhanced) {
        setFormData((prev) => ({ ...prev, [field]: enhanced.trim() }))
        setAiSuccessMessage(`Elevated ${field} with local AI!`)
        setTimeout(() => setAiSuccessMessage(null), 2500)
      }
    } catch (err) {
      console.error(`Field optimization failed for ${field}:`, err)
      setAiError(err.message || `Failed to rewrite ${field}`)
    } finally {
      request.finish()
      setIsGenerating(false)
      setGeneratingField(null)
    }
  }

  // Alternate Greetings handlers
  const handleAddAlternateGreeting = () => {
    const list = formData.alternateGreetings || []
    const newGreeting = {
      id: `alt-${Date.now()}`,
      label: `Scenario ${list.length + 1}`,
      text: '',
    }
    setFormData((prev) => ({
      ...prev,
      alternateGreetings: [...list, newGreeting],
    }))
  }

  const handleUpdateAlternateGreeting = (id, key, value) => {
    setFormData((prev) => ({
      ...prev,
      alternateGreetings: (prev.alternateGreetings || []).map((g) =>
        g.id === id ? { ...g, [key]: value } : g
      ),
    }))
  }

  const handleRemoveAlternateGreeting = (id) => {
    setFormData((prev) => ({
      ...prev,
      alternateGreetings: (prev.alternateGreetings || []).filter((g) => g.id !== id),
    }))
  }

  // Save Character
  const handleSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (!formData.name?.trim()) return

    const nameTrimmed = formData.name.trim()
    const isEditingDefaultLaura = character?.id === 'char-laura'
    const isEditingDefaultEsther = character?.id === 'char-esther'

    let targetId = character?.id || `char-${Date.now()}`
    const isNew =
      !character ||
      (isEditingDefaultLaura && nameTrimmed.toLowerCase() !== 'laura') ||
      (isEditingDefaultEsther && nameTrimmed.toLowerCase() !== 'esther')

    if (isNew && character) {
      targetId = `char-${Date.now()}`
    }

    const updated = {
      ...(character || {}),
      id: targetId,
      name: nameTrimmed,
      tagline: (formData.tagline || '').trim(),
      category: formData.category || 'Realistic',
      avatar: (formData.avatar || '').trim(),
      tags: Array.isArray(formData.tags)
        ? formData.tags
        : typeof formData.tags === 'string'
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      personality: (formData.personality || '').trim(),
      scenario: (formData.scenario || '').trim(),
      systemPrompt: (formData.systemPrompt || '').trim(),
      greeting: (formData.greeting || '').trim(),
      alternateGreetings: (formData.alternateGreetings || []).map((g) => ({
        id: g.id || `alt-${Date.now()}`,
        label: (g.label || '').trim() || 'Alternate',
        text: (g.text || '').trim(),
      })).filter((g) => g.text.length > 0),
      nsfw: Boolean(formData.nsfw),
    }

    if (updated.nsfw && !updated.tags.includes('18+ NSFW')) {
      updated.tags.push('18+ NSFW')
    }

    if (!character || isNew) {
      clearDraft()
      setHasRestoredDraft(false)
    }

    try {
      onSaveCharacter(updated, isNew)
    } catch (saveErr) {
      console.error('Error in onSaveCharacter:', saveErr)
    } finally {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseAttempt()
      }}
    >
      <div
        className={`modal-content character-studio-modal ${shake ? 'modal-shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draft Notification Bar */}
        {hasRestoredDraft && !character && (
          <div className="draft-alert-bar">
            <span>Restored unsaved character draft from browser storage.</span>
            <button type="button" className="btn-discard-draft" onClick={handleDiscardDraft}>
              Discard Draft
            </button>
          </div>
        )}

        {/* Studio Top Header */}
        <div className="character-studio-header">
          <div className="character-studio-title-group">
            <h2 className="character-studio-title">
              <Sparkles size={20} />
              <span>Character Studio</span>
            </h2>
            <span className="studio-status-pill">
              {character ? `Editing: ${character.name}` : 'New Character'}
            </span>
          </div>

          <div className="character-studio-actions">
            {character && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => onExportCharacter(character)}
                title="Export character as JSON"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
            )}

            {character && (
              showDeleteConfirm ? (
                <div className="character-studio-actions">
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => {
                      onDeleteCharacter(character.id)
                      onClose()
                    }}
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete this character"
                >
                  <Trash2 size={14} className="icon-danger" />
                </button>
              )
            )}

            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={!formData.name?.trim() || isGenerating}
            >
              <Save size={14} />
              <span>Save Character</span>
            </button>

            <button
              type="button"
              className="btn-nav-icon"
              onClick={handleCloseAttempt}
              aria-label="Close Character Studio"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Studio 2-Column Body */}
        <div className="character-studio-layout">
          {/* LEFT COLUMN: EDITOR FORM */}
          <form className="character-studio-editor" onSubmit={handleSubmit}>
            {/* Status Messages */}
            {aiError && (
              <div className="alert-box error">
                <AlertCircle size={16} />
                <span>{aiError}</span>
              </div>
            )}
            {aiSuccessMessage && (
              <div className="alert-box success">
                <Check size={16} />
                <span>{aiSuccessMessage}</span>
              </div>
            )}

            {/* TOP COLLAPSIBLE BLUEPRINT BAR */}
            <div className="studio-blueprint-bar">
              <div
                className="studio-blueprint-header"
                onClick={() => setShowBlueprintBar((prev) => !prev)}
              >
                <div className="studio-blueprint-title">
                  <Wand2 size={16} />
                  <span>AI Concept Blueprint Generator</span>
                </div>
                {showBlueprintBar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {showBlueprintBar && (
                <>
                  <div className="form-group">
                    <div className="form-label">
                      <span>Concept / Trope Blueprint</span>
                      <button
                        type="button"
                        className="blueprint-blueprint-btn"
                        onClick={() => {
                          setConceptPrompt(
`I want you to be: [Character name/identity & relation to {{user}}]
Scenario / Our Role: [The situation & setting with {{user}}]
Behave like: [Emotional state, physical reactions & speech style]`
                          )
                        }}
                      >
                        📋 Insert 3-Part Blueprint
                      </button>
                    </div>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Describe your character premise or rough story trope..."
                      value={conceptPrompt}
                      onChange={(e) => setConceptPrompt(e.target.value)}
                    />
                  </div>

                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Enhancement Style / Tone</label>
                      <select
                        className="form-select"
                        value={aiStyle}
                        onChange={(e) => setAiStyle(e.target.value)}
                      >
                        <option value="detailed">🎭 Realistic & Nuanced</option>
                        <option value="frightened-intense">😨 Suspenseful / High-Stakes</option>
                        <option value="vulnerable-emotional">💔 Vulnerable & Emotional</option>
                        <option value="dark-gritty">⚔️ Dark & Gritty</option>
                        <option value="witty">✨ Sarcastic & Witty</option>
                        <option value="sensual-passionate">💋 Passionate & Sensual (NSFW)</option>
                        <option value="raw-uncensored">🔞 Raw & Uncensored (NSFW)</option>
                      </select>
                    </div>

                    <div className="character-studio-actions" style={{ alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleAutoGenerateFromConcept(false)}
                        disabled={isGenerating || !conceptPrompt.trim()}
                        style={{ flex: 1 }}
                      >
                        {isGenerating && generatingField === 'full' ? (
                          <>
                            <RefreshCw size={14} className="icon-pulse" />
                            <span>Crafting...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 size={14} />
                            <span>Generate Full Card</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleAutoGenerateFromConcept(true)}
                        disabled={isGenerating || !conceptPrompt.trim()}
                      >
                        Fill Empty Only
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* SECTION 1: IDENTITY & VISUALS */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title">
                  <User size={16} />
                  <span>Identity & Visuals</span>
                </div>
              </div>

              <div className="grid-2-col">
                <div className="form-group">
                  <label className="form-label">Character Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Laura, Lyra, Elena"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tagline / Role</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Childhood best friend, Cyberpunk decker"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2-col">
                <div className="form-group">
                  <label className="form-label">Genre Category</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Realistic">Realistic / Slice of Life</option>
                    <option value="Fantasy">Fantasy / Magic</option>
                    <option value="Cyberpunk">Cyberpunk / Sci-Fi</option>
                    <option value="Supernatural">Supernatural / Occult</option>
                    <option value="Romance">Romance / Drama</option>
                    <option value="Horror">Horror / Thriller</option>
                    <option value="Anime">Anime / Manga</option>
                    <option value="Historical">Historical</option>
                    <option value="Custom">Custom Universe</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="1-on-1, Sibling, Mystery"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              {/* Avatar Drag & Drop Upload Zone */}
              <div className="form-group">
                <label className="form-label">Avatar Image</label>
                <div
                  className={`avatar-dropzone ${isDragOver ? 'drag-active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragOver(false)
                    if (e.dataTransfer.files?.[0]) {
                      handleAvatarFile(e.dataTransfer.files[0])
                    }
                  }}
                >
                  <div className="avatar-preview-thumb">
                    <AvatarImage
                      src={formData.avatar}
                      alt="Avatar preview"
                      fallbackContent={<ImageIcon size={24} className="icon-muted" />}
                      fallbackClassName=""
                    />
                  </div>

                  <div className="avatar-upload-info">
                    <label className="avatar-upload-label" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={14} />
                      <span>Choose local image or drop file here</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleAvatarFile(e.target.files[0])
                        }
                      }}
                    />
                    <span className="avatar-upload-hint">Stores safely in IndexedDB without eating LocalStorage quota.</span>

                    <input
                      type="text"
                      className="form-input avatar-url-input"
                      placeholder="Or enter remote image URL (https://...)"
                      value={formData.avatar}
                      onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    />
                  </div>

                  {formData.avatar && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setFormData({ ...formData, avatar: '' })}
                      title="Remove avatar"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* NSFW Banner */}
              <div className={`studio-nsfw-banner ${formData.nsfw ? 'nsfw-active' : 'nsfw-inactive'}`}>
                <div className="studio-nsfw-left">
                  <Flame size={20} className={formData.nsfw ? 'icon-danger' : 'icon-muted'} />
                  <div>
                    <div className="studio-nsfw-title">18+ Mature / NSFW Content</div>
                    <div className="studio-nsfw-subtext">Allows visceral creative themes, adult romance, and uninhibited roleplay.</div>
                  </div>
                </div>

                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.nsfw}
                    onChange={(e) => setFormData({ ...formData, nsfw: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {/* SECTION 2: PSYCHOLOGY & PERSONA */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title">
                  <span>Psychology & Persona</span>
                </div>
                <div className="character-studio-actions">
                  <span className="studio-token-pill">~{personalityTokens} tok</span>
                  <button
                    type="button"
                    className="studio-ai-btn"
                    onClick={() => handleOptimizeField('personality')}
                    disabled={isGenerating}
                    title="Elevate personality and speaking mannerisms with local AI"
                  >
                    <Wand2 size={12} />
                    <span>Enhance Voice</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <textarea
                  className="form-textarea"
                  rows={5}
                  placeholder="Emotional traits, quirks, flaws, speech cadence, and relationship dynamics..."
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                />
              </div>
            </div>

            {/* SECTION 3: WORLD & SCENARIO */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title">
                  <span>World & Scenario</span>
                </div>
                <div className="character-studio-actions">
                  <span className="studio-token-pill">~{scenarioTokens} tok</span>
                  <button
                    type="button"
                    className="studio-ai-btn"
                    onClick={() => handleOptimizeField('scenario')}
                    disabled={isGenerating}
                    title="Flesh out world stakes and situation"
                  >
                    <Wand2 size={12} />
                    <span>Flesh out World</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Where the scene takes place, why both characters are there, and immediate tension or comfort..."
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                />
              </div>
            </div>

            {/* SECTION 4: OPENING GREETINGS DECK */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title">
                  <MessageSquare size={16} />
                  <span>Opening Greetings Deck</span>
                </div>
                <div className="character-studio-actions">
                  <span className="studio-token-pill">
                    ~{primaryGreetingTokens + alternateGreetingsTokens} tok
                  </span>
                  <button
                    type="button"
                    className="studio-ai-btn"
                    onClick={() => handleOptimizeField('greeting')}
                    disabled={isGenerating}
                    title="Draft or enhance opening greeting from scenario"
                  >
                    <Wand2 size={12} />
                    <span>Draft from Scenario</span>
                  </button>
                </div>
              </div>

              {/* Primary Greeting */}
              <div className="form-group">
                <label className="form-label">
                  <span>Primary Greeting (Default Opening)</span>
                  <span className="studio-token-pill">~{primaryGreetingTokens} tok</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="*Physical actions in asterisks.* &quot;Spoken dialogue in quotes.&quot;"
                  value={formData.greeting}
                  onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                />
              </div>

              {/* Alternate Greetings List */}
              <div className="greetings-deck">
                {(formData.alternateGreetings || []).map((alt, index) => (
                  <div key={alt.id || index} className="greeting-deck-item">
                    <div className="greeting-item-header">
                      <input
                        type="text"
                        className="greeting-label-input"
                        value={alt.label || `Scenario ${index + 1}`}
                        onChange={(e) => handleUpdateAlternateGreeting(alt.id, 'label', e.target.value)}
                        placeholder="Scenario label (e.g. Tavern, Romance)"
                      />
                      <div className="character-studio-actions">
                        <span className="studio-token-pill">~{estimateTokens(alt.text || '')} tok</span>
                        <button
                          type="button"
                          className="btn-icon-close"
                          onClick={() => handleRemoveAlternateGreeting(alt.id)}
                          title="Remove this alternate greeting"
                        >
                          <Trash2 size={13} className="icon-danger" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Alternate opening scene text..."
                      value={alt.text}
                      onChange={(e) => handleUpdateAlternateGreeting(alt.id, 'text', e.target.value)}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddAlternateGreeting}
                >
                  <Plus size={14} />
                  <span>Add Alternate Greeting</span>
                </button>
              </div>
            </div>

            {/* SECTION 5: ADVANCED DIRECTIVES */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title">
                  <span>System Directives & Guardrails</span>
                </div>
                <div className="character-studio-actions">
                  <span className="studio-token-pill">~{systemPromptTokens} tok</span>
                  <button
                    type="button"
                    className="studio-ai-btn"
                    onClick={() => handleOptimizeField('systemPrompt')}
                    disabled={isGenerating}
                    title="Optimize system instructions"
                  >
                    <Wand2 size={12} />
                    <span>Optimize Directives</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <textarea
                  className="form-textarea"
                  rows={5}
                  placeholder="Behavioral constraints, formatting rules, anti-interview guidelines..."
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                />
              </div>
            </div>
          </form>

          {/* RIGHT COLUMN: LIVE CARD PREVIEW & TOKEN BUDGET */}
          <aside className="character-studio-preview">
            {/* Live Chat Header Simulation */}
            <div className="preview-card-box">
              <div className="preview-card-header">
                <div className="preview-card-avatar">
                  <AvatarImage
                    src={formData.avatar}
                    alt={formData.name || 'Preview'}
                    fallbackContent={formData.name ? formData.name.charAt(0) : '?'}
                    fallbackStyle={{ background: formData.avatarFallbackBg || undefined }}
                    isNsfw={formData.nsfw}
                  />
                </div>
                <div className="preview-card-info">
                  <div className="preview-card-name">
                    <span>{formData.name || 'Unnamed Character'}</span>
                    {formData.nsfw && (
                      <span className="nsfw-badge-header">
                        <Flame size={10} fill="currentColor" /> 18+
                      </span>
                    )}
                  </div>
                  <div className="preview-card-tagline">
                    {formData.tagline || 'Roleplay companion'}
                  </div>
                </div>
              </div>

              {formData.tags && (
                <div className="preview-tags-row">
                  {(typeof formData.tags === 'string' ? formData.tags.split(',') : formData.tags)
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <span key={tag} className="preview-tag-chip">{tag}</span>
                    ))}
                </div>
              )}

              {/* Greeting Selector if alternates exist */}
              {allGreetings.length > 1 && (
                <div className="preview-greeting-selector">
                  {allGreetings.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`preview-greeting-tab ${activePreviewGreetingIndex === idx ? 'active' : ''}`}
                      onClick={() => setActivePreviewGreetingIndex(idx)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Formatted Roleplay Prose Preview */}
              <div className="preview-prose-container">
                {substitutedGreetingProse ? (
                  formatRoleplayContent(substitutedGreetingProse)
                ) : (
                  <em className="text-muted">Opening greeting formatted preview will appear here...</em>
                )}
              </div>
            </div>

            {/* Token Budget Meter */}
            <div className="preview-budget-box">
              <div className="preview-budget-header">
                <span className="preview-budget-title">Character Token Footprint</span>
                <span className="studio-token-pill">
                  {totalDefinitionTokens} / ~2048 tok
                </span>
              </div>

              <div className="preview-budget-bar">
                <div
                  className="preview-budget-fill"
                  style={{
                    width: `${Math.min(100, (totalDefinitionTokens / 2048) * 100)}%`,
                    background:
                      totalDefinitionTokens > 2048
                        ? 'var(--accent-crimson)'
                        : totalDefinitionTokens > 1500
                          ? 'var(--accent-amber)'
                          : 'var(--primary)',
                  }}
                />
              </div>

              <div className="preview-budget-chips">
                <div className="preview-budget-item">
                  <span>Persona:</span>
                  <strong>{personalityTokens} tok</strong>
                </div>
                <div className="preview-budget-item">
                  <span>Scenario:</span>
                  <strong>{scenarioTokens} tok</strong>
                </div>
                <div className="preview-budget-item">
                  <span>Greetings:</span>
                  <strong>{primaryGreetingTokens + alternateGreetingsTokens} tok</strong>
                </div>
                <div className="preview-budget-item">
                  <span>Directives:</span>
                  <strong>{systemPromptTokens} tok</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
