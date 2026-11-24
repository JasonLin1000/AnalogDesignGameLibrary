# Analog Design Game

一款開源的類比電路設計學習遊戲：從「電是什麼」一路玩到類比 IP 設計、pre-sim、layout 與 post-sim。
An open-source learning game for analog IC design — from "what is electricity" to analog IP design, layout and post-layout simulation.

## 下載 / Download

**[⬇ 下載 Windows 安裝檔（最新版）/ Download the Windows installer (latest)](https://github.com/JasonLin1000/AnalogDesignGameLibrary/releases/latest)**

- 一般電腦（Intel / AMD）：`AnalogDesignLab_<版本>_x64-setup.exe`
- ARM 電腦（Snapdragon 等）：`AnalogDesignLab_<版本>_arm64-setup.exe`

雙擊安裝，可從「設定 → 應用程式」解除安裝。安裝檔未簽章，SmartScreen 若出現警告請按「其他資訊 → 仍要執行」。
Not code-signed: if SmartScreen warns, choose "More info" → "Run anyway".

## 專案 / Project

- 模擬核心：ngspice（WebAssembly）+ SkyWater SKY130 真實元件模型
- 規劃：[docs/PLAN.md](docs/PLAN.md)
- 模擬引擎：[engine/README.md](engine/README.md)
- 內容：11 章 29 關——電路基礎、半導體、放大器、差動與運放、Bandgap / LDO、layout（DRC / LVS）、匹配佈局、寄生抽取與 post-sim、tape-out 良率；外加沙盒、關卡編輯器與圖鑑
- 遊戲本體：[app/README.md](app/README.md)（`cd app && npm install && npm run dev`）

- 桌面版：[app/src-tauri/README.md](app/src-tauri/README.md)（Tauri 2；`npm run tauri build` 產生 Windows 安裝檔，含解除安裝）

License: Apache-2.0（程式碼）；SKY130 模型依其原始 Apache-2.0 授權。
