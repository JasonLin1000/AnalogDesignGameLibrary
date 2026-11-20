# Analog Design Game

一款開源的類比電路設計學習遊戲：從「電是什麼」一路玩到類比 IP 設計、pre-sim、layout 與 post-sim。
An open-source learning game for analog IC design — from "what is electricity" to analog IP design, layout and post-layout simulation.

- 模擬核心：ngspice（WebAssembly）+ SkyWater SKY130 真實元件模型
- 規劃：[docs/PLAN.md](docs/PLAN.md)
- 模擬引擎：[engine/README.md](engine/README.md)
- 內容：11 章 29 關——電路基礎、半導體、放大器、差動與運放、Bandgap / LDO、layout（DRC / LVS）、匹配佈局、寄生抽取與 post-sim、tape-out 良率；外加沙盒、關卡編輯器與圖鑑
- 遊戲本體：[app/README.md](app/README.md)（`cd app && npm install && npm run dev`）

- 桌面版：[app/src-tauri/README.md](app/src-tauri/README.md)（Tauri 2）

License: Apache-2.0（程式碼）；SKY130 模型依其原始 Apache-2.0 授權。
