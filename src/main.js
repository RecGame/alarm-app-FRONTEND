const { app, BrowserWindow, Menu } = require('electron/main')
const path = require('path');
const packageJson = require('../package.json');

const createWindow = () => {
    const win = new BrowserWindow({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })
    win.maximize();
    win.setTitle(packageJson.name);
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    
    // Deshabilitar el menú
    //Menu.setApplicationMenu(null);
}

app.whenReady().then(()=> {
    createWindow();
})