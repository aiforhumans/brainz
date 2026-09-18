import React, { useState } from 'react'
import { X, Save, UserCheck } from 'lucide-react'

export function UserPersonaModal({
  isOpen,
  onClose,
  persona,
  onSavePersona,
}) {
  const [formData, setFormData] = useState({ ...persona })

  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...persona })
    }
  }, [isOpen, persona])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSavePersona(formData)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} style={{ color: 'var(--primary-hover)' }} />
            <h3>Your Roleplay Persona</h3>
          </div>
          <button className="btn-nav-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Your persona details are automatically injected into the roleplay prompt so characters recognize your identity, address you by name, and react to your appearance.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Persona Name</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Alex, Sam, Jordan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role / Context (Optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Friend, Creative Partner, Neighbor (or leave blank)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Avatar Image URL (Optional)</label>
              <input
                className="form-input"
                placeholder="https://... image link"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Personal Background & Vibe</span>
                <span className="form-sublabel">Demeanor, habits, personal context</span>
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="e.g. Thoughtful, observant, with a relaxed sense of humor. Appreciates honest, authentic 1-on-1 conversations and straightforward communication."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save size={14} />
              <span>Save Persona</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
