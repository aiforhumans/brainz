import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Copy,
  Check,
  Edit3,
  RotateCw,
  Trash2,
  User,
  Brain,
  ChevronDown,
  ChevronUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Play,
  Compass,
  Sparkles,
  X,
} from 'lucide-react'
import { formatRoleplayContent } from '../utils/roleplayFormatter'
import { replaceMacros } from '../utils/macroUtils.js'
import { imageStorage } from '../services/imageStorage.js'
import { AvatarImage } from './AvatarImage'

const STEER_CHIPS = [
  'Describe surroundings & atmosphere',
  'More playful & teasing',
  'More assertive & direct',
  'Advance the action & plot',
  'Focus on internal emotion',
]

export function MessageItem({
  message,
  character,
  userPersona,
  isLastAssistant,
  isStreaming,
  onRegenerate,
  onContinue,
  onSelectSwipe,
  onDeleteSwipe,
  onEditMessage,
  onDeleteMessage,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [copied, setCopied] = useState(false)
  const [showSteerPopover, setShowSteerPopover] = useState(false)
  const [steerText, setSteerText] = useState('')
  const [resolvedImage, setResolvedImage] = useState(() => (
    message.image && !message.image.startsWith('idb:') ? message.image : null
  ))

  const swipes = useMemo(() => {
    if (Array.isArray(message.swipes) && message.swipes.length > 0) {
      return message.swipes
    }
    if (message.role === 'assistant') {
      return [{
        content: message.content || '',
        reasoningContent: message.reasoningContent || '',
        stats: message.stats || null,
        model: message.model || null,
        responseId: message.responseId || null,
        createdAt: message.createdAt || Date.now(),
      }]
    }
    return []
  }, [message.swipes, message.role, message.content, message.reasoningContent, message.stats, message.model, message.responseId, message.createdAt])

  const swipeIndex = Math.max(0, Math.min(Number(message.swipeIndex) || 0, Math.max(0, swipes.length - 1)))

  // Sync editContent when message.content changes (e.g. switching swipe or streaming)
  useEffect(() => {
    setEditContent(message.content || '')
  }, [message.content])

  const handlePrevSwipe = useCallback((e) => {
    e?.stopPropagation()
    if (swipeIndex > 0) {
      onSelectSwipe?.(message.id, swipeIndex - 1)
    }
  }, [swipeIndex, onSelectSwipe, message.id])

  const handleNextSwipe = useCallback((e) => {
    e?.stopPropagation()
    if (swipeIndex < swipes.length - 1) {
      onSelectSwipe?.(message.id, swipeIndex + 1)
    }
  }, [swipeIndex, swipes.length, onSelectSwipe, message.id])

  // Alt + Left / Alt + Right keyboard shortcut for cycling swipes
  useEffect(() => {
    if (!isLastAssistant || isEditing) return
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevSwipe()
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextSwipe()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLastAssistant, isEditing, handlePrevSwipe, handleNextSwipe])

  const handleApplySteer = (directiveToUse) => {
    const directive = directiveToUse || steerText
    if (!directive.trim()) return
    setShowSteerPopover(false)
    setSteerText('')
    onRegenerate?.({ steerDirective: directive.trim() })
  }

  useEffect(() => {
    if (!message.image) {
      setResolvedImage(null)
      return
    }
    if (!message.image.startsWith('idb:')) {
      setResolvedImage(message.image)
      return
    }
    let cancelled = false
    imageStorage.getImage(message.image).then((dataUrl) => {
      if (!cancelled && dataUrl) {
        setResolvedImage(dataUrl)
      }
    })
    return () => {
      cancelled = true
    }
  }, [message.image])

  const isUser = message.role === 'user'
  const senderName = isUser ? (userPersona?.name || 'You') : character.name

  // Auto-expand reasoning while actively thinking, auto-collapse once speech begins unless user toggled
  const isThinkingActive = Boolean(isStreaming && message.reasoningContent && !message.content)
  const [userToggledOpen, setUserToggledOpen] = useState(null)
  const reasoningOpen = userToggledOpen !== null ? userToggledOpen : isThinkingActive

  const formattedTime = useMemo(() => {
    const timestamp = message.createdAt || 0
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [message.createdAt])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEditMessage(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  return (
    <div className={`message-row ${message.role}`}>
      <div className="message-avatar-wrap">
        {isUser ? (
          <AvatarImage
            src={userPersona?.avatar}
            alt="You"
            isUser
            fallbackContent={<User size={20} />}
          />
        ) : (
          <AvatarImage
            src={character.avatar}
            alt={character.name}
            fallbackContent={character.name?.charAt(0)}
            fallbackStyle={{ background: character.avatarFallbackBg || undefined }}
            isNsfw={character.nsfw}
          />
        )}
      </div>

      <div className="message-content-col">
        <div className="message-header">
          <span className="message-sender">
            {senderName}
            {isUser && userPersona?.title && (
              <span className="persona-title-hint">
                • {userPersona.title}
              </span>
            )}
          </span>
          <div className="message-header-right">
            {/* Model Generation Stats Pill */}
            {message.stats && !isUser && (
              <div
                className="message-stats-pill"
                title={`Model: ${message.model || 'LM Studio'}\nTTFT: ${(message.stats.time_to_first_token_seconds || 0).toFixed(3)}s\nOutput: ${message.stats.total_output_tokens || 0} tokens`}
              >
                <Zap size={11} className="stats-icon" />
                <span>{(message.stats.tokens_per_second || 0).toFixed(1)} tok/s</span>
                {message.stats.time_to_first_token_seconds != null && (
                  <>
                    <span className="stats-dot">•</span>
                    <span>{(message.stats.time_to_first_token_seconds * 1000).toFixed(0)}ms</span>
                  </>
                )}
              </div>
            )}
            <span className="message-time">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Collapsible Reasoning / Inner Thoughts Accordion */}
        {message.reasoningContent && !isUser && (
          <div className={`reasoning-accordion ${isThinkingActive ? 'thinking-active' : ''}`}>
            <button
              type="button"
              className="reasoning-header"
              onClick={() => setUserToggledOpen(!reasoningOpen)}
              aria-expanded={reasoningOpen}
            >
              <div className="reasoning-title-group">
                <Brain size={14} className={isThinkingActive ? 'icon-pulse' : ''} />
                <span>
                  {isThinkingActive ? 'Thinking & Formulating Thoughts...' : 'Thought Process & Inner Monologue'}
                </span>
                {message.stats?.reasoning_output_tokens != null && (
                  <span className="reasoning-badge">{message.stats.reasoning_output_tokens} tok</span>
                )}
              </div>
              <div className="reasoning-toggle">
                {reasoningOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {reasoningOpen && (
              <div className="reasoning-body">
                <div className="reasoning-text">
                  {message.reasoningContent}
                  {isThinkingActive && <span className="streaming-cursor thinking" />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Multimodal Attached Image */}
        {resolvedImage && (
          <div className="message-image-container">
            <img
              src={resolvedImage}
              alt="Scene visual"
              className="message-attached-image"
              onClick={() => {
                const w = window.open('')
                if (w) {
                  w.document.title = 'LoreForge Image Preview'
                  w.document.body.style.margin = '0'
                  w.document.body.style.background = '#0b0f19'
                  w.document.body.style.display = 'flex'
                  w.document.body.style.alignItems = 'center'
                  w.document.body.style.justifyContent = 'center'
                  w.document.body.style.minHeight = '100vh'
                  const img = w.document.createElement('img')
                  img.src = resolvedImage
                  img.style.maxWidth = '100%'
                  img.style.maxHeight = '100vh'
                  img.style.objectFit = 'contain'
                  img.alt = 'Attached scene image preview'
                  w.document.body.appendChild(img)
                }
              }}
              title="Click to view full image"
            />
          </div>
        )}

        <div className="message-bubble">
          {isEditing ? (
            <div className="inline-edit-box">
              <textarea
                className="inline-edit-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
              />
              <div className="inline-edit-buttons">
                <button className="btn-secondary" onClick={handleCancelEdit} style={{ padding: '6px 12px' }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveEdit} style={{ padding: '6px 12px' }}>
                  Save Edit
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.content ? (
                formatRoleplayContent(replaceMacros(message.content, { userName: userPersona?.name, charName: character.name }))
              ) : isThinkingActive ? (
                <div className="thinking-placeholder">
                  <span className="thinking-pulse-dot" />
                  <em>Formulating inner thoughts...</em>
                </div>
              ) : isStreaming ? (
                <span className="streaming-cursor" />
              ) : null}
              {isStreaming && message.content && <span className="streaming-cursor" />}
            </>
          )}
        </div>

        {/* Action Toolbar / Swipe Pager Footer */}
        {!isEditing && !isStreaming && (
          isLastAssistant ? (
            <div className="message-swipe-footer-wrap">
              <div className="message-swipe-footer">
                {/* Swipe Pager */}
                <div className="swipe-pager">
                  <button
                    type="button"
                    className="btn-swipe-nav"
                    disabled={swipeIndex === 0}
                    onClick={handlePrevSwipe}
                    title="Previous response (Alt+Left)"
                    aria-label="Previous swipe"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="swipe-indicator" title="Current swipe">
                    {swipeIndex + 1} / {Math.max(1, swipes.length)}
                  </span>
                  <button
                    type="button"
                    className="btn-swipe-nav"
                    disabled={swipeIndex >= swipes.length - 1}
                    onClick={handleNextSwipe}
                    title="Next response (Alt+Right)"
                    aria-label="Next swipe"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="swipe-actions-divider" />

                {/* Continue Generation */}
                <button
                  type="button"
                  className="btn-msg-action"
                  onClick={onContinue}
                  title="Continue / Lengthen this response"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Continue</span>
                </button>

                {/* Steer Popover Toggle */}
                <button
                  type="button"
                  className={`btn-msg-action ${showSteerPopover ? 'active' : ''}`}
                  onClick={() => setShowSteerPopover((prev) => !prev)}
                  title="Guide the next alternative response"
                >
                  <Compass size={12} />
                  <span>Steer</span>
                </button>

                {/* Reroll Alternative */}
                <button
                  type="button"
                  className="btn-msg-action"
                  onClick={() => onRegenerate?.()}
                  title="Reroll another alternative response"
                >
                  <RotateCw size={12} />
                  <span>Reroll</span>
                </button>

                {/* Edit Message */}
                <button
                  type="button"
                  className="btn-msg-action"
                  onClick={() => setIsEditing(true)}
                  title="Edit message content"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>

                {/* Copy Text */}
                <button
                  type="button"
                  className="btn-msg-action"
                  onClick={handleCopy}
                  title="Copy response text"
                >
                  {copied ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {/* Delete Swipe / Message */}
                <button
                  type="button"
                  className="btn-msg-action delete"
                  onClick={() => {
                    if (swipes.length > 1) {
                      onDeleteSwipe?.(message.id, swipeIndex)
                    } else {
                      onDeleteMessage?.(message.id)
                    }
                  }}
                  title={swipes.length > 1 ? 'Delete this swipe' : 'Delete message'}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Steer Guided Reroll Popover */}
              {showSteerPopover && (
                <div className="steer-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="steer-popover-header">
                    <div className="steer-title">
                      <Compass size={14} />
                      <span>Steer Next Response</span>
                    </div>
                    <button
                      type="button"
                      className="btn-icon-close"
                      onClick={() => setShowSteerPopover(false)}
                      aria-label="Close steer popover"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <p className="steer-hint">Direct the next swipe without breaking character narrative:</p>
                  <div className="steer-chips">
                    {STEER_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="steer-chip"
                        onClick={() => handleApplySteer(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <div className="steer-input-row">
                    <input
                      type="text"
                      className="steer-input"
                      placeholder="e.g. Speak more softly, describe the room..."
                      value={steerText}
                      onChange={(e) => setSteerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && steerText.trim()) {
                          handleApplySteer()
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={!steerText.trim()}
                      onClick={() => handleApplySteer()}
                    >
                      <Sparkles size={12} />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="message-actions">
              <button className="btn-msg-action" onClick={handleCopy} title="Copy text">
                {copied ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button className="btn-msg-action" onClick={() => setIsEditing(true)} title="Edit message">
                <Edit3 size={12} />
                <span>Edit</span>
              </button>

              <button
                className="btn-msg-action delete"
                onClick={() => onDeleteMessage(message.id)}
                title="Delete message"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
