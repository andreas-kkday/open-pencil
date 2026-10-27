import { existsSync, writeFileSync } from 'node:fs'

import { defineCommand } from 'citty'
import { compact } from 'es-toolkit/array'

import { fontManager, prepareGraphFonts, type DocumentFontStatus } from '@open-pencil/core/text'
import { styleToWeight } from '@open-pencil/scene-graph/font-style'

import { appTargetOptions } from '#cli/app/target'
import { bold, dim, entity, fmtList, kv, printError } from '#cli/format'
import { loadDocument } from '#cli/headless'
import { loadRPCData } from '#cli/rpc-data'

function statusLabel(status: DocumentFontStatus['faces'][number]['status']): string {
  return status
}

function createFontConfigHint(data: DocumentFontStatus, documentPath?: string): string | null {
  if (!documentPath) return null
  const path = `${documentPath}.op_fonts`
  const missingFaces = data.faces.filter((face) => face.status !== 'available')
  if (existsSync(path) || missingFaces.length === 0) return null

  const families = new Map<string, string[]>()
  for (const issue of missingFaces) {
    const styles = families.get(issue.family) ?? []
    if (!styles.includes(issue.style)) styles.push(issue.style)
    families.set(issue.family, styles)
  }
  const lines = [
    '# OpenPencil font substitutions',
    '# Edit the mappings below and run the command again.',
    '# This file is read from the current working directory.',
    '',
    '[fonts]'
  ]
  for (const [family, styles] of families) {
    lines.push(`# Missing styles: ${styles.join(', ')}`)
    lines.push(`# "${family}" = "Inter"`)
  }
  lines.push('', '[weights]')
  lines.push('# Example: "SF Pro|SemiBold" = "Inter|600"', '')
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8')
  return path
}

async function prepareFontStatus(
  graph: Awaited<ReturnType<typeof loadDocument>>,
  roots: string[],
  substituteFamily?: string | readonly string[]
): Promise<DocumentFontStatus> {
  const previousProviders = fontManager.enabledOnlineFontProviders()
  const previousSubstituteFamilies = [...fontManager.substituteFamilies()]
  fontManager.setOnlineFontProviders({})
  fontManager.setWebFontFetch(null)
  if (substituteFamily) {
    const families = compact(
      (typeof substituteFamily === 'string' ? [substituteFamily] : substituteFamily)
        .flatMap((value) => value.split(','))
        .map((family) => family.trim())
    )
    fontManager.setSubstituteFamilies(families)
    await Promise.all(families.map((family) => fontManager.loadFont(family, 'Regular')))
  }
  try {
    return await prepareGraphFonts(graph, roots)
  } finally {
    fontManager.setSubstituteFamilies(previousSubstituteFamilies)
    fontManager.setOnlineFontProviders(
      Object.fromEntries(previousProviders.map((provider) => [provider, true]))
    )
  }
}

export default defineCommand({
  meta: { description: 'Report fonts used by a document' },
  args: {
    file: {
      type: 'positional',
      description: 'Document file path (omit to connect to running app)',
      required: false
    },
    ...appTargetOptions,
    json: { type: 'boolean', description: 'Output as JSON' },
    substitute: {
      type: 'string',
      description:
        'Comma-separated font families to try in order when a document font cannot be loaded'
    }
  },
  async run({ args }) {
    let data: DocumentFontStatus
    try {
      if (!args.file) {
        data = await loadRPCData<DocumentFontStatus>(args.file, 'font-status', undefined, args)
      } else {
        const graph = await loadDocument(args.file)
        const pageIds = graph.getPages().map((page) => page.id)
        data = await prepareFontStatus(
          graph,
          pageIds.length > 0 ? pageIds : [graph.rootId],
          args.substitute
        )
      }
    } catch (error) {
      printError(error)
      process.exit(1)
    }

    const hintPath = createFontConfigHint(data, args.file)
    if (args.json) {
      console.log(JSON.stringify(data, null, 2))
      return
    }
    if (hintPath) {
      console.log(kv('Created', hintPath), dim('Edit it to configure font substitutions.'))
    }
    if (data.faces.length === 0) {
      console.log('No fonts found.')
      return
    }
    console.log('')
    console.log(bold(`  ${data.faces.length} font face${data.faces.length !== 1 ? 's' : ''}`))
    console.log('')
    const stylesByFamily = new Map<string, Set<string>>()
    for (const face of data.faces) {
      const styles = stylesByFamily.get(face.family) ?? new Set<string>()
      styles.add(face.style)
      stylesByFamily.set(face.family, styles)
    }

    console.log(
      fmtList(
        data.faces.map((face) => {
          const details: Record<string, string | number> = {
            status: statusLabel(face.status),
            style: [...(stylesByFamily.get(face.family) ?? [])]
              .sort((a, b) => styleToWeight(a) - styleToWeight(b) || a.localeCompare(b))
              .join(', ')
          }
          if (face.source) details.source = face.source
          if (face.substituteFamily) details.substitute = face.substituteFamily
          if (face.nodeIds.length > 0) details.nodes = face.nodeIds.length
          return {
            header: entity(face.family, face.style),
            details
          }
        }),
        { compact: true }
      )
    )
    console.log('')
    console.log(kv('Faithful', data.faithful ? 'yes' : 'no'))
    console.log('')
  }
})
