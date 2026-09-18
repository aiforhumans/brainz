import React, { useRef, useEffect, useState } from 'react'
import {
  Send,
  Square,
  Play,
  Sparkles,
  Brain,
  Cpu,
  Zap,
  Loader2,
  Image as ImageIcon,
  X,
  Eye,
} from 'lucide-react'

export function ChatInput({
  input,
  setInput,
  attachedImage,
  setAttachedImage,
  hasVisionSupport,
  onSend,
  onStop,
  onContinue,
  isStreaming,
  streamingStatus,
  hasMessages,
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [input])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming && (input.trim() || attachedImage)) {
        onSend()
      }
    }
  }

  // Handle image file processing with lightweight downscaling
  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Limit max dimensions to 1280px for fast inference and lightweight storage
        const maxDim = 1280
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setAttachedImage(compressedDataUrl)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
    // reset input so the same file can be selected again
    e.target.value = ''
  }

  // Support clipboard image pasting (Ctrl + V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          processImageFile(file)
          break
        }
      }
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImageFile(file)
    }
  }

  // Get status icon
  const getStatusIcon = (stage) => {
    switch (stage) {
      case 'model_load':
        return <Cpu size={13} className="spin-slow text-amber-400" />
      case 'prompt_processing':
        return <Sparkles size={13} className="text-cyan-400" />
      case 'reasoning':
        return <Brain size={13} className="icon-pulse text-purple-400" />
      case 'message':
        return <Zap size={13} className="text-emerald-400" />
      default:
        return <Loader2 size={13} className="spin-fast" />
    }
  }

  return (
    <div className="chat-input-area">
      {/* Streaming Status HUD Bar */}
      {isStreaming && (
        <div className="streaming-status-bar">
          <div className="streaming-status-info">
            <div className="status-stage-badge">
              {getStatusIcon(streamingStatus?.stage)}
              <span className="status-stage-label">
                {streamingStatus?.label || 'Generating response...'}
              </span>
            </div>

            {typeof streamingStatus?.progress === 'number' && (
              <div className="streaming-progress-wrap">
                <div className="streaming-progress-track">
                  <div
                    className="streaming-progress-fill"
                    style={{ width: `${Math.min(Math.max(streamingStatus.progress * 100, 4), 100)}%` }}
                  />
                </div>
                <span className="streaming-progress-text">
                  {Math.round(streamingStatus.progress * 100)}%
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-stop-streaming"
            onClick={onStop}
            title="Stop generation immediately"
          >
            <Square size={11} fill="currentColor" />
            <span>Stop</span>
          </button>
        </div>
      )}

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp, image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        className={`input-container ${isDraggingOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Staged Image Attachment Thumbnail Chip */}
        {attachedImage && (
          <div className="staged-image-chip">
            <img src={attachedImage} alt="Staged roleplay image" className="staged-image-thumb" />
            <div className="staged-image-info">
              <span className="staged-image-title">Visual Context Attached</span>
              <span className="staged-image-subtitle">
                {hasVisionSupport ? 'Vision model ready to inspect' : 'Image attached for scene'}
              </span>
            </div>
            <button
              type="button"
              className="btn-remove-staged-image"
              onClick={() => setAttachedImage(null)}
              title="Remove image attachment"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="chat-textarea"
          rows={1}
          placeholder={
            attachedImage
              ? 'Describe what you are showing or ask character to react... (Enter to send)'
              : 'Describe your actions with *asterisks* and speak with "quotes"... (Enter to send, Shift+Enter for newline)'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isStreaming}
        />

        <div className="input-buttons">
          {/* Image Attachment Button */}
          <button
            type="button"
            className={`btn-icon-attach ${attachedImage ? 'has-image' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            title={
              hasVisionSupport
                ? 'Attach an image / scene art (Vision model active)'
                : 'Attach an image / scene art (Supports paste Ctrl+V & drag-and-drop)'
            }
          >
            <ImageIcon size={16} />
          </button>

          {hasMessages && !isStreaming && (
            <button
              className="btn-secondary"
              onClick={onContinue}
              title="Prompt character to continue their narrative"
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            >
              <Play size={13} fill="currentColor" />
              <span>Continue</span>
            </button>
          )}

          {isStreaming ? (
            <button className="btn-stop" onClick={onStop} title="Stop generation">
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              className="btn-send"
              onClick={() => onSend()}
              disabled={!input.trim() && !attachedImage}
              title="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="input-hints-row">
        <div className="hint-tags">
          <span>*actions & expressions*</span>
          <span>&quot;spoken words&quot;</span>
          <span>(inner thoughts)</span>
          {hasVisionSupport && (
            <span className="hint-tag-vision" title="This model comprehends image uploads">
              <Eye size={11} /> Vision Model
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={11} style={{ color: 'var(--primary-hover)' }} />
          <span>LM Studio Streaming Active</span>
        </div>
      </div>
    </div>
  )
}

