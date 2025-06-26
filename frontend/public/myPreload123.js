const { contextBridge } = require('electron');
const Conf = require('conf').default;
const config = new Conf({ projectName: 'roland-app' });

contextBridge.exposeInMainWorld('electronStore', {
  get: (key, defaultValue) => config.get(key, defaultValue),
  set: (key, value) => config.set(key, value),
  delete: (key) => config.delete(key),
  clear: () => config.clear()
});
