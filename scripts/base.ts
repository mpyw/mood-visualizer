/**
 * Vite base path with a trailing slash. Vite uses `base` as is for
 * `import.meta.env.BASE_URL`, and the app appends paths such as `data/...`
 * to it, so `/mood-visualizer` must become `/mood-visualizer/`.
 */
export function resolveBase(basePath: string | undefined): string {
  if (!basePath) return '/'
  return basePath.endsWith('/') ? basePath : `${basePath}/`
}
