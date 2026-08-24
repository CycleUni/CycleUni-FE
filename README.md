# CycleUni 易校網 — 前端（CycleUni-FE）

台灣大專院校二手教科書搜尋與媒合平台之前端。

## 技術棧

- Angular（最新穩定版，standalone components）
- Angular（standalone components，CSR）
- Node 24 + npm
- 單元測試：vitest（不採 karma）
- 部署目標：Cloudflare Pages（靜態資產 + PWA service worker）

## 渲染策略

全站 CSR（Client-side rendering），搭配 PWA service worker 提供離線能力。所有路由均 lazy-loaded。

## 開發

```bash
npm install
npm start        # 開發伺服器
npm test         # vitest 單元測試
npm run build    # 正式 production 建置
```

### 書籍封面與 `/api/cover`

書封不直接連到 Google Books／Open Library，而是走 `functions/api/cover.ts`
這支 Cloudflare Pages Function 代理（負責過濾兩邊 API 都會回 200 的假封面、
zoom 逐級降級、以及長效 CDN 快取）。

`ng serve` **不會**執行 `functions/`，所以開發時封面需要另外起一個 wrangler：

```bash
npm run smoke    # 另開一個終端機，於 :8788 提供 /api/cover
npm start        # proxy.conf.json 會把 /api/cover 轉發到 :8788
```

只跑 `npm start` 不會壞掉，但 `/api/cover` 會失敗，所有封面都會退成
站內樣式的預設封面（`<ui-book-cover>` 的 placeholder）。正式部署到
Cloudflare Pages 時 Function 由平台自動執行，不需要這一步。

詳細架構見 `docs/frontend-ssd.md`（位於上層 CycleUni 工作根目錄）。

---

## 📁 前端專案結構說明

### 1️⃣ Feature 資料夾 (Feature‑Folder Pattern)

```
src/app/
├─ features/                     # 每個「頁面」或功能一個子資料夾
│   ├─ home/                     # 首頁 – Hero、分類、最近上架、等候清單
│   │   ├─ home.component.ts
│   │   ├─ home.component.html
│   │   ├─ home.component.scss
│   │   └─ home.service.ts      # 只負責呼叫 ListingApi、MetadataApi、快取
│   ├─ search/                   # 搜尋結果與篩選
│   ├─ book/                     # 書本詳情頁面
│   ├─ account/                  # 註冊、登入、驗證、個人設定
│   ├─ sell/                     # 掛單表單、編輯、刪除
│   └─ messages/                 # 私訊列表與對話視窗
├─ shared/                       # 可重用 UI 元件
│   └─ ui/                       # button、badge、listing‑row、skeleton、layout …
├─ core/                         # 全局服務、拦截器、i18n、API 抽象層
│   ├─ api/                     # auth.api.ts、listing.api.ts、book.api.ts
│   ├─ auth.interceptor.ts
│   ├─ api‑url.interceptor.ts
│   └─ i18n.service.ts
├─ router/                       # 路由集中管理 (app.routes.ts, router.module.ts)
└─ app.config.ts                # providers、http client、PWA
```

- **Feature component** 均為 **standalone**，只在 `features/home/home.component.ts` 中 `import` 必要的 UI 元件與服務。
- 每個 feature 只保留 **UI 與簡易邏輯**，所有與後端交互都走 `src/app/core/api/` 包裝的 service，確保 UI 不直接依賴 HTTP。

### 2️⃣ 路由與懶載入

```ts
export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', loadComponent: () => import('../features/search/search.component').then(m => m.SearchComponent) },
  { path: 'book',   loadComponent: () => import('../features/book/book.component').then(m => m.BookComponent) },
  // …其他懶載入
];
```

- 所有路由在 `src/app/router/app.routes.ts` 統一定義。

### 3️⃣ API 抽象層與錯誤統一處理

- `src/app/core/api/*.api.ts` 僅負責 **HttpClient 請求 + 型別**，不處理 UI 邏輯。
- `src/app/core/api/http-error.interceptor.ts`（未在專案中但建議加入）會把所有 `HttpErrorResponse` 轉為全局 **Toast**，讓 UI 不必自行檢查錯誤。

### 4️⃣ UI 元件與可存取性

- 所有 UI 元件（button、badge、listing‑row、skeleton、layout）皆採用 **CSS 變數**（`var(--accent)`, `var(--muted)`）
- `ui-listing-row` 已改為 `alt="{{ title }}"`，提供螢幕閱讀器資訊。
- 互動元素（搜尋標籤、按鈕）使用 `<button>` 並加上 `aria-label`，避免 `javascript:void(0)`。
- `trackBy`、`tabindex`、鍵盤 `Enter` 事件已在元件中加入，提高列表渲染效能與可鍵入操作。

