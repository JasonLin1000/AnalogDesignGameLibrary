# Analog Design Game

一款開源的類比電路設計學習遊戲：從「電是什麼」一路玩到類比 IP 設計、pre-sim、layout 與 post-sim。
An open-source learning game for analog IC design — from "what is electricity" to analog IP design, layout and post-layout simulation.

- 模擬核心：ngspice（WebAssembly）+ SkyWater SKY130 真實元件模型
- 規劃：[docs/PLAN.md](docs/PLAN.md)
- 模擬引擎：[engine/README.md](engine/README.md)
- 遊戲本體：[app/README.md](app/README.md)（`cd app && npm install && npm run dev`）

License: Apache-2.0（程式碼）；SKY130 模型依其原始 Apache-2.0 授權。
