import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { weightToStyle, type FontSubstitution } from '@open-pencil/core/text'

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseFile(path: string): FontSubstitution[] {
  if (!existsSync(path)) return []
  const substitutions: FontSubstitution[] = []
  let section: 'fonts' | 'weights' | null = null
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').trim()
    if (!line || line.startsWith('#')) continue
    const header = /^\[([^\]]+)\]$/.exec(line)
    if (header) {
      section = header[1] === 'fonts' || header[1] === 'weights' ? header[1] : null
      continue
    }
    const assignment = /^(.+?)\s*=\s*(.+)$/.exec(line)
    if (!assignment || !section) continue
    const source = unquote(assignment[1])
    const target = unquote(assignment[2])
    if (!source || !target) continue
    if (section === 'weights') {
      const [family, sourceStyle] = source.split('|', 2)
      const [substituteFamily, targetStyle] = target.split('|', 2)
      const style =
        sourceStyle && /^\d+$/.test(sourceStyle) ? weightToStyle(Number(sourceStyle)) : sourceStyle
      const substituteStyle =
        targetStyle && /^\d+$/.test(targetStyle) ? weightToStyle(Number(targetStyle)) : targetStyle
      if (family && style && substituteFamily) {
        substitutions.push({
          family,
          style,
          substituteFamily,
          substituteStyle
        })
      }
    } else {
      substitutions.push({ family: source, substituteFamily: target })
    }
  }
  return substitutions
}

/** Load user font substitutions; document-local settings override user settings. */
export function loadFontSubstitutions(
  cwd = process.cwd(),
  documentPath?: string
): FontSubstitution[] {
  const files = [
    join(homedir(), '.env.fonts'),
    join(cwd, 'env.fonts'),
    join(cwd, '.env.fonts'),
    ...(documentPath ? [`${documentPath}.op_fonts`] : [])
  ]
  const byKey = new Map<string, FontSubstitution>()
  for (const file of files) {
    for (const substitution of parseFile(file)) {
      byKey.set(`${substitution.family}|${substitution.style ?? '*'}`, substitution)
    }
  }
  return [...byKey.values()]
}
