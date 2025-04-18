import { getCurrentYearMonth, downloadICS, fetchCalendarData } from "./utils.js";

function initializeInputs() {
  console.log("init");
  const { year, month } = getCurrentYearMonth();
  document.getElementById("yearInput").value = year;
  // set year max to year + 1
  document.getElementById("yearInput").max = year + 1;
  document.getElementById("monthInput").value = month;
  // add browser to session storage
  const ua = navigator.userAgent;
  const isChrome = ua.includes("Chrome") && !ua.includes("Edg");
  sessionStorage.setItem("isChrome", isChrome ? "true" : "false");
  if (isChrome) {
    // show checkbox if auto import is enabled
    const autoImportCheckbox = document.getElementById("autoImportContainer");
    autoImportCheckbox.classList.remove("invisible");
    const checkbox = autoImportCheckbox.querySelector("input");

    chrome.storage.local.get("autoImportEnabled", (result) => {
      checkbox.checked = result.autoImportEnabled ?? true;
    });

    checkbox.addEventListener("change", (e) => {
      chrome.storage.local.set({ autoImportEnabled: e.target.checked });
    });
  } else {
    // remove checkbox if not chrome
    document.getElementById("autoImportContainer").remove();
  }
}

function getDate() {
  const year = parseInt(document.getElementById("yearInput").value);
  const month = parseInt(document.getElementById("monthInput").value);
  if (month < 1 || month > 12) {
    console.error("Invalid month value:", month);
    return;
  }
  // day is dont care
  const day = 1;
  return { year, month, day };
}

function updateResult(status, message) {
  const el = document.getElementById("result");

  el.className =
    "text-sm whitespace-pre-wrap text-left w-full px-3 py-2 rounded-md border transition";

  if (status === "success") {
    el.classList.add("bg-green-50", "text-green-700", "border-green-300");
  } else if (status === "error") {
    el.classList.add("bg-red-50", "text-red-700", "border-red-300");
  } else if (status === "loading") {
    el.classList.add("bg-orange-50", "text-orange-700", "border-orange-300", "loading-dots");
  }

  el.textContent = message;
}

function setupEventListeners() {
  document.getElementById("exportBtn").addEventListener("click", async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "get_sesskey" }, async (res) => {
        const sesskey = res?.sesskey;
        if (!sesskey) {
          console.log("no touch sesskey");
          document.getElementById("result").textContent =
            "無法獲取 sesskey，請先登入 Moodle 或者重新整理頁面";
          return;
        }

        try {
          const { year, month, day } = getDate();
          const events = await fetchCalendarData(sesskey, year, month, day);
          if (events.length === 0) {
            document.getElementById("result").textContent = "沒有行事曆事件";
            return;
          }
          document.getElementById("result").textContent = "正在匯出 ECourse2 作業...";
          downloadICS(events);
          document.getElementById("result").textContent = `成功匯出 ${events.length} 個作業事件`;
        } catch (error) {
          console.error(error);
          document.getElementById("result").textContent = "發生錯誤，請稍後再試";
        }
      });
    });
  });

  document.getElementById("importBtn").addEventListener("click", async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "get_sesskey" }, async (res) => {
        const sesskey = res?.sesskey;
        const resultEl = document.getElementById("result");

        if (!sesskey) {
          console.log("no touch sesskey");
          updateResult("error", "無法獲取 sesskey，請先登入 Moodle 或重新整理頁面");
          return;
        }

        console.log("import");
        updateResult("loading", "匯入作業進入行事曆中");

        const { year, month, day } = getDate();

        chrome.runtime.sendMessage(
          { action: "import_events", sesskey, year, month, day },
          (res) => {
            resultEl.classList.remove("loading-dots");
            if (res?.ok) {
              updateResult("success", `成功匯入 ${res.count} 個作業事件`);
            } else {
              updateResult("error", res?.error || "發生錯誤，請稍後再試");
            }
          }
        );
      });
    });
  });
}

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeInputs();
  setupEventListeners();
});
