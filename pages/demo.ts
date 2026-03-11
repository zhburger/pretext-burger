import gatsbyText from './gatsby.txt' with { type: 'text' }
import {
  layout,
  layoutWithLines,
  prepare,
  prepareWithSegments,
  type LayoutLine,
  type PreparedText,
  type PreparedTextWithSegments,
} from '../src/layout.ts'

const FONT = '20px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const LINE_HEIGHT = 32

const MIXED_COPY = [
  '“We can finally keep this in userland,” Nora wrote in the channel,',
  'pasting https://pretext.dev/notes?mode=reflow and a soft-hyphenated',
  'trans\u00ADatlantic note beside a Thai quote, ทูลว่า "พระองค์", plus',
  'an Arabic aside: فيقول:وعليك — just to make sure the line model holds.',
].join(' ')

const browserCopy = document.getElementById('browser-copy') as HTMLParagraphElement
const browserFrame = document.getElementById('browser-frame') as HTMLDivElement
const manualStage = document.getElementById('manual-stage') as HTMLDivElement
const widthInput = document.getElementById('width') as HTMLInputElement
const modeInput = document.getElementById('mode') as HTMLSelectElement
const copyInput = document.getElementById('copy') as HTMLSelectElement
const statWidth = document.getElementById('stat-width')!
const statHeight = document.getElementById('stat-height')!
const statDiff = document.getElementById('stat-diff')!
const statLines = document.getElementById('stat-lines')!
const lineMeta = document.getElementById('line-meta')!

type DemoMode = 'flat' | 'drift' | 'hinge'

type PreparedVariant = {
  opaque: PreparedText
  rich: PreparedTextWithSegments
}

const TEXTS: Record<string, string> = {
  gatsby: gatsbyText.split(/\n\s*\n/u).find(paragraph => paragraph.trim().length > 120)?.trim() ?? gatsbyText.slice(0, 1200),
  mixed: MIXED_COPY,
}

let preparedByKey: Partial<Record<keyof typeof TEXTS, PreparedVariant>> = {}
let activeLineElements: HTMLDivElement[] = []

function getPrepared(key: keyof typeof TEXTS): PreparedVariant {
  const cached = preparedByKey[key]
  if (cached !== undefined) return cached

  const text = TEXTS[key]!
  const prepared = {
    opaque: prepare(text, FONT),
    rich: prepareWithSegments(text, FONT),
  }
  preparedByKey[key] = prepared
  return prepared
}

function lineOffset(mode: DemoMode, lineIndex: number, lineCount: number): number {
  switch (mode) {
    case 'flat':
      return 0
    case 'drift':
      return Math.round(18 * Math.sin(lineIndex / 1.85))
    case 'hinge': {
      const center = (lineCount - 1) / 2
      return Math.round((lineIndex - center) * 2.25)
    }
  }
}

function setActiveLine(index: number, line: LayoutLine | null): void {
  for (let i = 0; i < activeLineElements.length; i++) {
    activeLineElements[i]!.classList.toggle('is-active', i === index)
  }

  if (line === null) {
    lineMeta.textContent = 'Click a line in the userland panel to inspect its boundary cursors.'
    return
  }

  lineMeta.textContent =
    `Line ${index + 1}: width ${line.width.toFixed(2)}px, ` +
    `start (${line.start.segmentIndex}, ${line.start.graphemeIndex}), ` +
    `end (${line.end.segmentIndex}, ${line.end.graphemeIndex}). ` +
    (line.trailingDiscretionaryHyphen ? 'Ends with an inserted discretionary hyphen. ' : '') +
    `Text: ${JSON.stringify(line.text)}`
}

function render(): void {
  const width = parseInt(widthInput.value, 10)
  const mode = modeInput.value as DemoMode
  const copyKey = copyInput.value as keyof typeof TEXTS
  const text = TEXTS[copyKey]!
  const prepared = getPrepared(copyKey)

  browserCopy.textContent = text
  browserCopy.style.width = `${width}px`
  browserFrame.style.setProperty('--copy-width', `${width}px`)
  manualStage.style.width = `${width}px`
  manualStage.style.setProperty('--copy-width', `${width}px`)

  const fast = layout(prepared.opaque, width, LINE_HEIGHT)
  const rich = layoutWithLines(prepared.rich, width, LINE_HEIGHT)

  manualStage.textContent = ''
  manualStage.style.height = `${rich.height}px`
  activeLineElements = []

  for (let i = 0; i < rich.lines.length; i++) {
    const line = rich.lines[i]!
    const el = document.createElement('div')
    el.className = 'manual-line'
    el.textContent = line.text
    el.style.top = `${i * LINE_HEIGHT}px`
    el.style.transform = `translateX(${lineOffset(mode, i, rich.lines.length)}px)`
    el.addEventListener('mouseenter', () => setActiveLine(i, line))
    el.addEventListener('click', () => setActiveLine(i, line))
    manualStage.appendChild(el)
    activeLineElements.push(el)
  }

  const actualHeight = Math.round(browserCopy.getBoundingClientRect().height)
  const diff = fast.height - actualHeight

  statWidth.textContent = `${width}px`
  statHeight.textContent = `${fast.height}px`
  statDiff.textContent = `${diff >= 0 ? '+' : ''}${diff}px`
  statLines.textContent = String(rich.lineCount)

  if (rich.lines.length > 0) {
    setActiveLine(0, rich.lines[0]!)
  } else {
    setActiveLine(-1, null)
  }
}

widthInput.addEventListener('input', render)
modeInput.addEventListener('change', render)
copyInput.addEventListener('change', render)

render()
