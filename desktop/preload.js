const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("friendOSDesktop", {
  getBackendUrl: () => ipcRenderer.invoke("get-backend-url"),
  getHealth: () => ipcRenderer.invoke("get-health"),
  startModelPull: () => ipcRenderer.invoke("start-model-pull"),
  onPullProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on("pull-progress", subscription);
    return () => ipcRenderer.removeListener("pull-progress", subscription);
  },
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  launchApp: () => ipcRenderer.invoke("launch-app"),
});

// Also inject the backend URL into the window object for Next.js getApiBase()
ipcRenderer.invoke("get-backend-url").then((url) => {
  window.__FRIEND_OS_API_URL__ = url;
});
