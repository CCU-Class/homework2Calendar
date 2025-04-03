export function getCurrentYearMonth() {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

export function formatDateForICS(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function downloadICS(events) {
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:-//Moodle to Calendar//EN
`;

  for (const event of events) {
    const { title, description, startDate, endDate } = event;
    const format = formatDateForICS;

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

// Google Calendar API add Event
export async function addOneEventToCalendar(token, event) {
  // Google Calendar API call
  // Docs: https://developers.google.com/calendar/api/v3/reference/events/insert
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: "Asia/Taipei",
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: "Asia/Taipei",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error: ${res.status}, ${errText}`);
  }

  return res.json();
}
