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

function normalizeBatchText(raw) {
  return raw.replace(/\r?\n/g, "\r\n");
}

function generateBatchRequestBody(events, boundary = "batch_boundary") {
  const CRLF = "\r\n";
  let body = "";

  events.forEach((event, i) => {
    body += `--${boundary}${CRLF}`;
    body += `Content-Type: application/http${CRLF}`;
    body += `Content-ID: <item-${i + 1}>${CRLF}${CRLF}`;

    body += `POST /calendar/v3/calendars/primary/events HTTP/1.1${CRLF}`;
    body += `Content-Type: application/json${CRLF}${CRLF}`;

    const eventPayload = {
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
    };

    body += JSON.stringify(eventPayload) + CRLF + CRLF;
  });

  body += `--${boundary}--${CRLF}`;
  return body;
}

function parseGoogleBatchResponse(responseText) {
  const boundary = responseText.match(/--batch_[^\r\n-]+/)?.[0]?.slice(2);
  const parts = responseText.split(`--${boundary}`);
  const results = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || !trimmed.includes("HTTP/1.1")) continue;

    const statusMatch = trimmed.match(/HTTP\/1.1 (\d{3}) (.+)/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const statusText = statusMatch ? statusMatch[2] : "";

    const sections = trimmed.split(/\n{2,}|\r\n{2,}/);
    const rawBody = sections[sections.length - 1];

    const jsonStart = rawBody.indexOf("{");
    const jsonEnd = rawBody.lastIndexOf("}");

    let body = null;
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = rawBody.slice(jsonStart, jsonEnd + 1);
      try {
        body = JSON.parse(jsonStr);
      } catch (e) {
        console.warn("JSON parse failed:", e);
      }
    }

    results.push({ status, ok: status >= 200 && status < 300, statusText, body });
  }

  return results;
}

// Google Calendar API batch add Event
export async function addBatchEventsToCalendar(token, events) {
  const boundary = "batch_boundary_" + Date.now();
  const body = generateBatchRequestBody(events, boundary);

  const res = await fetch("https://www.googleapis.com/batch/calendar/v3", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Batch API Error: ${res.status}\n${text}`);
  }

  return parseGoogleBatchResponse(normalizeBatchText(text));
}
