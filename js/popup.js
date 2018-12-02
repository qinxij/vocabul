/* global chrome */

// 打开后台页
document.getElementById('open_background').addEventListener('click', e => {
  window.open(chrome.extension.getURL('background.html'))
})
