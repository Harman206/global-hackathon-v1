// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod window;
mod shortcuts;

#[cfg(target_os = "macos")]
use tauri_plugin_macos_permissions;

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn set_window_height(window: tauri::WebviewWindow, height: u32) -> Result<(), String> {
    use tauri::{LogicalSize, Size};

    let new_size = LogicalSize::new(700.0, height as f64);

    match window.set_size(Size::Logical(new_size)) {
        Ok(_) => {
            if let Err(e) = window::position_window_top_center(&window, 54) {
                eprintln!("Failed to reposition window: {}", e);
            }
            Ok(())
        }
        Err(e) => Err(format!("Failed to resize window: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use std::sync::Mutex;

    let mut builder = tauri::Builder::default()
        .manage(shortcuts::WindowVisibility(Mutex::new(false)))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            set_window_height,
            shortcuts::set_app_icon_visibility,
            shortcuts::set_always_on_top,
        ])
        .setup(|app| {
            // Setup main window positioning
            window::setup_main_window(app).expect("Failed to setup main window");

            // Setup global shortcuts
            if let Err(e) = shortcuts::setup_global_shortcuts(app.handle()) {
                eprintln!("Failed to setup global shortcuts: {}", e);
            }

            Ok(())
        });

    // Add macOS-specific permissions plugin
    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_plugin_macos_permissions::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}