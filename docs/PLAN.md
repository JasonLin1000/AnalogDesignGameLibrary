# 類比電路設計學習遊戲 — 專案規劃 (v0.2)

> 目標：讓完全零基礎的玩家，透過由淺入深的關卡，學會從電路基礎 → 類比 IP 設計 → pre-sim → layout → post-sim 的完整類比設計流程。模擬結果盡可能貼近真實（真 SPICE + 真 PDK）。

## 0. 已確定的決策

| 項目 | 決定 | 影響 |
|---|---|---|
| 平台 | Web 優先，之後包成桌面版 | 核心邏輯為純 TS + WASM；檔案 I/O、儲存層抽象化，日後用 **Tauri** 包裝（體積小、跨平台） |
| 語言 | 繁體中文 / English 雙語 | 第一天就導入 i18n；關卡文字以 `{ "zh-TW": ..., "en": ... }` 儲存；建立中英術語表 |
| PDK | **SkyWater SKY130**（資料最完整） | ngspice BSIM4 模型、corner（tt/ff/ss/sf/fs）、mismatch 參數、真實 DRC 規則皆可取得 |
| 玩家 | 完全零基礎，但基礎章節可跳過 | 新增「第 0 章：電是什麼」；每章提供 **跳級測驗**，通過即解鎖後續章節 |
| 性質 | 開源教學 | 程式碼 Apache-2.0（與 sky130 授權一致，ngspice 為 BSD 相容）；關卡與教材內容 CC BY-SA 4.0；歡迎社群投稿關卡 |

## 1. 系統架構

```
┌──────────────────────── UI (React + TypeScript) ────────────────────────┐
│ Schematic Editor │ Waveform Viewer │ Layout Editor │ Level / Story / i18n │
└────────┬─────────────────┬─────────────────┬─────────────────┬──────────┘
         │ netlist         │ vectors          │ geometry        │ level JSON
┌────────▼─────────┐ ┌─────▼──────┐ ┌────────▼──────────────────▼──────────┐
│ Netlister        │ │ Result     │ │ Layout Engine (TS / Rust→WASM)        │
│ (schematic→SPICE)│ │ Parser     │ │  DRC · Device Extract · LVS · PEX · LDE│
└────────┬─────────┘ └─────▲──────┘ └────────┬──────────────────────────────┘
         │                 │                  │ extracted RC netlist + ΔVth
┌────────▼─────────────────┴──────────────────▼──────────┐
│ Sim Worker: ngspice (WASM) + sky130 model subset       │
└────────────────────────────────────────────────────────┘
```

- **ngspice → WebAssembly**（Emscripten，shared-lib 模式），在 Web Worker 執行，不卡 UI。
- **sky130 模型精簡**：只打包遊戲用到的元件（`nfet_01v8`、`pfet_01v8`、`nfet_01v8_lvt`、高阻 poly 電阻、MIM 電容、BJT for bandgap），並預先展開 `.lib` 以縮短載入時間。
- 前期教學另提供 **Level-1 平方律模型**，讓公式與模擬一致；中期切換 BSIM4 並以「課本 vs 真實」作為教學點。

## 2. Schematic / Pre-sim

- 操作邏輯參考 Virtuoso 與 LTspice（`i` 放元件、`w` 拉線、`q` 屬性、`l` 標 net 名、`Esc` 取消），但 UI 視覺與命名皆自行設計，不使用任何商業工具的商標或圖示。
- 分析逐章解鎖：`.op` → `.dc` → `.ac` → `.tran` → `.noise` → 迴路增益/STB → PVT corner → Monte Carlo。
- 每顆 MOS 即時標示工作區（飽和/三極/截止）與 gm、Id、Vov、gm/Id。
- 關卡判分：隱藏 testbench + `.meas` 量測式，自動比對規格。

## 3. Layout 模擬

1. **製程**：直接使用 sky130 圖層子集（nwell, diff/tap, poly, licon, li1, mcon, met1, via, met2, met3）與其真實 DRC 規則的精簡版（約 20–30 條，入門關卡可只啟用部分規則）。
2. **元件辨識**：diff ∩ poly = gate → 推得 W / L / finger；提供 PCell，進階關卡要求手畫。
3. **DRC**：多邊形布林運算 + R-tree 空間索引，即時標示違規。
4. **LVS**：union-find 建立連通（同層重疊 + contact/via）→ 抽出 layout netlist → 與 schematic 做圖同構比對 → 回報 short / open / 參數不符並高亮 net。
5. **PEX**：
   - R = R□ × L / W（線段切分成 RC 網路），contact / via 固定電阻。
   - C = 面積 × Ca + 周長 × Cf；同層平行耦合 Cc ∝ 重疊長度 / 間距；跨層看重疊面積。
   - 係數取自 sky130 文件。輸出 RC netlist 回灌 ngspice 做 **post-sim**。
6. **LDE 與 mismatch**（讓佈局技巧真的有影響）：

| 效應 | 簡化模型 | 對應技巧 |
|---|---|---|
| 製程梯度 | Vth(x,y) 線性 + 二次項 | common-centroid、interdigitation |
| 隨機 mismatch | Pelgrom σVth = Avt/√(WL)（sky130 參數） | 加大面積 |
| WPE | ΔVth 隨距 nwell 邊緣衰減 | 遠離 well 邊緣 |
| LOD/STI | 依 SA/SB 修正 mobility | dummy 元件 |
| IR drop | 電源網路求解 | 加寬電源線、mesh |
| 電遷移 EM | 電流密度上限 | 線寬、多 via |

所有效應以 **熱圖疊加** 呈現（梯度場、電流密度、IR drop），讓玩家「看見」佈局的影響。

## 4. 關卡課綱

