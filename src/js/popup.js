import { getCurrentYearMonth, downloadICS } from "./utils.js";

function initializeInputs() {
  const { year, month } = getCurrentYearMonth();
  document.getElementById("yearInput").value = year;
  document.getElementById("monthInput").value = month;
}

async function fetchCalendarData(sesskey) {
  const year = parseInt(document.getElementById("yearInput").value);
  const month = parseInt(document.getElementById("monthInput").value);
  // day is dont care
  const day = 1;

  const response = await fetch(
    `https://ecourse2.ccu.edu.tw/lib/ajax/service.php?sesskey=${sesskey}&info=core_calendar_get_calendar_monthly_view`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          index: 0,
          methodname: "core_calendar_get_calendar_monthly_view",
          args: { year, month, day },
        },
      ]),
      credentials: "include",
    }
  );

  const raw_data = await response.json();
  console.log(raw_data);
  return raw_data[0]["data"]["weeks"]
    .flatMap((week) => week.days)
    .flatMap((day) => day.events)
    .map((event) => ({
      description: event.course.fullname,
      title: event.activityname,
      startDate: new Date(event.timestart * 1000 - 3600 * 1000),
      endDate: new Date(event.timestart * 1000),
    }));
}

function setupEventListeners() {
  document.getElementById("exportBtn").addEventListener("click", async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "get_sesskey" }, async (res) => {
        const sesskey = res?.sesskey;
        if (!sesskey) {
          console.log("no touch sesskey");
          document.getElementById("result").textContent = "無法獲取 sesskey，請先登入 Moodle";
          return;
        }

        try {
          const events = await fetchCalendarData(sesskey);
          downloadICS(events);
          document.getElementById("result").textContent = `成功匯出 ${events.length} 個行事曆事件`;
        } catch (error) {
          console.error(error);
          document.getElementById("result").textContent = "發生錯誤，請稍後再試";
        }
      });
    });
  });
}

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeInputs();
  setupEventListeners();
});
