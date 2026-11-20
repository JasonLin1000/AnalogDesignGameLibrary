# App — 電路圖、模擬、Layout 與關卡（第 0–7 章）

Vite + React + TypeScript。模擬在 Web Worker 中以 ngspice-WASM 執行（見 [../engine](../engine/README.md)）。

## 指令

```bash
npm install
npm run dev        # http://localhost:5174 （會先把 ../engine/models/sky130 複製到 public/）
npm test           # vitest：連線判斷、模擬引擎、每一關的參考解答（真的跑 ngspice）
npm run build      # 型別檢查 + 正式版建置到 dist/
```

## 架構

| 路徑 | 說明 |
|---|---|
| `src/schematic/` | 元件庫（`parts.ts`）、連線判斷（`connectivity.ts`）、netlist 產生（`netlist.ts`）、編輯器狀態（`store.ts`）、畫布（`SchematicCanvas.tsx`） |
| `src/sim/` | 模擬核心（`engine.ts`，Worker 與測試共用）、ASCII raw 解析（`raw.ts`）、量測函式（`measure.ts`）、Worker |
| `src/levels/` | 關卡型別、評分（`evaluate.ts`，含 PVT / MC 統計）、第 0–6 章關卡（`ch0.ts`…`ch6.ts`）、參考解答自動擺放（`autoplace.ts`） |
| `src/game/runs.ts` | 規劃與執行多次模擬：標稱、PVT corner × 溫度、Monte Carlo（Worker pool 平行執行） |
| `src/sim/mismatch.ts` | Pelgrom ΔVth 抽樣（可重現的亂數） |
| `src/game/` | 進度（星星、解鎖）、模擬流程 |
| `src/waveform/` | 波形圖 |
| `src/layout/` | Layout：資料模型、矩形幾何、DRC 規則（`drc.ts`）、PCell、抽取（`extract.ts`）、LVS（`lvs.ts`）、評分、編輯器畫布與圖層面板 |
| `src/ui/` | 首頁、電路圖工作台、Layout 工作台、說明面板、對話框 |
| `src/i18n/` | 繁中 / 英文字典 |

## 新增關卡

1. 在 `src/levels/chN.ts` 用 `P()`（元件）、`W()`（線）、`Lb()`（標籤）描述起始電路。
2. `specs` 決定 ★，`stars` 決定 ★★、★★★；量測種類見 `src/sim/measure.ts` 的 `Measure`。規格可加 `over: 'pvt' | 'mc'` 與 `stat`（worst / mean / abs3sigma），關卡用 `sweep` 指定 corner、溫度與 Monte Carlo 次數。
3. **至少附一個 `solutions`**，並標明它應該拿幾顆星；`npm test` 會用真的 ngspice 驗證。
4. 所有文字都要有 `zh-TW` 與 `en`（用 `L('中文', 'English')`）。

關卡以 TypeScript 物件撰寫（結構與 docs/PLAN.md 的 JSON 格式相同），享有型別檢查；之後的社群關卡編輯器可輸出同樣結構的 JSON。

## Layout 操作

R 矩形 · L 標籤（放在目前圖層）· I PCell · O 接觸窗堆疊（licon → mcon → via）· K 尺規（Shift+K 清除）· N 網路高亮 · Q / 雙擊 編輯座標 · C 複製 · 方向鍵微調（Shift = 0.05 µm）· 1–0 切換圖層 · F 全圖

## 電路圖操作（參考 Virtuoso / LTspice）

W 拉線 · L 標籤 · R 旋轉 · E 鏡像 · Q 屬性 · P 探針 · Del 刪除 · U / Ctrl+Z 復原 · F 全圖 · 滾輪縮放 · 中鍵或 Alt+拖曳平移 · Ctrl+Enter 模擬
