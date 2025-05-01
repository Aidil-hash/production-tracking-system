const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false
    }
  });

  win.loadURL('http://localhost:3000'); // during dev
  // win.loadFile(path.join(__dirname, 'build/index.html')); // for production
}

app.whenReady().then(createWindow);
