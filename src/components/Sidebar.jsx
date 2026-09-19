import React, { useState } from 'react'
import {
  Plus,
  Search,
  Upload,
  RotateCcw,
  Flame,
} from 'lucide-react'
import { AvatarImage } from './AvatarImage'

export function Sidebar({
  characters,
  activeCharacterId,
  onSelectCharacter,
  onCreateCharacter,
  onImportCharacter,
  onResetDefaults,
  collapsed,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Base categories plus NSFW filter
  const baseCategories = ['All', '🔞 NSFW', ...new Set(characters.map((c) => c.category || 'General'))]

  const filteredCharacters = characters.filter((char) => {
    const matchesSearch =
      char.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (char.tagline && char.tagline.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (char.tags && char.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())))

    let matchesCategory = true
    if (selectedCategory === '🔞 NSFW') {
      matchesCategory = Boolean(char.nsfw)
    } else if (selectedCategory !== 'All') {
      matchesCategory = char.category === selectedCategory
    }

    return matchesSearch && matchesCategory
  })

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result)
        onImportCharacter(json)
      } catch (err) {
        alert('Invalid character JSON file: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <span className="sidebar-title">Characters</span>
          <div className="sidebar-title-actions">
            <button
              className="btn-nav-icon btn-nav-icon--sm"
              onClick={onResetDefaults}
              title="Reset characters to original defaults"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="sidebar-search-box">
          <Search size={14} className="sidebar-search-icon" />
          <input
            type="text"
            placeholder="Search characters or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="category-pills-row">
          {baseCategories.map((cat) => {
            const isNsfwPill = cat === '🔞 NSFW'
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-pill ${isSelected ? 'selected' : ''} ${isNsfwPill ? 'nsfw' : ''}`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Character Cards List */}
      <div className="character-list">
        {filteredCharacters.length > 0 ? (
          filteredCharacters.map((char) => {
            const isActive = char.id === activeCharacterId
            return (
              <div
                key={char.id}
                className={`character-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectCharacter(char.id)}
              >
                <div className="character-avatar-wrap">
                  <AvatarImage
                    src={char.avatar}
                    alt={char.name}
                    className="character-avatar-img"
                    fallbackClassName={`character-avatar-fallback ${char.nsfw ? 'nsfw' : ''}`}
                    fallbackContent={char.name?.charAt(0).toUpperCase()}
                    fallbackStyle={{ background: char.avatarFallbackBg || undefined }}
                    isNsfw={char.nsfw}
                  />
                </div>

                {/* Collapsed mini-dock hover tooltip */}
                <div className="sidebar-avatar-tooltip">
                  {char.name} {char.category ? `• ${char.category}` : ''}
                </div>

                <div className="character-meta">
                  <div className="character-name-row">
                    <div className="character-name">{char.name}</div>
                    {char.nsfw && (
                      <span className="nsfw-badge-sm">
                        <Flame size={9} fill="currentColor" /> 18+
                      </span>
                    )}
                  </div>
                  <div className="character-tagline">{char.tagline || 'Roleplay companion'}</div>
                  {char.category && (
                    <div className="character-card-footer">
                      <span className="character-category-tag">{char.category}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="character-list-empty">
            No characters found in this filter
          </div>
        )}
      </div>

      {/* Sidebar Footer with Dual Actions */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-actions">
          <button className="btn-primary sidebar-create-btn" onClick={onCreateCharacter}>
            <Plus size={15} />
            <span>New Character</span>
          </button>
          <label
            className="btn-secondary sidebar-import-btn"
            title="Import Character JSON card"
          >
            <Upload size={14} />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              className="visually-hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    </aside>
  )
}
