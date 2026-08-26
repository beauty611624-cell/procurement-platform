# 連鎖店採購中控台 — 獨立部署版（多人共用資料版）

這是把 Claude 對話中的「procurement-platform-v3」原型，轉換成一個**可以獨立部署、不需要 Claude 帳號**的標準網頁專案（Vite + React + Tailwind），並改用 **Supabase 免費雲端資料庫**，讓你跟主管用各自的電腦打開同一個網址，看到的是**同一份、即時同步的資料**。

## 架構說明

- 資料儲存改成呼叫 Supabase（一個免費的雲端資料庫服務），不再只存在單一瀏覽器裡。
- 如果你還沒設定 Supabase，程式會自動退回用瀏覽器 localStorage（僅限單一瀏覽器）——方便你在還沒設定雲端資料庫前，先確認網站能不能正常打開、操作流程對不對。
- 設定好 Supabase 之後，你跟主管誰上傳了新的月報表，另一個人畫面上按「同步最新資料」就能看到；如果照下面步驟開啟 Supabase 的 Replication，甚至不用按，會自動跳出提示並同步。

## 部署到 Vercel（免費，一步一步做）

因為我這邊的環境目前連不上套件安裝伺服器，沒辦法在這裡先建置測試給你看，所以請照下面步驟，讓 Vercel 幫你在雲端建置：

### 步驟 1：建立 GitHub 帳號（如果還沒有）
前往 https://github.com/signup 免費註冊。

### 步驟 2：建立新的 Repository
1. 登入 GitHub 後，右上角點 `+` → `New repository`
2. 取個名字，例如 `procurement-platform`
3. Public / Private 都可以（Private 也是免費的）
4. 點 `Create repository`

### 步驟 3：把這個資料夾的檔案上傳上去
在剛建立的 repo 頁面，點 `uploading an existing file`，把這個 zip 解壓縮後裡面的所有檔案跟資料夾拖進去上傳、送出。

### 步驟 4：連接 Vercel
1. 前往 https://vercel.com/signup，選擇「用 GitHub 帳號註冊」
2. 點 `Add New` → `Project`
3. 選擇剛剛的 repo，點 `Import`
4. Vercel 會自動偵測到這是 Vite 專案，設定不用改，先**不要急著點 Deploy**——跳到下面先把 Supabase 設定好，再回來部署（或先部署一次沒關係，等下設定完環境變數重新部署一次即可）。

## 設定 Supabase（讓兩人共用同一份資料，免費）

### 步驟 1：註冊 Supabase
前往 https://supabase.com，用 GitHub 帳號登入最快。

### 步驟 2：建立新專案
1. 點 `New Project`
2. 取個名字（例如 `procurement`），資料庫密碼隨意設定並記下來
3. 地區選 `Northeast Asia (Tokyo)` 或離台灣最近的
4. 等 1-2 分鐘讓專案建立完成

### 步驟 3：建立資料表
左側選單 `SQL Editor` → `New query`，貼上以下 SQL 後點 `Run`：

```sql
create table app_storage (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
-- 先不用設定 RLS，稍後「帳號登入設定」章節會統一啟用並設定規則
```

### 步驟 4（建議）：開啟即時同步
左側選單 `Database` → `Replication`，找到 `app_storage` 這個表格，把複寫（Replication）開關打開。
開啟後，其中一人上傳新資料，另一人畫面會自動跳出「偵測到其他裝置的更新」並自動同步。沒開啟也沒關係，App 裡有「同步最新資料」按鈕可以手動拉取。

### 步驟 5：取得金鑰
左側選單 `Project Settings` → `API`，複製：
- `Project URL`（長得像 `https://xxxxx.supabase.co`）
- `anon public` 金鑰

### 步驟 6：把金鑰設定到 Vercel
1. 到你的 Vercel 專案 → `Settings` → `Environment Variables`
2. 新增：
   - `VITE_SUPABASE_URL` = 剛剛複製的 Project URL
   - `VITE_SUPABASE_ANON_KEY` = 剛剛複製的 anon public 金鑰
3. 存檔後到 `Deployments` 頁籤，點最新那筆部署旁的選單，選 `Redeploy`

完成後，你跟主管打開同一個網址，就是同一份資料了（下一節會加上登入保護，請務必接著做完）。

## 帳號登入設定（機密資料保護）

因為採購資料屬機密文件，這個版本加上了**帳號密碼登入**：沒有登入就完全看不到任何畫面跟資料。不開放自行註冊，只有你（管理員）在 Supabase 後台手動建立的帳號才能登入——目前設計是單純登入即可用，沒有區分權限層級（你跟主管登入後看到的功能都一樣）。

### 步驟 1：在 Supabase 建立帳號
1. 到你的 Supabase 專案 → 左側選單 `Authentication` → `Users`
2. 點 `Add user` → `Create new user`
3. 輸入 email、密碼，`Auto Confirm User` 記得打勾（不然要收驗證信才能登入）
4. 幫你自己跟主管各建立一組帳號（共 2 組）

### 步驟 2：把資料表改成只允許登入後才能存取
到 `SQL Editor` 執行：

```sql
alter table app_storage enable row level security;

create policy "只允許登入用戶讀取"
on app_storage for select
to authenticated
using (true);

create policy "只允許登入用戶新增"
on app_storage for insert
to authenticated
with check (true);

create policy "只允許登入用戶修改"
on app_storage for update
to authenticated
using (true)
with check (true);

create policy "只允許登入用戶刪除"
on app_storage for delete
to authenticated
using (true);
```

這樣設定後，即使有人拿到你的網址 + anon key，沒有登入帳號也完全讀不到、寫不了任何資料。

### 忘記密碼 / 新增帳號
沒有做自助流程，都要你（管理員）到 Supabase 後台的 `Authentication → Users` 手動處理：點使用者旁邊的選單可以重設密碼，或刪除/新增帳號。

### ⚠️ 安全性提醒
- 步驟 2 的 SQL 執行後，資料表會**要求登入才能存取**，這是這個功能真正生效的關鍵一步，不要跳過。
- `.env` / Vercel 環境變數裡的 anon key 不是機密（它本來就設計成可以放在前端程式碼裡），真正的保護來自 Supabase 的登入 + RLS 規則，所以務必確認步驟 2 有執行成功。
- 如果之後想要更細的權限（例如某帳號唯讀、不能刪除資料），跟我說，可以再調整 RLS 規則區分角色。

## 本機開發／測試（進階，選用）
```bash
cp .env.example .env   # 填入你的 Supabase URL 跟 anon key（或留空，會自動退回 localStorage）
npm install
npm run dev
```
會啟動一個本機網址（通常是 http://localhost:5173），改程式碼會即時更新。

## 備選部署方案：Netlify Drop
如果你的電腦已經有 Node.js：
```bash
npm install
npm run build
```
建置完成後產生 `dist` 資料夾，拖到 https://app.netlify.com/drop 幾秒鐘就有網址（記得在 Netlify 專案設定裡也加上一樣的兩個環境變數）。

## 檔案結構
```
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example        ← Supabase 金鑰設定範例
└── src/
    ├── main.jsx         ← 程式進入點，含登入閘門 + Supabase / localStorage 儲存層切換邏輯
    ├── App.jsx          ← 主要程式（採購中控台全部功能）
    ├── LoginScreen.jsx  ← 登入畫面
    ├── supabaseClient.js ← 共用的 Supabase client（登入 + 資料存取都用這個）
    └── index.css        ← Tailwind 樣式載入
```
