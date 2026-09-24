const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

// Points at the HajjNoor dashboard (Django, www.hajjnoor.com). Logged-out
// users are redirected to /login/ on the same origin.
// Override at build/run time with HAJJNOOR_APP_URL if your domain differs.
const APP_URL = process.env.HAJJNOOR_APP_URL || 'https://www.hajjnoor.com/dashboard/';
const APP_ORIGIN = new URL(APP_URL).origin;
const isDev = !app.isPackaged;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    // Show at once (brand-green background) instead of waiting for
    // ready-to-show: a hidden window until the first remote paint made
    // launch feel several seconds slower than opening the site in Chrome.
    show: true,
    backgroundColor: '#0f4d3a',
    title: 'HajjNoor',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
      // Avoid the hunspell dictionary download on first launch.
      spellcheck: false,
    },
  });

  mainWindow.loadURL(APP_URL).catch((err) => {
    dialog.showErrorBox(
      'HajjNoor — Connection Error',
      `Could not load ${APP_URL}\n\n${err.message}\n\nCheck your internet connection and try again.`
    );
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    if (code === -3) return; // aborted (navigation)
    dialog.showErrorBox('HajjNoor — Load Failed', `${desc} (${code})\n${url}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_ORIGIN)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN) && !url.startsWith('about:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'HajjNoor',
      submenu: [
        {
          label: 'Home',
          accelerator: 'Alt+Home',
          click: () => mainWindow && mainWindow.loadURL(APP_URL),
        },
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => mainWindow && mainWindow.webContents.goBack(),
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => mainWindow && mainWindow.webContents.goForward(),
        },
        {
          label: 'Refresh',
          accelerator: 'F5',
          click: () => mainWindow && mainWindow.webContents.reload(),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HajjNoor',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HajjNoor',
              message: 'HajjNoor Desktop',
              detail: `Version ${app.getVersion()}\n${APP_URL}\n\nHajj & Umrah management for travel agencies.`,
              buttons: ['OK'],
            });
          },
        },
        {
          label: 'Open in Browser',
          click: () => shell.openExternal(APP_URL),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single-instance lock: focus existing window if user launches twice.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    app.quit();
  });
}
