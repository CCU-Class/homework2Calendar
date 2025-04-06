# 📅 Moodle to Google Calendar Extension

這是一個用於將 中正大學 Moodle (eCourse2) 上的作業或行事曆事件，一鍵匯出至 Google Calendar 的 Chrome/Edge 擴充功能。  
可選擇匯出 `.ics` 檔案下載，或直接自動授權後匯入 Google 行事曆。

> 幫助學生更有效管理 eCourse2 上的課業與繳交時程。

---

## 🚀 功能特色

- 🔍 自動抓取 Moodle (eCourse2) 課程中的行事曆事件（需登入）
- 📥 支援下載 `.ics` 檔案，可匯入至任何行事曆 App
- 📆 可直接登入 Google 帳戶，將事件自動新增至 Google Calendar
- 🖱️ 操作簡單，一鍵完成

---

## 🛠 技術架構

- Chrome Extension (Manifest V3)
- Content Script + Popup UI
- Tailwind CSS for styling
- Vite 作為打包工具
- Google OAuth（`chrome.identity` + `launchWebAuthFlow`）
- ESLint + Prettier 做為開發輔助

---

## 📦 安裝與使用

### 安裝依賴套件

```bash
npm install
```

---

### 建置專案

```bash
npm run build
```

產出可安裝的 extension 專案在 `dist/` 目錄中，可透過 Chrome 擴充功能手動載入。

---

### Tailwind 修復樣式（可選）

```bash
npm run hotfixcss
```

在樣式未正常更新或 Tailwind 出現異常時手動執行。

---

### 程式碼檢查與格式化

```bash
npm run lint      # 使用 ESLint 檢查語法
npm run format    # 使用 Prettier 自動格式化程式碼
```

---

## 📚 使用說明

1. 登入 Moodle（目前支援中正大學 https://ecourse2.ccu.edu.tw/）
2. 點擊瀏覽器右上角 Extension 圖示，開啟插件視窗
3. 選擇年份與月份，點擊：
   - 「📥 匯出作業行事曆檔案」：下載 `.ics` 檔案
   - 「📤 更新事件至行事曆」：登入 Google 並自動新增至 Google Calendar

---

## 🔐 授權與隱私

- 本插件僅在使用者當前登入 eCourse2 且主動點擊下操作, 或者勾選自動匯入才會擷取資料
- Google OAuth 權限僅限寫入行事曆事件，不會存取其他個資
- 資料直接匯入 Google Calendar，無額外存儲資料

---

## 🔏 隱私權政策  
👉 [點我查看隱私權政策](https://homework2calendar.ccuclass.com/privacy.html)

---

## 🧪 瀏覽器支援狀況

| 瀏覽器 | 支援情況 | 備註 |
|--------|----------|------|
| Chrome | ✅ 完整支援 | 使用 `getAuthToken()` 快速登入 |
| Edge   | ✅ 部分支援 | 改用 `launchWebAuthFlow()`，需初次登入後允許 |
| Brave / Others | ⚠️ 未測試 | 如有需求可補充支援判斷邏輯 |

---

## 🙌 貢獻與反饋

歡迎 issue/PR！  
如果你是 CCU 學生，覺得這個擴充功能有幫助，也歡迎幫我按星 🌟 或留言回饋 🙏
