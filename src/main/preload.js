const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('huddle', {
  // widget
  get: () => ipcRenderer.invoke('huddle:get'),
  refresh: () => ipcRenderer.send('huddle:refresh'),
  resize: (height) => ipcRenderer.send('huddle:resize', height),
  hide: () => ipcRenderer.send('huddle:hide'),
  toggleCompact: () => ipcRenderer.send('huddle:toggle-compact'),
  menu: () => ipcRenderer.send('huddle:menu'),
  openSettings: () => ipcRenderer.send('huddle:open-settings'),
  onUpdate: (callback) => ipcRenderer.on('huddle:update', (_event, state) => callback(state)),

  // settings window; each call resolves to { ok, error? }
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setEnabled: (key, enabled) => ipcRenderer.invoke('settings:set-enabled', key, enabled),
    setAlerts: (key, on) => ipcRenderer.invoke('settings:set-alerts', key, on),
    setThresholds: (values) => ipcRenderer.invoke('settings:set-thresholds', values),
    move: (key, direction) => ipcRenderer.invoke('settings:move', key, direction),
    remove: (key) => ipcRenderer.invoke('settings:remove', key),
    pickFolder: () => ipcRenderer.invoke('settings:pick-folder'),
    add: (account) => ipcRenderer.invoke('settings:add', account),
    connect: (key) => ipcRenderer.invoke('settings:connect', key),
    disconnect: (key) => ipcRenderer.invoke('settings:disconnect', key),
    link: (key) => ipcRenderer.invoke('settings:link', key),
    finishOnboarding: () => ipcRenderer.invoke('settings:finish-onboarding'),
    setCheckUpdates: (on) => ipcRenderer.invoke('settings:set-check-updates', on),
    updateAction: () => ipcRenderer.invoke('settings:update-action'),
    onUpdate: (callback) => ipcRenderer.on('settings:update', (_event, state) => callback(state)),
  },
});
