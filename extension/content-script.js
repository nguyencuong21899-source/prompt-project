chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'PROMPT_HUB_INSERT') return;
  try {
    sendResponse(globalThis.insertPromptIntoPage(message.content));
  } catch (error) {
    sendResponse({ ok: false, reason: 'Không chèn được prompt: ' + (error?.message || 'lỗi không xác định') });
  }
});
