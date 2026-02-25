const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 420,
        height: 720,
        minWidth: 380,
        minHeight: 650,
        resizable: true,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, '../assets', 'icon.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile('index.html');
    win.setMenuBarVisibility(false);

    win.webContents.on('did-finish-load', () => {
        win.webContents.insertCSS(`
            .title-bar { -webkit-app-region: drag; }
            .title-bar button { -webkit-app-region: no-drag; }
        `);
    });
}

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
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
