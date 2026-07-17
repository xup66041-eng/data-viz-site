# 免費部署筆記

這個專案不是純靜態網站，它包含 React 前端、Express 後端、tRPC API、MySQL 資料庫，以及檔案上傳/AI 相關環境變數。因此不適合直接放到 GitHub Pages 這類靜態免費空間。

建議免費組合：

- Render Free Web Service：跑 Node.js 後端與前端靜態檔。
- Aiven Free MySQL：提供 MySQL 相容資料庫。

## 1. 建立免費 MySQL

1. 到 Aiven 建立免費 MySQL 服務。
2. 複製連線字串，放到 `DATABASE_URL`。
3. 在本機匯入 schema：

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE" pnpm run db:push
```

Windows PowerShell：

```powershell
$env:DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
pnpm run db:push
```

## 2. 部署到 Render

1. 把這個專案推到 GitHub。
2. 在 Render 選 New Web Service，連到 GitHub repo。
3. Render 會讀取 `render.yaml`。
4. 在 Render 的 Environment 補上必要變數：

```text
DATABASE_URL
VITE_APP_ID
OAUTH_SERVER_URL
OWNER_OPEN_ID
BUILT_IN_FORGE_API_URL
BUILT_IN_FORGE_API_KEY
```

`JWT_SECRET` 會由 Render 自動產生，也可以自行填入一段長隨機字串。

## 3. 免費方案限制

- Render Free Web Service 閒置一段時間後會休眠，第一次開啟可能需要約一分鐘喚醒。
- Render 免費服務沒有永久磁碟，請不要把使用者上傳檔案存在本機磁碟。
- Aiven 免費 MySQL 適合個人、小流量、測試用途，不建議當正式高流量產品資料庫。

## 4. 本機驗證

```bash
pnpm install
pnpm run build
```

目前本機正式建置已驗證成功。
