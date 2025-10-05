use tauri::{AppHandle, Manager, Runtime, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use serde_json::json;
use std::sync::Mutex;
// State for window visibility
pub struct WindowVisibility(pub Mutex<bool>);

// Default shortcuts
#[cfg(target_os = "macos")]
const DEFAULT_TOGGLE_SHORTCUT: &str = "cmd+backslash";
#[cfg(not(target_os = "macos"))]
const DEFAULT_TOGGLE_SHORTCUT: &str = "ctrl+backslash";

/// Initialize global shortcuts for the application
pub fn setup_global_shortcuts<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_shortcut = DEFAULT_TOGGLE_SHORTCUT.parse::<Shortcut>()?;

    // Register global shortcuts
    app.global_shortcut().on_shortcut(toggle_shortcut, move |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            handle_toggle_window(&app);
        }
    }).map_err(|e| format!("Failed to register toggle shortcut: {}", e))?;

    // Register all shortcuts
    app.global_shortcut().register(toggle_shortcut)
        .map_err(|e| format!("Failed to register toggle shortcut: {}", e))?;

    Ok(())
}

/// Handle app toggle (hide/show) with input focus and app icon management
fn handle_toggle_window<R: Runtime>(app: &AppHandle<R>) {
    // Get the main window
    let Some(window) = app.get_webview_window("main") else {
        eprintln!("Main window not found");
        return;
    };

    #[cfg(target_os = "windows")]
    {
        let state = app.state::<WindowVisibility>();
        let mut is_hidden = state.0.lock().unwrap();
        *is_hidden = !*is_hidden;

        if let Err(e) = window.emit("toggle-window-visibility", *is_hidden) {
            eprintln!("Failed to emit toggle-window-visibility event: {}", e);
        }
        return;
    }

    #[cfg(not(target_os = "windows"))]
    match window.is_visible() {
        Ok(true) => {
            // Window is visible, hide it and handle app icon based on user settings
            if let Err(e) = window.hide() {
                eprintln!("Failed to hide window: {}", e);
            }

         }
        Ok(false) => {
            // Window is hidden, show it and handle app icon based on user settings
            if let Err(e) = window.show() {
                eprintln!("Failed to show window: {}", e);
            }

            if let Err(e) = window.set_focus() {
                eprintln!("Failed to focus window: {}", e);
            }

            // Emit event to focus text input
            if let Err(e) = window.emit("focus-text-input", json!({})) {
                eprintln!("Failed to emit focus event: {}", e);
            }
        }
        Err(e) => {
            eprintln!("Failed to check window visibility: {}", e);
        }
    }
}

// Tauri command to set app icon visibility in dock/taskbar
#[tauri::command]
pub fn set_app_icon_visibility<R: Runtime>(
    app: AppHandle<R>,
    visible: bool,
) -> Result<(), String> {
    println!("Setting app icon visibility to: {}", visible);
    
    #[cfg(target_os = "macos")]
    {
        // On macOS, use activation policy to control dock icon
        let policy = if visible {
            println!("Setting macOS activation policy to Regular (visible)");
            tauri::ActivationPolicy::Regular
        } else {
            println!("Setting macOS activation policy to Accessory (hidden)");
            tauri::ActivationPolicy::Accessory
        };
        
        app.set_activation_policy(policy)
            .map_err(|e| {
                eprintln!("Failed to set activation policy: {}", e);
                format!("Failed to set activation policy: {}", e)
            })?;
        
        println!("Successfully set macOS activation policy");
    }
    
    #[cfg(target_os = "windows")]
    {
        // On Windows, control taskbar icon visibility
        if let Some(window) = app.get_webview_window("main") {
            println!("Setting Windows taskbar visibility to: {}", visible);
            window.set_skip_taskbar(!visible)
                .map_err(|e| {
                    eprintln!("Failed to set taskbar visibility: {}", e);
                    format!("Failed to set taskbar visibility: {}", e)
                })?;
            println!("Successfully set Windows taskbar visibility");
        } else {
            eprintln!("Main window not found on Windows");
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // On Linux, control panel icon visibility
        if let Some(window) = app.get_webview_window("main") {
            println!("Setting Linux panel visibility to: {}", visible);
            window.set_skip_taskbar(!visible)
                .map_err(|e| {
                    eprintln!("Failed to set panel visibility: {}", e);
                    format!("Failed to set panel visibility: {}", e)
                })?;
            println!("Successfully set Linux panel visibility");
        } else {
            eprintln!("Main window not found on Linux");
        }
    }
    
    Ok(())
}

/// Tauri command to set always on top state
#[tauri::command]
pub fn set_always_on_top<R: Runtime>(
    app: AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    println!("Setting always on top to: {}", enabled);
    
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(enabled)
            .map_err(|e| {
                eprintln!("Failed to set always on top: {}", e);
                format!("Failed to set always on top: {}", e)
            })?;
        
        println!("Successfully set always on top to: {}", enabled);
    } else {
        eprintln!("Main window not found");
        return Err("Main window not found".to_string());
    }
    
    Ok(())
}
