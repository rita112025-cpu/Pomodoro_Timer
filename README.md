# 番茄專注計時器 (Pomodoro Timer)

以 React + TypeScript + Vite + Tailwind CSS 製作的單頁番茄鐘。所有資料僅儲存在瀏覽器本機 `localStorage`，不需後端。

## 功能

- 專注（25 分）、短休息（5 分）、長休息（15 分）三種模式，時長可在設定中自訂（1–120 分鐘）
- **可靠的 wall-clock 計時**：剩餘時間由 `endTime - Date.now()` 推算，分頁切到背景、電腦睡眠、CPU 忙碌都不會造成計時漂移
- 今日專注統計（完成次數、專注分鐘），跨午夜自動歸零重算
- `localStorage` 讀取皆有錯誤防護：JSON 損毀或 schema 不符時自動清除並回復預設值，不會導致 App 無法啟動
- 分頁 title 即時顯示倒數與完成狀態

## 開發

```bash
npm install
npm run dev        # http://localhost:3000
```

## 指令

| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` | 產出 `dist/` |
| `npm run preview` | 本機預覽 build 結果 |
| `npm run typecheck` | `tsc --noEmit` 型別檢查 |
| `npm test` | Vitest 單元測試（計時、統計、儲存層） |
| `npm run test:watch` | Vitest watch mode |

## 測試

測試位於 `src/lib/*.test.ts`，聚焦功能正確性：

- `timer.test.ts` — wall-clock 倒數推算：背景 throttle、tick 抖動、系統睡眠情境
- `stats.test.ts` — 今日統計 schema 驗證與跨午夜 rollover
- `storage.test.ts` — `localStorage` 損毀 JSON、錯誤 schema、儲存空間不可用時的錯誤防護

CI（GitHub Actions）在每次 push / PR 執行 typecheck + test + build。

## 部署

```bash
npm run build
```

將 `dist/` 部署到任意靜態託管（GitHub Pages、Netlify、Vercel、Nginx 等）即可。專案無環境變數、無後端相依。

## 專案結構

```text
index.html           # 入口 HTML（引用 /src/main.tsx）
src/
  main.tsx           # React 掛載點
  App.tsx            # UI 與計時流程編排
  lib/
    timer.ts         # wall-clock 倒數純函式
    stats.ts         # 今日統計純函式（含跨午夜 rollover）
    storage.ts       # localStorage 存取 + 錯誤防護
    *.test.ts        # 對應單元測試
```

## 資料儲存

| localStorage key | 內容 |
|---|---|
| `pomodoro-stats` | `{ date, focusSessions, totalFocusMinutes }`，僅保留當日 |
| `pomodoro-durations` | 各模式時長（分鐘） |
