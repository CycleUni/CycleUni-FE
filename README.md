# CycleUni 易校網 — 前端（CycleUni-FE）

台灣大專院校二手教科書搜尋與媒合平台之前端。

## 技術棧

- Angular（最新穩定版，standalone components）
- Angular SSR 混合渲染（route-level render mode）
- Node 24＋npm
- 單元測試：vitest（不採 karma）
- 部署目標：Cloudflare Pages（靜態資產＋Pages Functions SSR）

## 渲染策略（摘自前端 SSD §2）

| 路由 | 模式 |
|---|---|
| `/`、`/search`、`/book/:id` | SSR |
| `/sell`、`/account`、`/messages` | CSR（lazy-loaded） |

## 開發

```bash
npm install
npm start        # 開發伺服器（含 SSR）
npm test         # vitest 單元測試
npm run build    # 正式建置（server bundle 為 platform-neutral，無 Node 專屬 API）
```

### 本地 Workers runtime 冒煙（wrangler dev）

```bash
npm run smoke                # 以 smoke 組態建置（同 production 最佳化，僅允許 Host: localhost）
                             # 並啟動 wrangler dev，預設 http://localhost:8787
curl http://localhost:8787/  # SSR 路由應回傳完整 HTML
```

`smoke` 組態與 production 唯一差異為 `security.allowedHosts: ["localhost"]`。

> **部署前必辦（安全姿態，經 security-manager 核可）**：
> production 建置之 `security.allowedHosts` 刻意維持空清單＝**拒絕所有 Host**。
> 以 production 產物部署後，所有 SSR 請求（含 `*.pages.dev` 與正式網域）都會回 400。
> 正式網域定案（人類決策點）後，**必須**於 `angular.json` production 組態補上
> host 清單，否則 SSR 全面 400。不得以 localhost 或萬用 host 充數。

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
└─ app.config.ts                # providers、SSR hydration、http client
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

- 所有路由在 `src/app/router/app.routes.ts` 統一定義，`router.module.ts` 只負責 `provideRouter(APP_ROUTES)`。SSR 與 CSR 共享同一份路由，避免不同檔案導致不一致。

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
| E2E 測試 | Playwright | 首頁 → 搜尋 → 書本 → 私訊 → 登入 → 登出 完整流程，驗證 SSR/CSR 行為一致 |

執行測試：
```bash
npm test               # Vitest
npm run e2e           # Playwright
```

### 7️⃣ 部署流程

1. **建置** `npm run build` → 產生 `dist/`（client + server bundle）
2. **部署**
   - **Cloudflare Pages**：上傳 `dist/` 作為靜態資產，`dist/server/main.js` 作為 **Pages Functions**（SSR）
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

- **navigationRequestStrategy: 'freshness'** — 確保 SSR 頁面導覽時優先從網路獲取最新 HTML，避免 hydration mismatch
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
- `registerWhenStable:30000` — 等待 Angular 應用穩定（hydration 完成）後再註冊，最多等 30 秒，確保 SSR + PWA 共存無衝突

### 建置與驗證

```bash
npm run build          # 正式建置，產出 dist/cycleuni-fe/browser/ngsw-worker.js 等
# 部署後用 Lighthouse PWA audit 驗證
```

### PWA Checklist ✅

- [x] **可安裝** — manifest.webmanifest + icons + HTTPS
- [x] **離線可用** — Service Worker 快取 app shell + API network-first
- [x] **快速載入** — Prefetch 關鍵資源、lazy-load 非關鍵資源
- [x] **SSR 相容** — navigationRequestStrategy: freshness + registerWhenStable
- [x] **iOS 支援** — apple-mobile-web-app-* meta tags + maskable icons
- [x] **App Shortcuts** — "發布商品"、`/listings/new`、"我的訊息"、`/messages`

---

以上說明提供了 **功能分層、路由、API、UI、測試、部署與 PWA** 的完整藍圖，協助新進開發者快速掌握 CycleUni‑FE 的架構與開發流程。
