export async function getOrCreateCalendar(token, name = import.meta.env.VITE_CALENDAR_NAME) {
  // 1. 先列出所有日曆
  const listRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const listData = await listRes.json();

  if (!listRes.ok) {
    throw new Error(`List calendars failed: ${listRes.status} ${listData.error?.message}`);
  }

  // 2. 查找是否已有相同名稱的日曆
  const existing = listData.items.find((cal) => cal.summary === name);
  if (existing) {
    return existing.id;
  }

  // 3. 若無則創建新日曆
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

  return createData.id;
}
