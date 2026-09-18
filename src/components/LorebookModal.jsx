import React, { useState } from 'react'
import { X, Plus, Trash2, BookOpen, Key } from 'lucide-react'

export function LorebookModal({
  isOpen,
  onClose,
  lorebook,
  onSaveLorebook,
}) {
  const [items, setItems] = useState([...lorebook])
  const [newTitle, setNewTitle] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newContent, setNewContent] = useState('')

  React.useEffect(() => {
    if (isOpen) {
      setItems([...lorebook])
    }
  }, [isOpen, lorebook])

  if (!isOpen) return null

  const handleAddItem = (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !newKey.trim() || !newContent.trim()) return

    const newItem = {
      id: `lore-${Date.now()}`,
      title: newTitle.trim(),
      key: newKey.trim().toLowerCase(),
      content: newContent.trim(),
      enabled: true,
    }

    const updated = [...items, newItem]
    setItems(updated)
    onSaveLorebook(updated)

    setNewTitle('')
    setNewKey('')
    setNewContent('')
  }

  const handleDeleteItem = (id) => {
    const updated = items.filter((item) => item.id !== id)
    setItems(updated)
    onSaveLorebook(updated)
  }

  const handleToggleItem = (id) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    )
    setItems(updated)
    onSaveLorebook(updated)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: 'var(--primary-hover)' }} />
            <h3>World Lorebook (Dynamic Context Injection)</h3>
          </div>
          <button className="btn-nav-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            When trigger keywords are mentioned in your conversation, the corresponding lore entry is automatically injected into the AI's active memory prompt to keep the world consistent.
          </p>

          {/* New Entry Form */}
          <form
            onSubmit={handleAddItem}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-hover)' }}>
              Add New Lore Entry
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Entry Title</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. The Silver Citadel"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trigger Keywords (comma-separated)</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. citadel, high council, spire"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lore Content</label>
              <textarea
                className="form-textarea"
                rows={2}
                required
                placeholder="Background details, historical events, faction rules, or character secrets..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <Plus size={14} />
                <span>Add Entry</span>
              </button>
            </div>
          </form>

          {/* Lore items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Lore Entries ({items.length})
            </div>

            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="lore-item-card">
                  <div className="lore-item-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggleItem(item.id)}
                        style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.92rem', color: item.enabled ? 'var(--text-main)' : 'var(--text-dim)' }}>
                        {item.title}
                      </span>
                    </div>

                    <button
                      className="btn-nav-icon"
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete lore entry"
                    >
                      <Trash2 size={13} style={{ color: '#f87171' }} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Key size={12} style={{ color: 'var(--text-dim)' }} />
                    {item.key.split(',').map((k, i) => (
                      <span key={i} className="lore-key-badge">
                        {k.trim()}
                      </span>
                    ))}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', lineHeight: '1.4' }}>
                    {item.content}
                  </p>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No lorebook entries yet. Add your first entry above!
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
