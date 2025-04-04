import { fetchCalendarData } from "./utils.js";
import { insertEventsToGCal } from "./calendar.js";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "import_events") {
    const { sesskey } = msg;
    console.log("ttt");
    console.log(msg.year, msg.month, msg.day);
    (async () => {
      try {
        const events = await fetchCalendarData(sesskey, msg.year, msg.month, msg.day);
        await insertEventsToGCal(events, msg.year, msg.month);
        sendResponse({ ok: true, count: events.length });
      } catch (err) {
        console.error("[Background] 匯入失敗：", err);
        sendResponse({ ok: false, error: err.message });
      }
    })();

    return true;
  }
});
