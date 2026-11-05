import { expect, test } from 'claude-code/testing'

const REPLY = `All sessions are waiting for the build.

### Done
- Fixed the menu bug.
- Added the test \`menu.test.ts\`.

**Not done:**
- The log file is not committed.

### Decision needed
1. Pick the default mouse speed.`

const message = (text: string) =>
  ({
    plugin: 'status-blocks',
    component: 'AssistantMessage',
    requestId: 'msg-1',
    props: { text, isFirstOfReply: true },
  }) as const

test('sections become labelled boxes, on every surface', async ($, on) => {
  // Nothing draws beneath the plugin in a test: this hook stands for the engine.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...message(REPLY), surface })

    // The label is a rounded SVG tab where the surface has Svg, else a Text.
    if (surface === 'terminal') {
      expect(await ui.find({ type: 'Text', text: /^Done$/ })).toBeTruthy()
      expect(await ui.find({ type: 'Text', text: /^Not done$/ })).toBeTruthy()
      expect(await ui.find({ type: 'Text', text: /^Decision needed$/ })).toBeTruthy()
    } else {
      const tab = await ui.find({ type: 'Svg' })
      expect(tab?.props.alt).toBe('Done')
      expect(String(tab?.props.source)).toContain('#53c556')
      expect(String(tab?.props.source)).toContain(' A7 7 0 0 1 ')
    }
    expect(await ui.find({ type: 'Markdown', text: /^All sessions/ })).toBeTruthy()
    expect((await ui.find({ type: 'Markdown', text: /log file/ }))?.text).toBe(
      '- The log file is not committed.',
    )
    expect(await ui.find({ type: 'Text', text: /engine/ })).toBeFalsy()
    await ui.unmount()
  }
})

test('a reply without sections is left to the engine', async ($, on) => {
  // Nothing draws beneath the plugin in a test: this hook stands for the engine.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({ ...message('Just an answer.\n\n## Summary\n- item'), surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})

test('text after a section stays outside the box', async ($, on) => {
  // Nothing draws beneath the plugin in a test: this hook stands for the engine.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({
    ...message('### Done\n- one\n\nThen ordinary text.'),
    surface: 'desktop',
  })
  expect((await ui.find({ type: 'Markdown', text: /one/ }))?.text).toBe('- one')
  expect((await ui.find({ type: 'Markdown', text: /Then/ }))?.text).toBe('Then ordinary text.')
  await ui.unmount()
})

test('headings in other languages are drawn with their own words', async ($, on) => {
  // Nothing draws beneath the plugin in a test: this hook stands for the engine.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  // Each heading below is one row of HEADINGS in register.tsx.
  const german = await $.ui.mount({
    ...message('Summary.\n\n### Nicht erledigt\n- tests\n\n**Entscheidung nötig:**\n1. pick one'),
    surface: 'terminal',
  })
  expect(await german.find({ type: 'Text', text: /^Nicht erledigt$/ })).toBeTruthy()
  expect(await german.find({ type: 'Text', text: /^Entscheidung nötig$/ })).toBeTruthy()
  await german.unmount()

  const japanese = await $.ui.mount({ ...message('### 完了\n- fix'), surface: 'desktop' })
  const tab = await japanese.find({ type: 'Svg' })
  expect(tab?.props.alt).toBe('完了')
  expect(String(tab?.props.source)).toContain('#53c556')
  await japanese.unmount()
})
