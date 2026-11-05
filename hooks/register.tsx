import type { Register, ThemeKey } from 'claude-code'

// A reply section that opens with a heading (`### Done`, `### Erledigt`, ...) or
// a bold line (`**Done:**`) is drawn as a colored box with a label tab on top,
// the label being the heading as written. The stored message stays plain
// markdown.

type Kind = 'done' | 'notDone' | 'decision'

type Segment =
  | { type: 'text'; text: string }
  | { type: 'section'; kind: Kind; label: string; body: string }

/**
 * The three headings in each language, in the order done / not done /
 * decision needed. The first spelling per language is the one the CLAUDE.md
 * format rule lists; extra spellings after `|` are also recognized.
 */
const HEADINGS: { lang: string; done: string; notDone: string; decision: string }[] = [
  { lang: 'English', done: 'Done|Completed', notDone: 'Not done|Not completed', decision: 'Decision needed|Needs decision|Decision required' },
  { lang: 'Russian', done: 'Сделано', notDone: 'Не сделано', decision: 'Требуется решение|Нужно решение|Нужно решить' },
  { lang: 'Ukrainian', done: 'Зроблено', notDone: 'Не зроблено', decision: 'Потрібне рішення' },
  { lang: 'Polish', done: 'Zrobione', notDone: 'Niezrobione|Nie zrobione', decision: 'Wymagana decyzja|Potrzebna decyzja' },
  { lang: 'German', done: 'Erledigt', notDone: 'Nicht erledigt', decision: 'Entscheidung nötig|Entscheidung erforderlich' },
  { lang: 'French', done: 'Fait', notDone: 'Pas fait|Non fait', decision: 'Décision requise|Décision nécessaire' },
  { lang: 'Spanish', done: 'Hecho', notDone: 'No hecho|Pendiente', decision: 'Decisión necesaria|Se requiere decisión' },
  { lang: 'Portuguese', done: 'Feito', notDone: 'Não feito', decision: 'Decisão necessária' },
  { lang: 'Italian', done: 'Fatto', notDone: 'Non fatto', decision: 'Decisione necessaria' },
  { lang: 'Turkish', done: 'Yapıldı', notDone: 'Yapılmadı', decision: 'Karar gerekli' },
  { lang: 'Chinese', done: '已完成', notDone: '未完成', decision: '需要决定|需要決定' },
  { lang: 'Japanese', done: '完了', notDone: '未完了', decision: '要判断|判断が必要' },
  { lang: 'Korean', done: '완료', notDone: '미완료', decision: '결정 필요' },
]

/** Lowercased, colons and emphasis marks dropped, whitespace collapsed. */
const normalize = (s: string) =>
  s
    .replace(/[*_:：]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()

const KIND_OF = new Map<string, Kind>()
for (const h of HEADINGS) {
  for (const kind of ['done', 'notDone', 'decision'] as const) {
    for (const name of h[kind].split('|')) KIND_OF.set(normalize(name), kind)
  }
}

// `hex` is the theme color as the desktop's dark theme draws it, for the
// label tab, which is an SVG there (a Box has no corner radius of its own).
const STYLE: Record<Kind, { color: ThemeKey; hex: string }> = {
  done: { color: 'success', hex: '#53c556' },
  notDone: { color: 'error', hex: '#f27779' },
  decision: { color: 'warning', hex: '#e59c08' },
}

const TAB_TEXT = '#191919'
const TAB_HEIGHT = 24
const TAB_RADIUS = 7
const TAB_FONT = 13
const TAB_PAD = 14

/** CJK and Hangul glyphs are about a full em wide, the rest a bit over half. */
const textWidth = (label: string) =>
  Math.round(
    [...label].reduce(
      (w, ch) => w + (/[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/.test(ch) ? 1 : 0.56),
      0,
    ) * TAB_FONT,
  )

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A tab with rounded top corners holding the label, `width` CSS pixels wide. */
export function tabSvg(label: string, fill: string): { source: string; width: number } {
  const tw = textWidth(label)
  const w = tw + TAB_PAD * 2
  const h = TAB_HEIGHT
  const r = TAB_RADIUS
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<path d="M0 ${h} V${r} A${r} ${r} 0 0 1 ${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${h} Z" fill="${fill}"/>` +
    `<text x="${w / 2}" y="${h / 2 + 1}" text-anchor="middle" dominant-baseline="central" ` +
    `textLength="${tw}" lengthAdjust="spacingAndGlyphs" fill="${TAB_TEXT}" ` +
    `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" ` +
    `font-size="${TAB_FONT}" font-weight="500">${escapeXml(label)}</text></svg>`
  return { source, width: w }
}

/** The section a line opens, if it is a heading or bold line naming one. */
function heading(line: string): { kind: Kind; label: string } | undefined {
  const m =
    /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line) ??
    /^\s{0,3}\*\*(.+?)\*\*\s*[:：]?\s*$/.exec(line) ??
    /^\s{0,3}__(.+?)__\s*[:：]?\s*$/.exec(line)
  if (!m) return undefined
  const label = (m[1] ?? '').replace(/[*_]/g, '').replace(/[:：]\s*$/, '').trim()
  const kind = KIND_OF.get(normalize(label))
  return kind && { kind, label }
}

const isHeading = (line: string) => /^\s{0,3}#{1,6}\s/.test(line)
const isRule = (line: string) => /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)
const isListOrIndented = (line: string) =>
  /^\s*([-*+]|\d+[.)])\s/.test(line) || /^\s{2,}\S/.test(line)
