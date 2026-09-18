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
  Cpu,
  RotateCcw,
} from 'lucide-react'
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
  const [formData, setFormData] = useState(DEFAULT_CHARACTER_TEMPLATE)
  useLayoutEffect(() => { formRef.current = formData }, [formData])

  // AI Generator / Optimizer state
  const [activeTab, setActiveTab] = useState('editor') // 'editor' | 'generator'
  const [conceptPrompt, setConceptPrompt] = useState('')
  const [aiStyle, setAiStyle] = useState('detailed')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingField, setGeneratingField] = useState(null) // null | 'full' | 'greeting' | 'personality' | 'scenario' | 'systemPrompt'
  const [aiError, setAiError] = useState(null)
  const [aiSuccessMessage, setAiSuccessMessage] = useState(null)
  const [shake, setShake] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const initialSnapshotRef = useRef('')

  useEffect(() => () => generationControllerRef.current?.abort(), [isOpen, character, userPersona])

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
        if (JSON.stringify(formRef.current) !== snapshot) throw new Error('The card changed while generation was running. Your edits were preserved; retry with the updated card.')
      },
    }
  }

  // Detect fields already populated with text (unconditional hook)
  const populatedFields = useMemo(() => {
    const list = []
    if (formData.name?.trim()) list.push({ key: 'name', label: 'Name', value: formData.name.trim() })
    if (formData.tagline?.trim()) list.push({ key: 'tagline', label: 'Tagline', value: formData.tagline.trim() })
    if (formData.category?.trim() && formData.category !== 'Realistic') list.push({ key: 'category', label: 'Category', value: formData.category })
    if (formData.tags?.trim() && formData.tags !== DEFAULT_CHARACTER_TEMPLATE.tags) list.push({ key: 'tags', label: 'Tags', value: formData.tags.trim() })
    if (formData.personality?.trim()) list.push({ key: 'personality', label: 'Personality', value: formData.personality.trim() })
    if (formData.scenario?.trim()) list.push({ key: 'scenario', label: 'Scenario', value: formData.scenario.trim() })
    if (formData.greeting?.trim() && formData.greeting !== DEFAULT_CHARACTER_TEMPLATE.greeting) list.push({ key: 'greeting', label: 'Greeting', value: formData.greeting.trim() })
    if (formData.systemPrompt?.trim() && formData.systemPrompt !== DEFAULT_CHARACTER_TEMPLATE.systemPrompt) list.push({ key: 'systemPrompt', label: 'System Directives', value: formData.systemPrompt.trim() })
    return list
  }, [formData, DEFAULT_CHARACTER_TEMPLATE])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  const isFormDirty = useCallback(() => {
    if (!initialSnapshotRef.current) return false
    const currentSnapshot = JSON.stringify({ formData, conceptPrompt })
    return currentSnapshot !== initialSnapshotRef.current
  }, [formData, conceptPrompt])

  const handleCloseAttempt = useCallback(() => {
    if (isFormDirty()) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in the character creator. Are you sure you want to discard your edits and close?'
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

  const handleBackdropClick = (e) => {
    // Prevent closing when clicking or dragging next to the window
    if (e.target !== e.currentTarget) return
    if (isFormDirty()) {
      triggerShake()
      const confirmDiscard = window.confirm(
        'You have unsaved changes in the character creator. Are you sure you want to discard your edits and close?'
      )
      if (confirmDiscard) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const handleDiscardDraft = () => {
    if (window.confirm('Clear your unsaved draft and reset the character form?')) {
      clearDraft()
      setFormData(DEFAULT_CHARACTER_TEMPLATE)
      setConceptPrompt('')
      setHasRestoredDraft(false)
      initialSnapshotRef.current = JSON.stringify({ formData: DEFAULT_CHARACTER_TEMPLATE, conceptPrompt: '' })
    }
  }

  useEffect(() => {
    if (!isOpen) return

    if (character) {
      const data = {
        name: character.name || '',
        tagline: character.tagline || '',
        category: character.category || 'Realistic',
        avatar: character.avatar || '',
        tags: Array.isArray(character.tags) ? character.tags.join(', ') : '',
        personality: character.personality || '',
        scenario: character.scenario || '',
        systemPrompt: character.systemPrompt || '',
        greeting: character.greeting || '',
        nsfw: Boolean(character.nsfw),
      }
      setFormData(data)
      setConceptPrompt('')
      setHasRestoredDraft(false)
      initialSnapshotRef.current = JSON.stringify({ formData: data, conceptPrompt: '' })
    } else {
      // Check for saved draft in localStorage
      const draft = getDraft()
      if (
        draft &&
        draft.formData &&
        (draft.formData.name || draft.formData.personality || draft.formData.scenario || draft.conceptPrompt)
      ) {
        setFormData(draft.formData)
        setConceptPrompt(draft.conceptPrompt || '')
        setHasRestoredDraft(true)
        initialSnapshotRef.current = JSON.stringify({
          formData: draft.formData,
          conceptPrompt: draft.conceptPrompt || '',
        })
      } else {
        setFormData(DEFAULT_CHARACTER_TEMPLATE)
        setConceptPrompt('')
        setHasRestoredDraft(false)
        initialSnapshotRef.current = JSON.stringify({
          formData: DEFAULT_CHARACTER_TEMPLATE,
          conceptPrompt: '',
        })
      }
    }
    setAiError(null)
    setAiSuccessMessage(null)
    setActiveTab('editor')
    setShowDeleteConfirm(false)
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

  // Handle Escape key safely
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

  if (!isOpen) return null

  // Auto-generate whole character card from concept + any already populated fields
  const handleAutoGenerateFromConcept = async (onlyFillEmpty = false) => {
    if (!conceptPrompt.trim() && populatedFields.length === 0) {
      setAiError('Please enter a persona/scenario idea or fill at least one field first.')
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
        existingFields: Object.fromEntries(Object.entries(formData).filter(([key, value]) => !['avatar'].includes(key) && value !== DEFAULT_CHARACTER_TEMPLATE[key] && value !== '')),
        style: aiStyle,
        isNsfw: formData.nsfw,
        settings,
        userPersona,
        signal: request.signal,
      })

      if (!generated) {
        throw new Error('No character data received from AI model')
      }

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

      const count = populatedFields.length
      setAiSuccessMessage(
        count > 0
          ? `All character fields written! AI synthesized your prompt + ${count} existing field${count > 1 ? 's' : ''}.`
          : 'All character fields successfully written by AI!'
      )
      setTimeout(() => setAiSuccessMessage(null), 3500)
    } catch (err) {
      console.error('Character generation failed:', err)
      setAiError(err.message || 'Generation failed. Ensure LM Studio has a model loaded.')
    } finally {
      request.finish()
      setIsGenerating(false)
      setGeneratingField(null)
    }
  }

  // Optimize / rewrite a single field using local AI
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

  // Optimize all core text fields
  const handleOptimizeAll = async () => {
    if (isGenerating) return
    const request = startGeneration()
    setIsGenerating(true)
    setGeneratingField('full')
    setAiError(null)

    try {
      const generated = await client.optimizeCharacterCard({
        characterContext: formData, style: aiStyle, isNsfw: formData.nsfw,
        settings, userPersona, signal: request.signal,
      })
      request.verify()
      setFormData(prev => ({ ...prev, ...generated, tags: generated.tags.join(', ') }))
      setAiSuccessMessage('Character card polished and optimized!')
      setTimeout(() => setAiSuccessMessage(null), 3000)
    } catch (err) {
      setAiError(err.message || 'Full card optimization failed.')
    } finally {
      request.finish()
      setIsGenerating(false)
      setGeneratingField(null)
    }
  }

  const handleSubmit = (e) => {
    if (e?.preventDefault) {
      e.preventDefault()
    }
    if (!formData.name?.trim()) return

    const nameTrimmed = formData.name.trim()
    const isEditingDefaultLaura = character?.id === 'char-laura'
    const isEditingDefaultEsther = character?.id === 'char-esther'

    // If editing a default character (like Laura or Esther) but changed their identity/name,
    // fork to a fresh unique ID so Laura/Esther presets are preserved and the new character is decoupled.
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
      nsfw: Boolean(formData.nsfw),
    }

    // Ensure 18+ NSFW tag is present if NSFW is active
    if (updated.nsfw && !updated.tags.includes('18+ NSFW')) {
      updated.tags.push('18+ NSFW')
    }

    // Clear draft if saving a new character
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

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div
        className={`modal-content ${shake ? 'modal-shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3>{character ? `Edit: ${character.name}` : 'Create Character'}</h3>
            {formData.nsfw && (
              <span
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #9f1239)',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: '0 0 10px rgba(225, 29, 72, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Flame size={12} fill="currentColor" /> 18+ NSFW
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-nav-icon"
            onClick={handleCloseAttempt}
            title="Close window"
          >
            <X size={18} />
          </button>
        </div>

        {/* Unsaved Draft Alert Banner */}
        {hasRestoredDraft && !character && (
          <div className="draft-alert-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span>Unsaved character draft restored from your previous session</span>
            </div>
            <button
              type="button"
              className="btn-discard-draft"
              onClick={handleDiscardDraft}
              title="Clear draft and reset form"
            >
              <RotateCcw size={11} style={{ marginRight: '4px' }} />
              Discard Draft
            </button>
          </div>
        )}

        {/* AI Generator / Optimizer Mode Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(15, 22, 38, 0.7)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`session-tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              Manual Details
            </button>
            <button
              type="button"
              className={`session-tab ${activeTab === 'generator' ? 'active' : ''}`}
              onClick={() => setActiveTab('generator')}
              style={{
                borderColor: activeTab === 'generator' ? 'var(--primary)' : 'rgba(139, 92, 246, 0.3)',
                color: activeTab === 'generator' ? '#fff' : 'var(--primary-hover)',
              }}
            >
              <Sparkles size={13} />
              <span>AI Concept Generator</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cpu size={12} /> {settings?.model?.split('/').pop() || 'LM Studio'}
            </span>
            {activeTab === 'editor' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleOptimizeAll}
                disabled={isGenerating}
                style={{
                  fontSize: '0.76rem',
                  padding: '4px 10px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  borderColor: 'rgba(139, 92, 246, 0.35)',
                  color: 'var(--primary-hover)',
                }}
                title="Rewrite Personality, Scenario, Greeting, and System Directives together using local LM Studio"
              >
                <Wand2 size={13} />
                <span>{generatingField === 'full' ? 'Rewriting...' : 'AI Rewrite Card'}</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Error / Success Notification */}
        {aiError && (
          <div
            style={{
              padding: '10px 20px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={14} />
            <span>{aiError}</span>
          </div>
        )}

        {aiSuccessMessage && (
          <div
            style={{
              padding: '10px 20px',
              background: 'rgba(16, 185, 129, 0.15)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={14} />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* TAB 1: AI CONCEPT GENERATOR */}
        {activeTab === 'generator' && (
          <div className="modal-body" style={{ gap: '16px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(6, 182, 212, 0.06))',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
                <Sparkles size={16} style={{ color: 'var(--primary-hover)' }} />
                <span>Instant Character Generation with Local AI</span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-subtle)', lineHeight: '1.5' }}>
                Enter a brief concept or rough story trope. Your local LM Studio model will write the full character persona, world setting, opening roleplay greeting, and system prompts!
              </p>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Character Concept / Idea</label>
                  <button
                    type="button"
                    onClick={() => {
                      setConceptPrompt(
`I want you to be: [Character name/identity & relation to {{user}}]
Scenario / Our Role: [The situation & setting with {{user}}]
Behave like: [Emotional state, physical reactions & speech style]`
                      )
                    }}
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: 'var(--primary-hover)',
                      fontSize: '0.74rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Insert 3-part blueprint template"
                  >
                    <span>📋 Insert 3-Part Blueprint</span>
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="I want you to be: [Character name/identity & relation to {{user}}]\nScenario / Our Role: [The situation & setting with {{user}}]\nBehave like: [Emotional state, physical reactions & speech style]"
                  value={conceptPrompt}
                  onChange={(e) => setConceptPrompt(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Enhancement Style / Tone</label>
                  <select
                    className="form-select"
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value)}
                  >
                    <option value="detailed">🎭 Realistic & Nuanced</option>
                    <option value="frightened-intense">😨 Frightened / Suspenseful / High-Stakes</option>
                    <option value="vulnerable-emotional">💔 Vulnerable & Emotional</option>
                    <option value="dark-gritty">⚔️ Dark & Gritty</option>
                    <option value="witty">✨ Sarcastic & Witty</option>
                    <option value="sensual-passionate">💋 Passionate & Sensual (NSFW)</option>
                    <option value="raw-uncensored">🔞 Raw & Uncensored (NSFW)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Content Rating</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: formData.nsfw ? 'rgba(225, 29, 72, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${formData.nsfw ? 'rgba(225, 29, 72, 0.4)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: formData.nsfw ? '#fca5a5' : 'var(--text-subtle)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.nsfw}
                      onChange={(e) => setFormData({ ...formData, nsfw: e.target.checked })}
                      style={{ accentColor: '#e11d48' }}
                    />
                    <Flame size={14} style={{ color: formData.nsfw ? '#f43f5e' : 'var(--text-dim)' }} />
                    <span>🔞 18+ NSFW Character</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleAutoGenerateFromConcept(false)}
                disabled={isGenerating || !conceptPrompt.trim()}
                style={{ width: '100%', marginTop: '6px' }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Crafting Character with Local Model...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={15} />
                    <span>Generate Character Card</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL EDITOR WITH PER-FIELD REWRITE */}
        {activeTab === 'editor' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="modal-body">
              {/* NSFW Toggle Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: formData.nsfw
                    ? 'linear-gradient(135deg, rgba(225, 29, 72, 0.15), rgba(159, 18, 57, 0.08))'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${formData.nsfw ? 'rgba(225, 29, 72, 0.35)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Flame size={20} style={{ color: formData.nsfw ? '#f43f5e' : 'var(--text-dim)' }} />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: formData.nsfw ? '#fff' : 'var(--text-subtle)' }}>
                      🔞 NSFW / Mature Character (18+)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Allows explicit intimacy, mature romance, visceral grit, and uninhibited creative roleplay.
                    </div>
                  </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.nsfw}
                    onChange={(e) => setFormData({ ...formData, nsfw: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      inset: 0,
                      backgroundColor: formData.nsfw ? '#e11d48' : 'rgba(255, 255, 255, 0.15)',
                      transition: '0.2s',
                      borderRadius: '24px',
                      boxShadow: formData.nsfw ? '0 0 12px rgba(225, 29, 72, 0.5)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: formData.nsfw ? '22px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.2s',
                        borderRadius: '50%',
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* AI Character Architect Card */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(6, 182, 212, 0.08))',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    <Sparkles size={16} style={{ color: 'var(--primary-hover)' }} />
                    <span>AI Character Architect & Auto-Filler</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tone / Vibe:</label>
                    <select
                      className="form-select"
                      style={{ padding: '3px 8px', fontSize: '0.76rem', height: 'auto', width: 'auto' }}
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value)}
                    >
                      <option value="detailed">🎭 Realistic & Nuanced</option>
                      <option value="frightened-intense">😨 Frightened / Suspenseful</option>
                      <option value="vulnerable-emotional">💔 Vulnerable & Emotional</option>
                      <option value="dark-gritty">⚔️ Dark & Gritty</option>
                      <option value="witty">✨ Sarcastic & Witty</option>
                      <option value="sensual-passionate">💋 Passionate & Sensual (NSFW)</option>
                      <option value="raw-uncensored">🔞 Raw & Uncensored (NSFW)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', margin: 0 }}>
                      Desired Persona, Scenario & Emotional State:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setConceptPrompt(
`I want you to be: [Character name/identity & relation to {{user}}]
Scenario / Our Role: [The situation, setting & what we are doing with {{user}}]
Behave like: [Emotional state, mannerisms & speech style]`
                        )
                      }}
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        color: 'var(--primary-hover)',
                        fontSize: '0.72rem',
                        padding: '1px 7px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Insert 3-part blueprint template"
                    >
                      <span>📋 Insert 3-Part Blueprint</span>
                    </button>
                  </div>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    style={{ fontSize: '0.84rem', lineHeight: '1.4', minHeight: '62px' }}
                    placeholder="I want you to be: [Character name/identity & relation to {{user}}]\nScenario / Our Role: [The situation, setting & what we are doing with {{user}}]\nBehave like: [Starting mood, habits & speech mannerisms]"
                    value={conceptPrompt}
                    onChange={(e) => setConceptPrompt(e.target.value)}
                  />
                </div>

                {/* Populated Fields Context Indicator */}
                {populatedFields.length > 0 && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      padding: '5px 9px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(139, 92, 246, 0.12)',
                      border: '1px solid rgba(139, 92, 246, 0.22)',
                      color: 'var(--primary-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>💡 <strong>Context Detected:</strong> {populatedFields.length} field{populatedFields.length > 1 ? 's' : ''} already populated ({populatedFields.map(f => f.label).join(', ')}) — AI will build upon and align all fields with them.</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleAutoGenerateFromConcept(false)}
                    disabled={isGenerating || (!conceptPrompt.trim() && populatedFields.length === 0)}
                    style={{ flex: 1.2, minWidth: '200px', padding: '7px 12px', fontSize: '0.82rem' }}
                    title="Write and complete all fields based on your prompt and existing input"
                  >
                    {isGenerating && generatingField === 'full' ? (
                      <>
                        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Writing All Fields with AI...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={13} />
                        <span>⚡ Write & Complete All Fields</span>
                      </>
                    )}
                  </button>

                  {populatedFields.length > 0 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleAutoGenerateFromConcept(true)}
                      disabled={isGenerating || (!conceptPrompt.trim() && populatedFields.length === 0)}
                      style={{ flex: 0.8, minWidth: '150px', padding: '7px 10px', fontSize: '0.78rem' }}
                      title="Only fill in the empty fields, preserving what you already typed"
                    >
                      <Sparkles size={12} />
                      <span>Fill Empty Fields Only</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Name and Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Character Name *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="e.g. Serena the Shadowmancer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category / Genre</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {!['Realistic', 'Slice-of-Life', 'Romance', 'Modern', 'Fantasy', 'Cyberpunk', 'Sci-Fi', 'Gothic', 'Historical', 'Anime'].includes(formData.category) && <option value={formData.category}>{formData.category}</option>}
                    <option value="Realistic">Realistic / Modern Human</option>
                    <option value="Slice-of-Life">Slice-of-Life / Everyday</option>
                    <option value="Romance">Romance / Intimate</option>
                    <option value="Modern">Modern / Urban</option>
                    <option value="Fantasy">Fantasy</option>
                    <option value="Cyberpunk">Cyberpunk</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Gothic">Gothic / Supernatural</option>
                    <option value="Historical">Historical</option>
                    <option value="Anime">Anime / Manga</option>
                  </select>
                </div>
              </div>

              {/* Tagline */}
              <div className="form-group">
                <label className="form-label">Tagline / Subtitle</label>
                <input
                  className="form-input"
                  placeholder="Short one-line character identity"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                />
              </div>

              {/* Avatar URL & Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Avatar Image URL</label>
                  <input
                    className="form-input"
                    placeholder="https://... or leave empty for initials"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Mage, Dark Fantasy, 18+ NSFW"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              {/* Initial Greeting with AI Polish Button */}
              <div className="form-group">
                <div className="form-label">
                  <span>Initial Greeting Message *</span>
                  <button
                    type="button"
                    className="btn-msg-action"
                    onClick={() => handleOptimizeField('greeting')}
                    disabled={isGenerating}
                    style={{ color: 'var(--primary-hover)' }}
                    title="Polish opening greeting using local AI"
                  >
                    <Sparkles size={12} />
                    <span>{generatingField === 'greeting' ? 'Polishing...' : 'AI Polish'}</span>
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder={`*Steps out from the shadows.* "What brings you to my domain?"`}
                  value={formData.greeting}
                  onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                />
              </div>

              {/* Scenario & World Setting with AI Polish Button */}
              <div className="form-group">
                <div className="form-label">
                  <span>Scenario & World Setting</span>
                  <button
                    type="button"
                    className="btn-msg-action"
                    onClick={() => handleOptimizeField('scenario')}
                    disabled={isGenerating}
                    style={{ color: 'var(--primary-hover)' }}
                    title="Atmospherically enhance scenario using local AI"
                  >
                    <Sparkles size={12} />
                    <span>{generatingField === 'scenario' ? 'Polishing...' : 'AI Polish'}</span>
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Where does the story take place? Atmosphere, time, mood..."
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                />
              </div>

              {/* Personality with AI Polish Button */}
              <div className="form-group">
                <div className="form-label">
                  <span>Personality & Traits</span>
                  <button
                    type="button"
                    className="btn-msg-action"
                    onClick={() => handleOptimizeField('personality')}
                    disabled={isGenerating}
                    style={{ color: 'var(--primary-hover)' }}
                    title="Deepen character personality using local AI"
                  >
                    <Sparkles size={12} />
                    <span>{generatingField === 'personality' ? 'Polishing...' : 'AI Polish'}</span>
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Meticulous, sarcastic, fiercely loyal, talks with formal cadence..."
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                />
              </div>

              {/* Core System Prompt Directive with AI Polish */}
              <div className="form-group">
                <div className="form-label">
                  <span>Core System Prompt Directive</span>
                  <button
                    type="button"
                    className="btn-msg-action"
                    onClick={() => handleOptimizeField('systemPrompt')}
                    disabled={isGenerating}
                    style={{ color: 'var(--primary-hover)' }}
                    title="Optimize system prompt directives"
                  >
                    <Sparkles size={12} />
                    <span>{generatingField === 'systemPrompt' ? 'Optimizing...' : 'AI Optimize'}</span>
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              {showDeleteConfirm && character ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(225, 29, 72, 0.12)',
                    border: '1px solid rgba(225, 29, 72, 0.35)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '0.86rem' }}>
                    <Trash2 size={16} style={{ color: '#f43f5e' }} />
                    <span>
                      Permanently delete <strong>{character.name}</strong>?
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteCharacter(character.id)
                        setShowDeleteConfirm(false)
                        onClose()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #e11d48, #be123c)',
                        color: '#fff',
                        border: '1px solid #f43f5e',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        boxShadow: '0 0 12px rgba(225, 29, 72, 0.4)',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Confirm Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {character && (
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => onExportCharacter(character)}
                        title="Export character card JSON"
                      >
                        <Download size={14} />
                        <span>Export</span>
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ color: '#f87171' }}
                        title="Delete this character"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </>
                  )}

                  <button type="button" className="btn-secondary" onClick={handleCloseAttempt}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" onClick={handleSubmit}>
                    <Save size={14} />
                    <span>Save Character</span>
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
