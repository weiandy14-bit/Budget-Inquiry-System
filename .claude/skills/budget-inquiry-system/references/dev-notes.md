# 開發環境踩坑與工作流程（省下重踩的時間）

## 環境怪象（都遇過、都有解）

- **指令 exit code 144（=128+SIGTERM）**：多半是**前景 `sleep` 被 harness 擋掉**。
  不要用前景 `sleep`；要等條件請用 Monitor 的 until-loop，或把長任務丟 `run_in_background`。
- **`pkill -f vite` 會自殺**：`-f` 比對整條命令列，會match到「正在執行 pkill -f vite 的那個 shell」
  而把自己殺掉（也是 exit 144）。改用更精確的 pattern，或乾脆別殺（Playwright 會自己管 dev server）。
- **Git 推送 403（git relay）**：`http://127.0.0.1:.../git/...` 回 403 = 授權/政策層級拒絕，
  **不要重試或繞道**（proxy README 明訂）。這代表 GitHub App 對該 repo 沒有 contents 寫入權限。
  MCP `push_files` 同樣會 403（`Resource not accessible by integration`）。
  解法：請使用者到 https://github.com/settings/installations 給該 repo **Contents: Read and write**，
  之後 `git push -u origin <branch>` 即可成功。
- **空 repo 沒有 main**：第一次 push 的分支會被自動設成預設分支。要開 PR 需要 base，
  本專案是另建 `main`（指向基礎 commit）再 PR。改預設分支需 repo Settings（無 API 工具可代勞）。
- **commit 簽章**：stop-hook 會要求 committer email = `noreply@anthropic.com`、name = `Claude`，
  否則 GitHub 顯示 Unverified。若被提醒，`git config user.email noreply@anthropic.com &&
  git config user.name Claude`，再 `git commit --amend --no-edit --reset-author`（單一 commit）
  或對更早的 commit 用 `git rebase --exec`。commit message 結尾要帶 Co-Authored-By 與 Claude-Session。

## 線上展示（把編譯 app 發成自包含 Artifact）

Artifact 要單一自包含檔（CSP 禁外部請求）。做法：`npm run build` 後，把 `dist/index.html`
引用的單支 JS 與單支 CSS **內聯**成 body-only 片段（`<style>…</style>` + `<div id="root"></div>` +
`<script type="module">…</script>`；把 JS 內的 `</script>` 逃逸成 `<\/script>`），
不要含 doctype/html/head/body（Artifact 會自動包一層）。再用 Artifact 工具發佈。
IndexedDB 在 Artifact 頁面可用；若被沙箱擋，考慮加「IndexedDB 不可用時退回 MemoryCaseRepository」。

## 測試

- 單元測試 vitest：`src/**/*.test.ts`（引擎、檢核、Repository 合約）。
- e2e Playwright：`e2e/*.spec.ts`。`playwright.config.ts` 支援環境覆寫：
  預裝瀏覽器環境用 `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome`、
  `PW_NO_SANDBOX=1`；一般本機用標準 `npx playwright install chromium`。
- CI（`.github/workflows/ci.yml`）：pull_request 與 push→main 觸發，跑 ci→test→build→playwright→e2e。
- Playwright `getByText` 命中多個會 strict-mode 報錯；用 `.first()` 或更精確的 locator。

## 專案工作流程守則

- **push 只在使用者說「推上去」時做**。其餘時間停在「已 commit、等指示」。
- 開發分支 `claude/budget-system-dev-2exmd1` → PR #1 合進 `main`，維持 **draft** 直到使用者要合併。
  （draft 差別：不能按 Merge、不通知 reviewer；轉 ready 才能合。）
- 訂閱了 PR #1 活動；若 CI 紅 → drive-to-green（診斷 job log、修、推）。
- **ecc-tools[bot]**：每次 push 後自動開一個塞 `.claude/.agents/.codex` 設定的無關 PR。
  已與使用者約定**靜默關閉**（`update_pull_request state=closed`），不逐一通知。治本＝移除該 App。
- 使用者慣用**繁體中文**溝通。

## 目前狀態快照（會隨進度變動，僅供接手參考）

- 已交付：專案骨架 + Repository 抽象層、計算引擎（火警驗收通過）、資料模型、
  7 分頁畫面、大系統兩層導覽、e2e、CI。單元 31 + e2e 2 全綠。
- PR #1（draft，CI 綠）：https://github.com/weiandy14-bit/Budget-Inquiry-System/pull/1
- 待使用者決定：把 `main` 設預設分支、移除 ecc-tools App、PR 轉 ready 合併。
- 後續候選：電力/弱電工率結構、CSD 匯出、其他頁面調整。