### 5️⃣ 狀態管理

- JWT Token、使用者資訊保存在 **AuthStore**（RxJS `BehaviorSubject`），`AuthInterceptor` 自動注入 token 並在 401 時進行單一次旋轉。
- 語系切換使用 **I18nService** + **TPipe**，所有文字皆走 `{{ 'key' | t }}`，語言變更時 `TPipe` 自動重新渲染。

### 6️⃣ 測試策略

| 種類 | 框架 | 目標 |
|------|------|------|
| 單元測試 | Vitest + Testing Library | 每個 UI 元件、Pipe、Service 的渲染與行為 |
| 整合測試 | Vitest (HttpTestingController) | API service 與 interceptor 的互動 |
| E2E 測試 | Playwright | 首頁 → 搜尋 → 書本 → 私訊 → 登入 → 登出 完整流程 |

執行測試：
```bash
npm test               # Vitest
npm run e2e           # Playwright
```

### 7️⃣ 部署流程

1. **建置** `npm run build` → 產生 `dist/cycleuni-fe/browser/`
2. **部署**
   - **Cloudflare Pages**：上傳 `dist/cycleuni-fe/browser/` 作為靜態資產
   - **環境變數**：在 Cloudflare Dashboard 設定 `API_URL`（指向後端 API）與 `APP_ENV=production`
3. **安全設定**：`angular.json` production 中 `security.allowedHosts` 必須空白，避免跨域 400 錯誤。

---

## 🌐 PWA 支援 (Progressive Web App)

CycleUni-FE 支援 PWA，提供離線使用、安裝到桌面、推播通知等原生 App 體驗。

### PWA 架構

| 檔案 | 說明 |
|------|------|
| `ngsw-config.json` | Service Worker 快取策略設定 |
| `public/manifest.webmanifest` | PWA Manifest（名稱、圖示、顏色、捷徑） |
| `public/icons/` | 多尺寸圖示 (72x72 ~ 512x512)，支援 maskable |
| `src/index.html` | PWA meta tags、manifest link、iOS 支援 |
| `src/app/app.config.ts` | Service Worker 註冊策略 |

### 快取策略 (ngsw-config.json)

```json
{
  "navigationRequestStrategy": "freshness",
  "assetGroups": [
    { "name": "app", "installMode": "prefetch", "resources": { "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"] }},
    { "name": "assets", "installMode": "lazy", "updateMode": "prefetch", "resources": { "files": ["/**/*.(svg|png|jpg|webp|woff2)"] }},
    { "name": "icons", "installMode": "prefetch", "resources": { "files": ["/icons/*.png"] }}
  ],
  "dataGroups": [
    { "name": "api", "urls": ["/api/**", "https://api.cycleuni.com/**"], "cacheConfig": { "strategy": "networkFirst", "maxSize": 50, "maxAge": "1h", "timeout": "10s" }}
  ]
}
```

- **navigationRequestStrategy: 'freshness'** — 確保頁面導覽時優先從網路獲取最新 HTML
- **app group (prefetch)** — 關鍵資源建置時預快取
- **assets group (lazy)** — 圖片、字體按需快取
- **api group (networkFirst)** — API 請求優先走網路，離線才讀取快取，TTL 1 小時

### Service Worker 註冊策略

```typescript
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000'
})
```

- `enabled: !isDevMode()` — 開發環境不啟用 SW，避免干擾熱重載
- `registerWhenStable:30000` — 等待 Angular 應用穩定後再註冊，最多等 30 秒，確保 PWA 不干擾初始載入

### 建置與驗證

```bash
npm run build          # 正式建置，產出 dist/cycleuni-fe/browser/ngsw-worker.js 等
# 部署後用 Lighthouse PWA audit 驗證
```

### PWA Checklist ✅

- [x] **可安裝** — manifest.webmanifest + icons + HTTPS
- [x] **離線可用** — Service Worker 快取 app shell + API network-first
- [x] **快速載入** — Prefetch 關鍵資源、lazy-load 非關鍵資源
- [x] **CSR + PWA 相容** — navigationRequestStrategy: freshness + registerWhenStable
- [x] **iOS 支援** — apple-mobile-web-app-* meta tags + maskable icons
- [x] **App Shortcuts** — "發布商品"、`/listings/new`、"我的訊息"、`/messages`

---

以上說明提供了 **功能分層、路由、API、UI、測試、部署與 PWA** 的完整藍圖，協助新進開發者快速掌握 CycleUni‑FE 的架構與開發流程。
