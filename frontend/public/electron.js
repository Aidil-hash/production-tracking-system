const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,     // this auto-hides the menu
    frame: true,               // keep native window controls (false = borderless)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Secure preload
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Disable sandbox for compatibility with some libraries
    }
  });

  const isDev = !app.isPackaged;
  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'index.html')}`;

  mainWindow.loadURL(startURL);
  mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
