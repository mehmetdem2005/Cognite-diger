export async function extractTextFromPDF(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })

  const pdf = await loadingTask.promise
  const numPages = pdf.numPages
  const parts: string[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(pageText)
    onProgress?.(Math.round((i / numPages) * 100))
  }

  return parts.join('\n')
}
