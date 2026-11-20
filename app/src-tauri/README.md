# Desktop build (Tauri 2)

The desktop app wraps the same web build (`../dist`) in a native window; nothing in the game depends on it.

## One-time setup

1. Install Rust: https://rustup.rs (on Windows also the "Desktop development with C++" workload of Visual Studio Build Tools, and WebView2 which ships with Windows 11).
2. In `app/`: `npm install` (the Tauri CLI is a dev dependency).
3. Generate the icon set from the logo: `npx tauri icon public/logo.svg` (writes `src-tauri/icons/`).

## Windows ARM64 notes

- Visual Studio Build Tools 2022 with the C++ workload plus **MSVC ARM64** and a **Windows 11 SDK** are required.
- Outside a "Developer PowerShell", `tauri-winres` cannot find the resource compiler. Point it at the SDK first:

```powershell
$env:RC = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.26100.0\arm64\rc.exe"
```

Output: `target/release/analog-design-lab.exe` and installers in `target/release/bundle/msi` and `bundle/nsis`.

## Run / build

```bash
npm run tauri dev     # native window with hot reload (starts the Vite dev server)
npm run tauri build   # installer in src-tauri/target/release/bundle/
```
