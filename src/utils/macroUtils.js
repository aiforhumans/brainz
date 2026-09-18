// Pure utility functions for modular roleplay macro replacement

/**
 * Replace {{user}} and {{char}} macros (case-insensitive, optional whitespace)
 * with the supplied participant names.
 *
 * @param {string} text - The input text containing macros
 * @param {Object} options - Names to substitute
 * @param {string} [options.userName] - Name of the user persona
 * @param {string} [options.charName] - Name of the character
 * @returns {string} Text with macros substituted
 */
export function replaceMacros(text, { userName = 'User', charName = 'Character' } = {}) {
  if (typeof text !== 'string' || !text) return text || ''
  const u = (userName || 'User').trim() || 'User'
  const c = (charName || 'Character').trim() || 'Character'

  return text
    .replace(/\{\{\s*user\s*\}\}/gi, u)
    .replace(/\{\{\s*char\s*\}\}/gi, c)
}

/**
 * Resolve {{user}} and {{char}} macros across all narrative text fields of a character card.
 * Returns a new character object without mutating the original.
 *
 * @param {Object} character - The character card object
 * @param {Object} [userPersona] - The active user persona
 * @returns {Object} A shallow copy with text fields macro-resolved
 */
export function resolveCharacterMacros(character = {}, userPersona = {}) {
  if (!character || typeof character !== 'object') return character

  const userName = userPersona?.name?.trim() || 'User'
  const charName = character?.name?.trim() || 'Character'

  const fieldsToResolve = ['tagline', 'personality', 'scenario', 'systemPrompt', 'greeting']
  const resolved = { ...character }

  for (const field of fieldsToResolve) {
    if (typeof character[field] === 'string') {
      resolved[field] = replaceMacros(character[field], { userName, charName })
    }
  }

  return resolved
}
