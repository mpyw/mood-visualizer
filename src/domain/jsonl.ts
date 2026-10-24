/**
 * Parses JSON Lines. Blank lines, broken JSON and values rejected by `guard`
 * are skipped so that one bad line does not hide the rest of the history.
 */
export function parseJsonl<T>(
  text: string,
  guard: (value: unknown) => value is T
): T[] {
  const result: T[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let value: unknown
    try {
      value = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (guard(value)) result.push(value)
  }
  return result
}
