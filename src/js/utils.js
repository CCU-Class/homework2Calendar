import { getOrCreateCalendar, listAllEvents, isEventChanged } from "./calendar.js";

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
    const { title, description, startDate, endDate, uid } = event;
    const format = formatDateForICS;
    const moodleUid = `moodle-${uid}@ccu.edu.tw`;
    icsContent += `BEGIN:VEVENT
UID:${moodleUid}
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
      iCalUID: `moodle-${event.uid}@ccu.edu.tw`,
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

function generateBatchRequestBody(events, boundary = "batch_boundary", calendarId) {
  const CRLF = "\r\n";
  let body = "";

  events.forEach((event, i) => {
    body += `--${boundary}${CRLF}`;
    body += `Content-Type: application/http${CRLF}`;
    body += `Content-ID: <item-${i + 1}>${CRLF}${CRLF}`;

    if (event.__patch) {
      body += `PATCH /calendar/v3/calendars/${calendarId}/events/${event.googleEventId} HTTP/1.1${CRLF}`;
      body += `Host: www.googleapis.com${CRLF}`;
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
        status: "confirmed",
      };
      body += JSON.stringify(eventPayload) + CRLF + CRLF;
    } else if (event.__delete) {
      body += `DELETE /calendar/v3/calendars/${calendarId}/events/${event.googleEventId} HTTP/1.1${CRLF}`;
      body += `Host: www.googleapis.com${CRLF}${CRLF}`;
    } else {
      body += `POST /calendar/v3/calendars/${calendarId}/events HTTP/1.1${CRLF}`;
      body += `Host: www.googleapis.com${CRLF}`;
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
        iCalUID: event.iCalUID,
      };
      body += JSON.stringify(eventPayload) + CRLF + CRLF;
    }
  });

  body += `--${boundary}--${CRLF}`;
  return body;
}

export async function addBatchEventsToCalendar(token, events, year, month) {
  const calendarId = await getOrCreateCalendar(token);

  const remoteEvents = await listAllEvents(token, calendarId, year, month);
  const remoteEventMap = Object.fromEntries(
    remoteEvents.filter((ev) => ev.iCalUID).map((ev) => [ev.iCalUID, ev])
  );

  const eventsToInsert = [];
  const eventsToPatch = [];

  for (const event of events) {
    const iCalUID = `moodle-${event.uid}@ccu.edu.tw`;
    const existing = remoteEventMap[iCalUID];

    if (!existing) {
      eventsToInsert.push({ ...event, iCalUID });
    } else if (isEventChanged(event, existing)) {
      eventsToPatch.push({
        __patch: true,
        googleEventId: existing.id,
        ...event,
        iCalUID,
        status: "confirmed",
      });
    }
  }

  const moodleUIDSet = new Set(events.map((e) => `moodle-${e.uid}@ccu.edu.tw`));
  console.log(moodleUIDSet);
  const eventsToDelete = remoteEvents
    .filter((e) => e.iCalUID && !moodleUIDSet.has(e.iCalUID))
    .map((e) => ({
      __delete: true,
      googleEventId: e.id,
    }));

  console.log("delete", eventsToDelete);
  const responses = [];

  const makeBatchRequest = async (events, boundary, type) => {
    if (events.length === 0) return;
    const body = generateBatchRequestBody(events, boundary, calendarId);

    const res = await fetch("https://www.googleapis.com/batch/calendar/v3", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
      },
      body,
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`Batch ${type} Error: ${res.status}\n${text}`);

    const parsed = parseGoogleBatchResponse(normalizeBatchText(text));
    console.log(`${type}`, parsed);
    responses.push(...parsed);
  };

  await makeBatchRequest(eventsToPatch, `batch_patch_${Date.now()}`, "PATCH");
  await makeBatchRequest(eventsToInsert, `batch_insert_${Date.now()}`, "INSERT");
  await makeBatchRequest(eventsToDelete, `batch_delete_${Date.now()}`, "DELETE");

  return responses;
}

export async function fetchCalendarData(sesskey, year, month, day) {
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
      uid: event.id,
    }));
}
