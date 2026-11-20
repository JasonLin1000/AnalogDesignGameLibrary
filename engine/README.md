# Engine — Phase 0 (ngspice WASM + SKY130)

在瀏覽器裡跑真正的 SPICE：ngspice 編譯成 WebAssembly，配上精簡過的 SKY130 BSIM4 模型。

## 目錄

| 路徑 | 說明 |
|---|---|
| `ngspice-wasm/fetch-source.sh` | 取得 ngspice 原始碼（最新 release tag）到 WSL 的 `/opt/build/ngspice` |
| `ngspice-wasm/build.sh` | 用 Emscripten 編譯，輸出 `dist/ngspice.mjs` + `dist/ngspice.wasm` |
| `ngspice-wasm/runner.mjs` | `runNgspice(netlist, { files, outputs })`：Node / 瀏覽器 / Worker 通用 |
| `ngspice-wasm/test/` | `smoke.mjs`（RC 濾波器）、`ota-compare.mjs`（5T OTA，與原生 ngspice 比對） |
| `models/pack-sky130.sh` | 從 sky130_fd_pr 產生精簡模型包：nfet/pfet_01v8 × tt/ff/ss/sf/fs、mismatch 係數、垂直 PNP（pnp_05v5_W0p68L0p68）與各 corner 的 nonfet 參數 |
| `models/sky130/` | 產生出的模型包（Apache-2.0，見其中的 LICENSE、SOURCE.txt） |
| `demo/` | 瀏覽器示範頁（Web Worker 執行模擬、Bode 圖、corner 切換、中英切換） |

## 重新建置（WSL Ubuntu）

```bash
bash engine/ngspice-wasm/fetch-source.sh
bash engine/ngspice-wasm/build.sh          # 加 clean 參數可完整重建
bash engine/models/pack-sky130.sh          # 需要 /opt/pdk/sky130_fd_pr
```

## 測試與示範（Windows）

```bash
node engine/ngspice-wasm/test/smoke.mjs
node engine/ngspice-wasm/test/ota-compare.mjs
node engine/demo/server.mjs                 # 開啟 http://localhost:5173/demo/
```

## 備註

- 編譯時關閉了 XSPICE、OSDI、readline、X11；ngspice-47 在關閉 XSPICE 時有一個未定義常數的 bug，`build.sh` 會自動補丁。
- sky130 模型需要 `set ngbehavior=hsa`（runner 透過 `/work/.spiceinit` 提供）。
- ngspice 有全域狀態，所以每次模擬都會建立新的 module instance（WASM 編譯結果由瀏覽器快取）。
