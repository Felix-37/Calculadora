const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// ---- Preferences System ----
const prefsPath = path.join(app.getPath('userData'), 'preferences.json');
let userPreferences = { autoUpdate: false };

try {
    if (fs.existsSync(prefsPath)) {
        userPreferences = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    }
} catch (e) {
    console.error('Error loading preferences', e);
}

function savePreferences() {
    try {
        fs.writeFileSync(prefsPath, JSON.stringify(userPreferences, null, 2));
    } catch (e) {
        console.error('Error saving preferences', e);
    }
}

// Auto Updater Settings
autoUpdater.autoDownload = userPreferences.autoUpdate;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 720,
        minWidth: 380,
        minHeight: 650,
        resizable: true,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, '../assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenuBarVisibility(false);

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.insertCSS(`
            .title-bar { -webkit-app-region: drag; }
            .title-bar button { -webkit-app-region: no-drag; }
        `);

        // Trigger auto-updater check once the window is ready
        autoUpdater.checkForUpdatesAndNotify();
    });
}

// ---- Auto Updater Events ----
autoUpdater.on('update-available', (info) => {
    // Si no está seteado para descargas automáticas, preguntamos al usuario.
    if (!autoUpdater.autoDownload && mainWindow) {
        mainWindow.webContents.send('update-available');
    }
});

autoUpdater.on('update-downloaded', () => {
    // Forzamos el reinicio e instalación cuando el paquete ya está 100% descargado
    autoUpdater.quitAndInstall();
});

// ---- IPC Handlers ----
app.whenReady().then(() => {
    createWindow();

    ipcMain.on('window-minimize', () => {
        BrowserWindow.getFocusedWindow()?.minimize();
    });
    ipcMain.on('window-maximize', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.isMaximized() ? win.unmaximize() : win.maximize();
        }
    });
    ipcMain.on('window-close', () => {
        BrowserWindow.getFocusedWindow()?.close();
    });

    ipcMain.on('update-response', (event, { accept, autoUpdate }) => {
        if (autoUpdate !== userPreferences.autoUpdate) {
            userPreferences.autoUpdate = autoUpdate;
            savePreferences();
            autoUpdater.autoDownload = autoUpdate;
        }

        if (accept) {
            autoUpdater.downloadUpdate();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