const isFence = (line: string) => /^\s{0,3}(```|~~~)/.test(line)

export function parse(text: string): Segment[] {
  const lines = text.split('\n')
  const out: Segment[] = []
  let plain: string[] = []
  let section: { kind: Kind; label: string; body: string[] } | null = null
  let inFence = false

  const flushPlain = () => {
    const t = plain.join('\n').trim()
    if (t) out.push({ type: 'text', text: t })
    plain = []
  }
  const flushSection = () => {
    if (!section) return
    const body = section.body.join('\n').trim()
    if (body) out.push({ type: 'section', kind: section.kind, label: section.label, body })
    section = null
  }

  for (const [i, line] of lines.entries()) {
    if (isFence(line)) inFence = !inFence
    const opened = inFence ? undefined : heading(line)

    if (opened) {
      flushSection()
      flushPlain()
      section = { ...opened, body: [] }
      continue
    }

    if (section && !inFence) {
      // A section ends at another heading, a rule, or a plain paragraph that
      // follows a blank line (the reply went on with ordinary text).
      const prevBlank = i > 0 && lines[i - 1]?.trim() === ''
      const endsHere =
        isHeading(line) ||
        isRule(line) ||
        (prevBlank && line.trim() !== '' && !isListOrIndented(line) && section.body.some(l => l.trim()))
      if (endsHere) {
        flushSection()
        if (isRule(line)) continue
      }
    }

    if (section) section.body.push(line)
    else plain.push(line)
  }

  flushSection()
  flushPlain()
  return out
}

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const segments = parse(e.props.text)
    if (!segments.some(s => s.type === 'section')) return next(e)

    const t = $.ui.resolve(e)
    const { Box, Text, Markdown } = t
    // The terminal has no Svg: there the label stays a colored cell block.
    const Svg = e.surface !== 'terminal' && 'Svg' in t ? t.Svg : undefined

    return (
      <Box flexDirection="column" gap="sm">
        {segments.map(s => {
          if (s.type === 'text') return <Markdown text={s.text} />
          const style = STYLE[s.kind]
          const tab = tabSvg(s.label, style.hex)
          return (
            <Box flexDirection="column">
              <Box flexDirection="row" marginLeft={2}>
                {Svg ? (
                  <Svg source={tab.source} alt={s.label} width={tab.width} height={TAB_HEIGHT} />
                ) : (
                  <Box backgroundColor={style.color} paddingX={1}>
                    <Text color="inverseText" weight="semibold">
                      {s.label}
                    </Text>
                  </Box>
                )}
              </Box>
              <Box borderStyle="round" borderColor={style.color} paddingX={1}>
                <Markdown text={s.body} />
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  })
}
