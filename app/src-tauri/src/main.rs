// Desktop shell for Analog Design Lab: the web app (Vite build in ../dist) runs inside a
// native window. Simulation (ngspice-WASM) and all game logic stay in the web layer.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Analog Design Lab");
}
