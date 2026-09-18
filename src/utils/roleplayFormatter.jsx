import React from 'react'

/**
 * Parses and formats roleplay text containing:
 * - *Actions & expressions*
 * - "Spoken dialogue"
 * - (Internal thoughts)
 * - Standard markdown like **bold**, *italic*, `code`, linebreaks
 */
export function formatRoleplayContent(text) {
  if (!text) return null

  let str = ''
  if (typeof text === 'string') {
    str = text
  } else if (Array.isArray(text)) {
    str = text.map((t) => (typeof t === 'string' ? t : (t?.text || ''))).join('')
  } else if (typeof text === 'object') {
    str = typeof text.content === 'string' ? text.content : (typeof text.text === 'string' ? text.text : '')
  } else {
    str = String(text)
  }

  if (!str.trim()) return null

  // Split by double newlines into paragraphs
  const paragraphs = str.split(/\n\n+/)

  return paragraphs.map((paragraph, pIdx) => {
    // Within each paragraph, handle single line breaks
    const lines = paragraph.split('\n')

    return (
      <p key={pIdx} className="rp-paragraph">
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {parseLineTokens(line)}
          </React.Fragment>
        ))}
      </p>
    )
  })
}

function parseLineTokens(line) {
  // Regex to match:
  // 1. Bold: \*\*[^*]+\*\*
  // 2. Actions: \*([^*]+)\*
  // 3. Spoken quotes: "([^"]+)" or “([^”]+)”
  // 4. Thoughts: \(([^)]+)\)
  // 5. Code: `([^`]+)`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|"[^"]+"|“[^”]+”|\([^)]+\)|`[^`]+`)/g

  const parts = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(line)) !== null) {
    // Preceding text
    if (match.index > lastIndex) {
      parts.push({
        type: 'plain',
        content: line.substring(lastIndex, match.index),
      })
    }

    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push({ type: 'bold', content: token.slice(2, -2) })
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push({ type: 'action', content: token.slice(1, -1) })
    } else if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith('“') && token.endsWith('”'))) {
      parts.push({ type: 'speech', content: token })
    } else if (token.startsWith('(') && token.endsWith(')')) {
      parts.push({ type: 'thought', content: token })
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push({ type: 'code', content: token.slice(1, -1) })
    } else {
      parts.push({ type: 'plain', content: token })
    }

    lastIndex = regex.lastIndex
  }

  // Trailing text
  if (lastIndex < line.length) {
    parts.push({
      type: 'plain',
      content: line.substring(lastIndex),
    })
  }

  return parts.map((part, index) => {
    switch (part.type) {
      case 'action':
        return (
          <span key={index} className="rp-action">
            *{part.content}*
          </span>
        )
      case 'speech':
        return (
          <span key={index} className="rp-speech">
            {part.content}
          </span>
        )
      case 'thought':
        return (
          <span key={index} className="rp-thought">
            {part.content}
          </span>
        )
      case 'bold':
        return (
          <strong key={index} className="rp-bold">
            {part.content}
          </strong>
        )
      case 'code':
        return (
          <code key={index} className="rp-code">
            {part.content}
          </code>
        )
      default:
        return <span key={index}>{part.content}</span>
    }
  })
}