| 章 | 主題 | 範例關卡 |
|---|---|---|
| 0 | **電是什麼**（零基礎） | 電壓/電流（水流比喻）、點亮 LED、串並聯、歐姆定律 |
| 1 | 電路定律與被動元件 | 分壓器、KVL/KCL、RC 濾波（AC/TRAN）、時間常數、Bode 圖 |
| 2 | 半導體元件 | 二極體 I-V、MOS Id-Vgs / Id-Vds、工作區、gm/Id、body effect |
| 3 | 單級放大器 | CS、CD、CG、cascode、偏壓、電流鏡 |
| 4 | 差動電路 | 差動對、5T OTA、CMRR、擺幅 |
| 5 | 運算放大器 | 兩級 OTA、Miller 補償、相位邊限、雜訊 |
| 6 | 類比 IP | Bandgap、LDO、StrongARM 比較器、ring osc / VCO、S/H、SAR 電容陣列 |
| 7 | Layout 入門 | 畫 MOS、過 DRC、過 LVS、multi-finger |
| 8 | 匹配佈局 | common-centroid、dummy、guard ring、對稱繞線 |
| 9 | Post-sim | pre vs post 對比、修 IR drop、EM、耦合 |
| 10 | 畢業專題 | LDO 或 Bandgap 全流程 + PVT + MC 良率 → **Tape-out** |

- 每章開頭有 **跳級測驗**（3–5 題小電路），通過可直接跳章；設定中也可「開發者模式：全部解鎖」。
- 每章結尾有 **Boss 關**（資深工程師 NPC 的 design review）。

## 5. 趣味性

- 三星評分：過規格 / 低功耗或小面積 / 全 corner 通過。
- 每關排行榜（最小面積、最低功耗、最高 FoM）。
- 除錯關：修好壞掉的電路。
- 失敗動畫：過電流冒煙、振盪波形爆炸。
- Tape-out：Monte Carlo 結果以晶圓圖呈現，良率決定分數。
- 知識圖鑑（中英對照概念卡）、沙盒模式、社群關卡編輯器。

## 6. 關卡格式（示意）

```json
{
  "id": "ch4-05-5t-ota",
  "title": { "zh-TW": "第一顆 OTA", "en": "Your First OTA" },
  "allowedParts": ["sky130_nfet_01v8", "sky130_pfet_01v8", "isrc", "vsrc", "cap"],
  "model": "sky130_tt",
  "testbench": "tb/ota_ac.sp",
  "specs": [
    { "meas": "dc_gain_db", "op": ">=", "value": 30 },
    { "meas": "ugb_hz",     "op": ">=", "value": 10e6 },
    { "meas": "iq_a",       "op": "<=", "value": 20e-6 }
  ],
  "stars": { "2": "iq_a <= 10e-6", "3": "all_corners_pass" },
  "hints": [{ "zh-TW": "尾電流決定差動對的 gm…", "en": "The tail current sets the pair's gm…" }]
}
```

## 7. 路線圖

| 階段 | 內容 | 驗收標準 |
|---|---|---|
| **Phase 0 技術驗證** ✅ | ngspice→WASM、載入 sky130 tt 模型、瀏覽器跑 5T OTA AC 分析 | 瀏覽器中畫出 Bode 圖，結果與桌面版 ngspice 一致 |
| Phase 1 MVP ✅ | 專案骨架（Vite + React + TS + i18n）、schematic 編輯器、netlister、波形檢視器、關卡框架；第 0–3 章 | 可從頭玩到第 3 章 |
| Phase 2 ✅ | noise、溫度掃描、PVT corner、Monte Carlo；第 4–6 章 | Bandgap / LDO 關卡可玩 |
| Phase 3 | Layout 編輯器、PCell、DRC、LVS；第 7 章 | 畫出 MOS 並通過 LVS |
| Phase 4 | PEX、LDE、熱圖、post-sim；第 8–10 章 | pre/post 差異可被觀察與修正 |
| Phase 5 | 美術、音效、NPC、排行榜、關卡編輯器、Tauri 桌面版 | 公開 release |

## 7.1 Phase 2 實作備註

- **Monte Carlo**：SKY130 原始模型的 mismatch 是 Spectre 語法，ngspice 不會自動抽樣。遊戲改用 Pelgrom 模型自行抽樣：每顆 MOS 閘極串一個 ΔVth 電壓源，σ = AVT / √(W·L)，AVT 取自模型的 vth0_slope（NFET 3.36、PFET 5.86 mV·µm）。抽樣用固定 seed，可重現、可測試；之後 layout 的製程梯度也走同一機制。
- **迴路增益 / STB**：沒有獨立的 STB 分析，改用測試台上的 1 TH 電感 + 1 F 電容「DC 閉迴路、AC 開迴路」技巧量測開迴路增益與相位邊限。
- **LDO 關卡**：理想運放加上 1 MΩ 輸出電阻（真實誤差放大器的特性），學習重點是 A0（直流精度）、GBW（暫態速度）與傳輸管大小（閘極電容 vs. 壓降）的三角取捨；corner 掃描會揪出 sf −40 °C 的壓降問題。
- **SKY130 尺寸限制**：L 0.15–100 µm、每指寬 W/nf < 100 µm，模擬前會檢查並提示使用 nf。
- **教師模式**：首頁開啟「解鎖全部關卡」後，關卡說明面板可載入參考解答（自動擺放並以網路標籤連接）。

## 8. 開發環境需求

- Node.js LTS（前端）
- Emscripten SDK（編譯 ngspice，建議在 **WSL2** 中進行；之後在 GitHub Actions 自動建置 `.wasm`）
- sky130 模型：從 open_pdks / skywater-pdk 取得並精簡
