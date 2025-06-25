const { contextBridge } = require('electron');
const Store = require('electron-store');
const store = new Store();

contextBridge.exposeInMainWorld('electronStore', {
  get: (key, defaultValue) => store.get(key, defaultValue),
  set: (key, value) => store.set(key, value),
  delete: (key) => store.delete(key),
  clear: () => store.clear()
});