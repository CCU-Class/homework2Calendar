function downloadICS(events) {
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:-//Moodle to Calendar//EN
`;

  for (const event of events) {
    const { title, description, startDate, endDate } = event;
    const format = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    icsContent += `BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:${description || ""}
DTSTART:${format(startDate)}
DTEND:${format(endDate)}
END:VEVENT
`;
  }

  icsContent += "END:VCALENDAR";

  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "moodle-homework.ics";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportBtn").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "get_sesskey" }, async (res) => {
      const sesskey = res?.sesskey;
      if (!sesskey) return console.log("no touch sesskey");

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();

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
      const data = raw_data[0]["data"]["weeks"]
        .flatMap((week) => week.days)
        .flatMap((day) => day.events)
        .map((event) => ({
          description: event.course.fullname,
          title: event.activityname,
          startDate: new Date(event.timestart * 1000 - 3600 * 1000),
          endDate: new Date(event.timestart * 1000),
        }));

      downloadICS(data);
    });
  });
});
