const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const { spawn, exec } = require("child_process");

let mainWindow = null;
let backendProcess = null;
let backendPort = 8000;
let staticServer = null;
let staticPort = 0;
let isQuitting = false;

// Determine environment
const isPackaged = app.isPackaged;
const resourcesPath = isPackaged ? process.resourcesPath : path.join(__dirname, "..");

// MIME types for static server
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
};

/**
 * Starts a local HTTP static server serving the exported Next.js frontend on 127.0.0.1.
 */
function startStaticServer(frontendDir) {
  return new Promise((resolve, reject) => {
    staticServer = http.createServer((req, res) => {
      // Parse requested file path
      let reqPath = decodeURI(req.url.split("?")[0]);
      if (reqPath === "/" || reqPath === "") {
        reqPath = "/index.html";
      }

      let filePath = path.join(frontendDir, reqPath);

      // If directory or path without extension, try appending .html or /index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + ".html")) {
        filePath = filePath + ".html";
      }

      // If file doesn't exist, fallback to index.html for client routing
      if (!fs.existsSync(filePath)) {
        filePath = path.join(frontendDir, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end("500 Internal Server Error");
          return;
        }

        // Set security and caching headers
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
        });
        res.end(content);
      });
    });

    // Listen on random available port on localhost only
    staticServer.listen(0, "127.0.0.1", () => {
      staticPort = staticServer.address().port;
      console.log(`[FRIEND.OS Desktop] Static frontend server listening on 127.0.0.1:${staticPort}`);
      resolve(staticPort);
    });

    staticServer.on("error", reject);
  });
}

/**
 * Spawns the compiled backend or development python server.
 */
function startBackend() {
  return new Promise((resolve) => {
    let backendExe;
    let spawnArgs = [];

    if (isPackaged) {
      backendExe = path.join(resourcesPath, "backend", "friend-os-backend.exe");
    } else {
      // In development, check for compiled dist first, then fall back to python
      const compiledPath = path.join(resourcesPath, "dist", "friend-os-backend", "friend-os-backend.exe");
      if (fs.existsSync(compiledPath)) {
        backendExe = compiledPath;
      } else {
        backendExe = path.join(resourcesPath, ".venv", "Scripts", "python.exe");
        spawnArgs = [path.join(resourcesPath, "desktop_backend.py")];
      }
    }

    console.log(`[FRIEND.OS Desktop] Spawning backend from: ${backendExe}`);

    backendProcess = spawn(backendExe, spawnArgs, {
      cwd: path.dirname(backendExe),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let detected = false;

    backendProcess.stdout.on("data", (data) => {
      const text = data.toString();
      console.log(`[Backend stdout] ${text.trim()}`);

      const portMatch = text.match(/FRIEND_OS_PORT=(\d+)/);
      if (portMatch) {
        backendPort = parseInt(portMatch[1], 10);
      }

      if (text.includes("FRIEND_OS_READY") || text.includes("Uvicorn running on")) {
        if (!detected) {
          detected = true;
          resolve(backendPort);
        }
      }
    });

    backendProcess.stderr.on("data", (data) => {
      console.error(`[Backend stderr] ${data.toString().trim()}`);
    });

    backendProcess.on("exit", (code) => {
      console.log(`[Backend] Process exited with code ${code}`);
      if (!detected) {
        resolve(backendPort);
      }
    });

    // Timeout fallback after 5 seconds
    setTimeout(() => {
      if (!detected) {
        detected = true;
        resolve(backendPort);
      }
    }, 5000);
  });
}

/**
 * Polls backend /health until responding.
 */
async function waitForHealth(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // Wait 300ms before retrying
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

/**
 * Cleanly kills the backend child process.
 */
function cleanupBackend() {
  if (backendProcess && backendProcess.pid) {
    console.log(`[FRIEND.OS Desktop] Terminating backend process ${backendProcess.pid}`);
    try {
      if (process.platform === "win32") {
        exec(`taskkill /pid ${backendProcess.pid} /T /F`);
      } else {
        backendProcess.kill("SIGTERM");
      }
    } catch (e) {
      console.error("Error stopping backend process:", e);
    }
    backendProcess = null;
  }
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: "FRIEND.OS",
    backgroundColor: "#09090b",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle("get-backend-url", () => {
  return `http://127.0.0.1:${backendPort}`;
});

ipcMain.handle("get-health", async () => {
  try {
    const res = await fetch(`http://127.0.0.1:${backendPort}/health`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    return { status: "error", error: err.message };
  }
});

ipcMain.handle("open-external", (_event, url) => {
  shell.openExternal(url);
});

ipcMain.handle("launch-app", () => {
  if (mainWindow && staticPort > 0) {
    mainWindow.loadURL(`http://127.0.0.1:${staticPort}`);
  }
});

ipcMain.handle("start-model-pull", async () => {
  return new Promise((resolve) => {
    try {
      console.log("[FRIEND.OS Desktop] Starting official Ollama pull for qwen3:4b");
      const pullProc = spawn("ollama", ["pull", "qwen3:4b"], {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      pullProc.stdout.on("data", (data) => {
        const text = data.toString();
        // Parse ollama pull output
        if (mainWindow) {
          mainWindow.webContents.send("pull-progress", {
            status: text.trim(),
            raw: text,
          });
        }
      });

      pullProc.stderr.on("data", (data) => {
        const text = data.toString();
        if (mainWindow) {
          mainWindow.webContents.send("pull-progress", {
            status: text.trim(),
            raw: text,
          });
        }
      });

      pullProc.on("close", (code) => {
        if (code === 0) {
          if (mainWindow) {
            mainWindow.webContents.send("pull-progress", {
              status: "success",
              done: true,
            });
          }
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Process exited with code ${code}` });
        }
      });

      pullProc.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

app.whenReady().then(async () => {
  createWindow();

  // Show setup loading screen while initializing
  mainWindow.loadFile(path.join(__dirname, "setup.html"));

  // 1. Start static server
  const frontendDir = isPackaged
    ? path.join(resourcesPath, "frontend")
    : path.join(resourcesPath, "frontend", "out");

  await startStaticServer(frontendDir);

  // 2. Start backend
  await startBackend();

  // 3. Wait for backend health
  const health = await waitForHealth(backendPort);

  // 4. Decision: If Ollama and Qwen3 4B are ready, load main app directly
  if (health && health.ollama && health.ollama.available && health.ollama.model_present) {
    mainWindow.loadURL(`http://127.0.0.1:${staticPort}`);
  } else {
    // Keep setup.html loaded, it will poll health via IPC and display instructions
    mainWindow.webContents.send("health-status", health);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// App lifecycle
app.on("before-quit", () => {
  isQuitting = true;
  cleanupBackend();
});

app.on("will-quit", () => {
  cleanupBackend();
});

app.on("window-all-closed", () => {
  cleanupBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
