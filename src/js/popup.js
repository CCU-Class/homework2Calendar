import {
  getCurrentYearMonth,
  downloadICS,
  addOneEventToCalendar,
  addBatchEventsToCalendar,
} from "./utils.js";

function initializeInputs() {
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
    autoImportCheckbox.querySelector("input").checked = true; // default checked
  } else {
    // remove checkbox if not chrome
    document.getElementById("autoImportContainer").remove();
  }
}
async function fetchCalendarData(sesskey) {
  const year = parseInt(document.getElementById("yearInput").value);
  const month = parseInt(document.getElementById("monthInput").value);
  if (month < 1 || month > 12) {
    console.error("Invalid month value:", month);
    return;
  }
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
          if (events.length === 0) {
            document.getElementById("result").textContent = "沒有行事曆事件";
            return;
          }
          downloadICS(events);
          document.getElementById("result").textContent = `成功匯出 ${events.length} 個行事曆事件`;
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
        if (!sesskey) {
          console.log("no touch sesskey");
          document.getElementById("result").textContent = "無法獲取 sesskey，請先登入 Moodle";
          return;
        }

        try {
          const events = await fetchCalendarData(sesskey);
          insertEventsToGCal(events);
          document.getElementById("result").textContent = `成功匯入 ${events.length} 個行事曆事件`;
        } catch (error) {
          console.error(error);
          document.getElementById("result").textContent = "發生錯誤，請稍後再試";
        }
      });
    });
  });
}

async function insertEventsToGCal(events) {
  // Google OAuth token
  const token = await getGoogleAuthToken();
  const batchAddEvents = true;

  if (!batchAddEvents) {
    // add event Google Calendar
    for (const event of events) {
      try {
        await addOneEventToCalendar(token, event);
        console.log("add Event Success", event.title);
      } catch (err) {
        console.error("add Event error：", event.title, err);
      }
    }
  } else if (batchAddEvents) {
    // batch API，done after...
    try {
      const batchResponse = await addBatchEventsToCalendar(token, events);
      console.log("Batch request sent!");
      console.log(batchResponse);
    } catch (err) {
      console.error("Batch request failed:", err);
    }
  }
}

async function launchWebAuthFlowForGoogle() {
  return new Promise((resolve, reject) => {
    // Except Chrome Client ID
    const clientId = import.meta.env.VITE_NOT_CHROME_CLIENT_ID;
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar",
    ];

    const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;

    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      `?response_type=token` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes.join(" "))}` +
      `&prompt=consent`;

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          console.error("launchWebAuthFlow error:", chrome.runtime.lastError);
          return reject(chrome.runtime.lastError);
        }
        if (!responseUrl) {
          return reject("Unable to obtain authorization result");
        }

        const urlFragment = responseUrl.split("#")[1];
        if (!urlFragment) {
          return reject("Unable to retrieve token from callback URL");
        }
        const params = new URLSearchParams(urlFragment);
        const token = params.get("access_token");
        if (!token) {
          return reject("Postback URL has no access_token");
        }

        resolve(token);
      }
    );
  });
}

// get token
function getGoogleAuthToken() {
  return new Promise((resolve, reject) => {
    const ua = navigator.userAgent;
    const isChrome = ua.includes("Chrome") && !ua.includes("Edg");
    console.log("ischrome", isChrome);

    // 1. First check if getAuthToken is available (most common in Chrome)
    if (isChrome && chrome.identity && chrome.identity.getAuthToken) {
      console.log("Trying chrome.identity.getAuthToken...");
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          chrome.identity.getAuthToken({ interactive: true }, (token2) => {
            if (chrome.runtime.lastError || !token2) {
              console.error("lastError:", chrome.runtime.lastError);
              return reject("User denied authorization or an error occurred");
            }
            resolve(token2);
          });
        } else {
          resolve(token);
        }
      });

      // 2. Otherwise try launchWebAuthFlow (Edge may support it)
    } else if (chrome.identity && chrome.identity.launchWebAuthFlow) {
      console.log("Trying chrome.identity.launchWebAuthFlow...");
      launchWebAuthFlowForGoogle()
        .then((token) => resolve(token))
        .catch((err) => reject(err));
    } else {
      reject("This browser does not support the chrome.identity API");
    }
  });
}

// Initialize when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeInputs();
  setupEventListeners();
});
