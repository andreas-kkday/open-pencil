import {
  weightToStyle,
  type DocumentFontStatus,
  type FontSubstitution
} from '@open-pencil/core/text'

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

export function parseFontSubstitutions(text: string): FontSubstitution[] {
  const substitutions: FontSubstitution[] = []
  let section: 'fonts' | 'weights' | null = null
  for (const rawLine of text.split(/\r?\n/)) {
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
        substitutions.push({ family, style, substituteFamily, substituteStyle })
      }
    } else {
      substitutions.push({ family: source, substituteFamily: target })
    }
  }
  return substitutions
}

export async function createTauriFontSubstitutionHint(
  path: string,
  status: DocumentFontStatus
): Promise<void> {
  if (status.issues.length === 0) return
  try {
    const { exists, writeTextFile } = await import('@tauri-apps/plugin-fs')
    const sidecar = `${path}.op_fonts`
    if (await exists(sidecar)) return
    const families = new Map<string, string[]>()
    for (const issue of status.issues) {
      const styles = families.get(issue.family) ?? []
      if (!styles.includes(issue.style)) styles.push(issue.style)
      families.set(issue.family, styles)
    }
    const lines = [
      '# OpenPencil font substitutions',
      '# Edit the mappings below and reopen the .fig file.',
      '',
      '[fonts]'
    ]
    for (const [family, styles] of families) {
      lines.push(`# Missing styles: ${styles.join(', ')}`)
      lines.push(`# "${family}" = "Inter"`)
    }
    lines.push('', '[weights]', '# Example: "SF Pro|SemiBold" = "Inter|600"', '')
    await writeTextFile(sidecar, `${lines.join('\\n')}\\n`)
  } catch (error) {
    console.warn('[Fonts] Failed to create font substitution hint:', error)
  }
}

export async function loadTauriFontSubstitutions(path: string): Promise<FontSubstitution[]> {
  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    return parseFontSubstitutions(await readTextFile(`${path}.op_fonts`))
  } catch {
    return []
  }
}
