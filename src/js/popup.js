document.getElementById("fetchBtn").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "get_sesskey" }, async (res) => {
      const sesskey = res?.sesskey;
      if (!sesskey) return console.log("no touch sesskey");

      const response = await fetch(`https://ecourse2.ccu.edu.tw/lib/ajax/service.php?sesskey=${sesskey}&info=core_calendar_get_calendar_monthly_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          index: 0,
          methodname: "core_calendar_get_calendar_monthly_view",
          args: { year: 2025, month: 3, day: 31 }
        }]),
        credentials: "include"
      });

      const raw_data = await response.json();

      const data = raw_data[0]['data']['weeks']
        .flatMap(week => week.days)
        .flatMap(day => day.events)
        .map(event => ({
          coursename: event.course.fullname,
          activityname: event.activityname,
          enddate: new Date(event.timestart * 1000).toLocaleString("zh-TW", {
            timeZone: "Asia/Taipei",
            hour12: false,
          })
        }));

      console.log(data);
    });
  });
});
