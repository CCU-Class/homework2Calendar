chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "get_sesskey") {
    const input = document.querySelector('input[name="sesskey"]');
    const sesskey = input ? input.value : null;
    sendResponse({ sesskey });
  }
});