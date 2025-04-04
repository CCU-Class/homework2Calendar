chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "get_sesskey") {
    const input = document.querySelector('input[name="sesskey"]');
    const sesskey = input ? input.value : null;
    sendResponse({ sesskey });
  }
});

(async () => {
  const ua = navigator.userAgent;
  const isChrome = ua.includes("Chrome") && !ua.includes("Edg");
  if (!isChrome) return;

  const result = await chrome.storage.local.get("autoImportEnabled");
  if (result.autoImportEnabled === undefined) {
    await chrome.storage.local.set({ autoImportEnabled: true });
  }

  if (!result.autoImportEnabled) return;

  const input = document.querySelector('input[name="sesskey"]');
  const sesskey = input ? input.value : null;
  if (!sesskey) return;

  // Max per hour one insert

  const state = await chrome.storage.local.get("last_import_time");
  const last = state.last_import_time ?? 0;
  const now = new Date();
  console.log(now.getTime() - last);
  // console.log(now.getTime() - last < 60 * 60 * 1000);
  if (now.getTime() - last < 60 * 60 * 1000) {
    return;
  }

  chrome.storage.local.set({ last_import_time: now.getTime() });

  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  chrome.runtime.sendMessage({
    action: "import_events",
    sesskey,
    year: year,
    month: month,
    day: 1,
  });

  month++;
  if (month > 12) {
    month -= 12;
    year++;
  }

  chrome.runtime.sendMessage({
    action: "import_events",
    sesskey,
    year: year,
    month: month,
    day: 1,
  });
})();
