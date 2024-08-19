/*
 * @Author: chenwenda316
 * @Date: 2024-08-15 23:29:27
 * @LastEditTime: 2024-08-17 20:07:52
 * @FilePath: \my-electron-app\preload.js
 */
// 所有的 Node.js API接口 都可以在 preload 进程中被调用.
// 它拥有与Chrome扩展一样的沙盒。

const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateCounter: (callback) => ipcRenderer.on('progress', (_event, value) => callback(value)),
  oksong: (callback) => ipcRenderer.on('oksong', (_event, value) => callback(value)),
  download_song: (data) => ipcRenderer.send('download-song', data),
  openfolder: (cid) => ipcRenderer.send('openfolder', cid),
})

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    }
})

