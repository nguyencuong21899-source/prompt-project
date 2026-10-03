import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('message bridge inserts into Gemini-style rich editor', async () => {
  const injection = await readFile(new URL('../extension/injection.js', import.meta.url), 'utf8');
  const bridge = await readFile(new URL('../extension/content-script.js', import.meta.url), 'utf8');
  let handler;
  let inserted = '';
  const editor = {
    tagName: 'DIV', isContentEditable: true, innerText: '',
    getBoundingClientRect: () => ({ width: 580, height: 24 }),
    closest: () => null, matches: () => false, getAttribute: () => 'Nhập câu lệnh cho Gemini',
    focus() {}
  };
  const selection = { removeAllRanges() {}, addRange() {} };
  const context = {
    chrome: { runtime: { onMessage: { addListener: listener => { handler = listener; } } } },
    document: {
      querySelectorAll: selector => selector === '.ql-editor[contenteditable="true"]' ? [editor] : [],
      createRange: () => ({ selectNodeContents() {}, collapse() {} }),
      execCommand: (_command, _showUI, text) => { inserted = text; editor.innerText += text; return true; }
    },
    window: { getSelection: () => selection },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' })
  };
  context.globalThis = context;
  runInNewContext(injection + '\n' + bridge, context);
  let response;
  handler({ type: 'PROMPT_HUB_INSERT', content: 'Prompt thử' }, {}, value => { response = value; });
  assert.equal(response.ok, true);
  assert.equal(inserted, 'Prompt thử');
});
