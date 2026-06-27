const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Daybook',
    show: false,
  });

  // 开发环境加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：连接后端服务器提供的页面
    mainWindow.loadURL('http://localhost:5000');
  }

  // 窗口准备好后显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 用外部浏览器打开链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getResourcesPath() {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.join(__dirname, '..');
}

function startBackend() {
  const resourcesPath = getResourcesPath();
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // 开发模式：使用 tsx 直接运行 TypeScript
    backendProcess = spawn('npx', ['tsx', 'watch', 'server/index.ts'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
      stdio: 'pipe',
      shell: true,
    });
  } else {
    // 生产模式：运行打包后的 server.cjs
    const serverBundle = path.join(resourcesPath, 'server.cjs');
    if (!fs.existsSync(serverBundle)) {
      dialog.showErrorBox('启动失败', `找不到后端文件: ${serverBundle}`);
      app.quit();
      return;
    }

    // 设置 NODE_PATH 以便找到 node_modules
    const nodeModulesPath = path.join(resourcesPath, 'node_modules');
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      NODE_PATH: nodeModulesPath,
    };

    backendProcess = spawn(process.execPath, [serverBundle], {
      cwd: resourcesPath,
      env: env,
      stdio: 'pipe',
    });
  }

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    if (!isDev) {
      dialog.showErrorBox('后端启动失败', err.message);
    }
  });
}

app.whenReady().then(() => {
  startBackend();

  // 等待后端启动后再创建窗口
  setTimeout(() => {
    createWindow();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
