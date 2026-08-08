import React, { Fragment } from 'react'

const MENTION_REGEX = /@(\S+)/g

export function renderWithMentions(text: string) {
  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <span key={match.index} className="font-semibold text-primary">
        {match[0]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</> : text
}
