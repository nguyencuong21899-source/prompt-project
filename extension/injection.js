// Runs in the active page's MAIN world. Keep this function self-contained:
// chrome.scripting serializes it and does not carry module imports or closures.
function insertPromptIntoPage(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) return { ok: false, reason: 'Prompt không có nội dung để chèn.' };
  const selectors = [
    '#prompt-textarea',
    '[data-testid="chat-input"]',
    '[data-testid="composer-input"]',
    '[aria-label="Message"]',
    '[aria-label="Ask anything"]',
    '.ProseMirror[contenteditable="true"]',
    '.ql-editor[contenteditable="true"]',
    '[contenteditable="true"][role="textbox"]',
    'textarea:not([disabled]):not([readonly])',
    '[contenteditable="true"]'
  ];
  const isVisible = node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const usable = node => {
    if (!isVisible(node) || node.closest('[role="search"], form[role="search"]')) return false;
    if (node.matches('[disabled], [readonly], [aria-disabled="true"]')) return false;
    const label = (node.getAttribute('placeholder') || node.getAttribute('aria-label') || '').toLowerCase();
    if (/search|tìm kiếm|tim kiem/.test(label)) return false;
    return node.tagName === 'TEXTAREA' || node.isContentEditable;
  };
  let editor;
  for (const selector of selectors) {
    editor = [...document.querySelectorAll(selector)].find(usable);
    if (editor) break;
  }
  if (!editor) return { ok: false, reason: 'Không tìm thấy ô nhập chat trên trang này.' };

  const read = () => editor.tagName === 'TEXTAREA' ? editor.value : editor.innerText;
  const existing = read();
  const addition = (existing?.trim() ? '\n\n' : '') + prompt;
  editor.focus();
  if (editor.tagName === 'TEXTAREA') {
    const next = (existing || '') + addition;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(editor, next);
    else editor.value = next;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.setSelectionRange(next.length, next.length);
  } else {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    // Some editors return true from execCommand without changing their document.
    // Conversely, a false return can still accompany an insertion: don't duplicate it.
    document.execCommand('insertText', false, addition);
    if (read() === existing) {
      const fragment = document.createDocumentFragment();
      addition.replace(/\r\n?/g, '\n').split('\n').forEach((line, index) => {
        if (index) fragment.append(document.createElement('br'));
        fragment.append(document.createTextNode(line));
      });
      const last = fragment.lastChild;
      range.insertNode(fragment);
      range.setStartAfter(last);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: addition }));
    }
  }
  editor.focus();
  const normalize = text => String(text || '').replace(/\s+/g, ' ').trim();
  if (read() === existing || !normalize(read()).includes(normalize(prompt))) {
    return { ok: false, reason: 'Trang AI chưa nhận nội dung. Hãy bấm vào ô chat rồi thử lại.' };
  }
  return { ok: true };
}

globalThis.insertPromptIntoPage = insertPromptIntoPage;
