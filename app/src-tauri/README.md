# Desktop build (Tauri 2)

The desktop app wraps the same web build (`../dist`) in a native window; nothing in the game depends on it.

## Windows installer

`npm run tauri build` produces a normal Windows setup program:

`src-tauri/target/release/bundle/nsis/Analog Design Lab_<version>_<arch>-setup.exe`

What the installer does:

- Language picker (繁體中文 / English), license page (Apache-2.0), then a choice to install for the current user only (no admin prompt, `%LOCALAPPDATA%\Programs\Analog Design Lab`) or for everyone (`C:\Program Files\Analog Design Lab`).
- Start-menu folder "Analog Design Lab", optional desktop shortcut on the last page.
- Installs WebView2 if missing (Windows 11 already has it).
- Registers in Settings → Apps → Installed apps, so it can be removed there or with `uninstall.exe` in the install folder. The uninstaller offers to also delete saved progress (WebView data under `%LOCALAPPDATA%\org.analogdesigngame.lab`).

The desktop app keeps its own progress, separate from the browser version (different origin). Move progress between them with Settings → Progress → Backup / Restore.

Installer artwork (`installer/sidebar.bmp` 164×314, `installer/header.bmp` 150×57) is drawn by `installer/make-images.ps1`; the app icons come from `npx tauri icon public/logo.svg`.

## One-time setup

1. Install Rust: https://rustup.rs (on Windows also the "Desktop development with C++" workload of Visual Studio Build Tools, and WebView2 which ships with Windows 11).
2. In `app/`: `npm install` (the Tauri CLI is a dev dependency).

## Windows ARM64 notes

- Visual Studio Build Tools 2022 with the C++ workload plus **MSVC ARM64** and a **Windows 11 SDK** are required.
- Outside a "Developer PowerShell", `tauri-winres` cannot find the resource compiler. Point it at the SDK first:

```powershell
$env:RC = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.26100.0\arm64\rc.exe"
```

- An ARM64 build installs only on ARM64 Windows. For ordinary (x64) PCs add the target and build it:

```powershell
rustup target add x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-pc-windows-msvc
```

(needs the MSVC x64 tools; output goes to `target/x86_64-pc-windows-msvc/release/bundle/nsis/`).

## Run / build

```bash
npm run tauri dev     # native window with hot reload (starts the Vite dev server)
npm run tauri build   # installer in src-tauri/target/release/bundle/nsis/
```
