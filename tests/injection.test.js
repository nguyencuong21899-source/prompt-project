import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/injection.js';
const insertPromptIntoPage = globalThis.insertPromptIntoPage;

test('inserts prompt into a textarea and keeps the existing draft', () => {
  const previous = { document: globalThis.document, getComputedStyle: globalThis.getComputedStyle, HTMLTextAreaElement: globalThis.HTMLTextAreaElement };
  class FakeTextarea {
    tagName = 'TEXTAREA';
    isContentEditable = false;
    #value = 'Bản nháp';
    get value() { return this.#value; }
    set value(value) { this.#value = value; }
    getBoundingClientRect() { return { width: 400, height: 80 }; }
    closest() { return null; }
    matches() { return false; }
    getAttribute() { return ''; }
    focus() { this.focused = true; }
    dispatchEvent(event) { this.event = event; }
    setSelectionRange(start, end) { this.selection = [start, end]; }
  }
  const editor = new FakeTextarea();
  globalThis.HTMLTextAreaElement = FakeTextarea;
  globalThis.getComputedStyle = () => ({ display: 'block', visibility: 'visible' });
  globalThis.document = { querySelectorAll: selector => selector === '#prompt-textarea' ? [editor] : [] };
  try {
    assert.deepEqual(insertPromptIntoPage('Prompt mới'), { ok: true });
    assert.equal(editor.value, 'Bản nháp\n\nPrompt mới');
    assert.equal(editor.event.type, 'input');
    assert.deepEqual(editor.selection, [editor.value.length, editor.value.length]);
    assert.equal(editor.focused, true);
  } finally {
    Object.assign(globalThis, previous);
  }
});

test('reports when no chat input is present', () => {
  const previous = globalThis.document;
  globalThis.document = { querySelectorAll: () => [] };
  try { assert.deepEqual(insertPromptIntoPage('Prompt'), { ok: false, reason: 'Không tìm thấy ô nhập chat trên trang này.' }); }
  finally { globalThis.document = previous; }
});

test('uses the page editor for rich text chat inputs', () => {
  const previous = { document: globalThis.document, window: globalThis.window, getComputedStyle: globalThis.getComputedStyle };
  let inserted = '';
  const editor = {
    tagName: 'DIV', isContentEditable: true, innerText: 'Bản nháp',
    getBoundingClientRect: () => ({ width: 400, height: 80 }),
    closest: () => null, matches: () => false, getAttribute: () => '',
    focus() { this.focused = true; }
  };
  const range = { selectNodeContents() {}, collapse() {} };
  const selection = { removeAllRanges() {}, addRange() {} };
  globalThis.getComputedStyle = () => ({ display: 'block', visibility: 'visible' });
  globalThis.window = { getSelection: () => selection };
  globalThis.document = {
    querySelectorAll: selector => selector === '.ProseMirror[contenteditable="true"]' ? [editor] : [],
    createRange: () => range,
    execCommand: (_command, _showUI, text) => { inserted = text; editor.innerText += text; return true; }
  };
  try {
    assert.deepEqual(insertPromptIntoPage('Prompt mới'), { ok: true });
    assert.equal(inserted, '\n\nPrompt mới');
    assert.equal(editor.focused, true);
  } finally {
    Object.assign(globalThis, previous);
  }
});
