import * as v from 'valibot'

import { parseJSON } from '../json'

function isPackageRelativePath(path: string): boolean {
  return (
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.split('/').some((part) => part === '..' || part === '.')
  )
}

const packResultSchema = v.pipe(
  v.strictTuple([
    v.object({
      filename: v.pipe(v.string(), v.regex(/^[^/\\]+\.tgz$/)),
      files: v.array(
        v.object({
          path: v.pipe(v.string(), v.nonEmpty(), v.check(isPackageRelativePath))
        })
      )
    })
  ]),
  v.transform(([result]) => ({
    filename: result.filename,
    files: result.files.map(({ path }) => path)
  }))
)

export type NpmPackResult = v.InferOutput<typeof packResultSchema>

export function parseNpmPack(text: string): NpmPackResult {
  const value = parseJSON(text, 'npm pack')
  // npm 12 emits a package-name keyed object for a single package, while
  // older npm versions emit a one-element array.
  const normalizedValue =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Object.values(value)
      : value
  const parsed = v.safeParse(packResultSchema, normalizedValue)
  if (!parsed.success) {
    throw new Error(`npm pack: invalid response: ${v.summarize(parsed.issues)}`)
  }
  return parsed.output
}
