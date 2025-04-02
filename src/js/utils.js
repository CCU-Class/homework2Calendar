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
