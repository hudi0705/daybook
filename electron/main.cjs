const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

let mainWindow = null;
let backendProcess = null;
let loadRetryCount = 0;
const MAX_LOAD_RETRIES = 30;
let backendPort = Number(process.env.DAYBOOK_PORT || process.env.PORT) || 5000;

function getBackendUrl() {
  return `http://127.0.0.1:${backendPort}`;
}

// 单实例锁：防止多个应用实例同时运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

function createWindow() {
  // 防止重复创建窗口
  if (mainWindow !== null) {
    mainWindow.focus();
    return;
  }

  // 图标路径：优先使用 extraResources 中的，回退到 asar 内的
  const resourcesPath = getResourcesPath();
  let iconPath = path.join(resourcesPath, 'dist', 'icon.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, '../public/icon.png');
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    title: 'Daybook',
    show: false,
  });

  // 开发环境加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：连接后端服务器提供的页面
    mainWindow.loadURL(getBackendUrl());
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

  // 加载失败时自动重试（有最大重试次数限制）
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    loadRetryCount++;
    console.error(`Failed to load (attempt ${loadRetryCount}/${MAX_LOAD_RETRIES}):`, errorCode, errorDescription);

    if (loadRetryCount >= MAX_LOAD_RETRIES) {
      console.error('Max load retries reached, giving up');
      dialog.showErrorBox(
        '加载失败',
        `前端页面加载失败（已重试 ${MAX_LOAD_RETRIES} 次）。\n\n错误代码: ${errorCode}\n${errorDescription}\n\n请检查后端服务是否正常运行。`
      );
      return;
    }

    setTimeout(() => {
      if (mainWindow) {
        const isDev = process.env.NODE_ENV === 'development';
        mainWindow.loadURL(isDev ? 'http://localhost:5173' : getBackendUrl());
      }
    }, 2000);
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

/**
 * 检测端口是否可连接
 */
function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function isPortAvailableOnHost(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function isPortAvailable(port) {
  const hosts = ['127.0.0.1', '0.0.0.0', '::'];
  for (const host of hosts) {
    if (!(await isPortAvailableOnHost(port, host))) {
      return false;
    }
  }
  return true;
}

async function findAvailablePort(startPort = 5000) {
  for (let port = startPort; port < startPort + 50; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found from ${startPort} to ${startPort + 49}`);
}

async function checkDaybookHealth(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      return false;
    }
    const data = await response.json().catch(() => null);
    return data?.app === 'daybook' && data?.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * 等待后端服务器就绪（轮询 Daybook 健康检查）
 */
async function waitForServer(port = 5000, maxRetries = 30, interval = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const ready = await checkDaybookHealth(port);
    if (ready) {
      console.log(`Backend server is ready on port ${port} (after ${i + 1} attempts)`);
      return true;
    }
    console.log(`Waiting for backend server... (attempt ${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.error(`Backend server did not start after ${maxRetries} attempts`);
  return false;
}

function startBackend() {
  // 防止重复启动后端
  if (backendProcess !== null) {
    return;
  }

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
      PORT: String(backendPort),
      DAYBOOK_RESOURCES_PATH: resourcesPath,
      NODE_PATH: nodeModulesPath,
      // 关键：让 Electron 以 Node.js 模式运行子进程，跳过 Chromium 初始化
      ELECTRON_RUN_AS_NODE: '1',
    };

    console.log('Starting backend server...');
    console.log('  serverBundle:', serverBundle);
    console.log('  nodeModulesPath:', nodeModulesPath);
    console.log('  cwd:', resourcesPath);
    console.log('  port:', backendPort);

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

  backendProcess.on('exit', (code) => {
    console.log('Backend exited with code:', code);
    backendProcess = null;
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    if (!isDev) {
      dialog.showErrorBox('后端启动失败', err.message);
    }
  });
}

  app.whenReady().then(async () => {
    console.log('App is ready');
    if (process.env.NODE_ENV !== 'development') {
      backendPort = await findAvailablePort(backendPort);
    }
    startBackend();

    if (process.env.NODE_ENV === 'development') {
      // 开发模式使用固定延时
      setTimeout(() => {
        createWindow();
      }, 3000);
    } else {
      // 生产模式：轮询等待后端就绪后再创建窗口
      const serverReady = await waitForServer(backendPort, 30, 1000);

      if (serverReady) {
        createWindow();
      } else {
        // 即后端未就绪也创建窗口，让 did-fail-load 处理重试
        console.warn('Backend not ready, creating window anyway with retry mechanism');
        createWindow();
      }
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

  app.on('before-quit', () => {
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
    }
  });

} // end of gotTheLock else block
