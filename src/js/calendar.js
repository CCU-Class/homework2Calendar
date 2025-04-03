export async function getOrCreateCalendar(token, name = import.meta.env.VITE_CALENDAR_NAME) {
  const listRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const listData = await listRes.json();

  if (!listRes.ok) {
    throw new Error(`List calendars failed: ${listRes.status} ${listData.error?.message}`);
  }

  const existing = listData.items.find((cal) => cal.summary === name);
  if (existing) {
    return existing.id;
  }

  const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: name,
      description: "由 CCU Class 自動建立的作業日曆",
      timeZone: "Asia/Taipei",
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    throw new Error(`Create calendar failed: ${createRes.status} ${createData.error?.message}`);
  }

  await updateCalendarColor(token, createData.id);
  return createData.id;
}

export async function updateCalendarColor(
  token,
  calendarId,
  colorId = import.meta.env.VITE_CALENDAR_DEFAULT_COLOR
) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(calendarId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        colorId,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update color: ${res.status} ${err}`);
  }

  return res.json();
}
