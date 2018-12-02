/* global location, chrome */
console.log('这是content script!')

function formatExp (exp) {
  // part of speech
  const regPOS = /^\w+\./
  const matchPOS = exp.match(regPOS)
  if (matchPOS) {
    return `<span class="vocabul-class-pos">${matchPOS[0]}</span>${exp.slice(matchPOS[0].length)}`
  } else {
    return exp
  }
}

function formatYD (x, noWeb) {
  const web = noWeb ? '' : `<div class="vocabul-class-web">${x.web.map(w => '<span class="vocabul-class-webkey">' + w.key + '</span>: ' + w.value.join(',')).join('<br/>')}</div>`
  return `<div class="vocabul-class-word">${x.query}</div>
<div class="vocabul-class-word-exp">
  <div class="vocabul-class-phonetic-c">
    <span class="vocabul-class-phonetic">IN [<span class="phonetic">${x.basic.phonetic}</span>]</span>
    <span class="vocabul-class-phonetic">UK [<span class="phonetic">${x.basic['uk-phonetic']}</span>]</span>
    <span class="vocabul-class-phonetic">US [<span class="phonetic">${x.basic['us-phonetic']}</span>]</span>
  </div>
  <div class="vocabul-class-explains">${x.basic.explains.map(formatExp).join('<br/>')}</div>
  ${web}
</div>
`
}

function getSelectionRect () {
  var range = window.getSelection().getRangeAt(0)
  return range.getBoundingClientRect()
}

function getSelectedText () {
  // getComputedStyle(window.getSelection().anchorNode.parentElement)
  if (window.getSelection) {
    return window.getSelection().toString()
  } else if (document.selection) {
    return document.selection.createRange().text
  }
  return ''
}

// 选中文本手柄
const SelectedTextHandler = (function () {
  const CLASS = 'vocabul-class-selected-text-handler'
  const CLASS_SHOW = CLASS + ' show'
  let _handler
  let _text
  return {
    init: function () {
      _handler = document.createElement('div')
      // _handler.setAttribute('type', 'text/javascript')
      _handler.setAttribute('id', 'vocabul-id-selected-text-_handler')
      _handler.setAttribute('class', CLASS)
      document.body.appendChild(_handler)

      _handler.addEventListener('click', function () {
        _handler.setAttribute('class', CLASS)
        console.log('click handler [text] ->', _text)
        sendMessageToBackground(_text)
      })
    },
    show: function () {
      _handler.setAttribute('class', CLASS_SHOW)
    },

    moveAndShow: function (rect, text) {
      _handler.style.left = rect.right + 'px'
      _handler.style.top = rect.top + 'px'
      _handler.style.height = (rect.bottom - rect.top) + 'px'
      _handler.setAttribute('class', CLASS_SHOW)
      _text = text
    },
    hide: function () {
      _handler.setAttribute('class', CLASS)
    }
  }
})()

// 注入 选中文本手柄
function injectSelectedTextHandler (jsPath) {
  SelectedTextHandler.init()
}

document.addEventListener('mouseup', function () {
  var text = getSelectedText()
  if (text) {
    var rect = getSelectionRect()
    console.log('mouseup -> ', rect)
    SelectedTextHandler.moveAndShow(rect, text)
  }
})

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function () {
  // 注入自定义JS
  injectCustomJs()

  // 注入 选中文本手柄
  injectSelectedTextHandler()

  if (location.host === 'www.en8848.com.cn') {
    initCustomPanel()
    initCustomEventListen()
  }
})

function initCustomPanel () {
  var panel = document.createElement('div')
  panel.className = 'chrome-plugin-demo-panel'
  panel.innerHTML = `
    <h2>injected-script操作content-script演示区：</h2>
    <div id="vocabul-id-word-panel" class="btn-area">
    </div>
    <div id="my_custom_log">
    </div>
  `
  document.body.appendChild(panel)
}

// 向页面注入JS
function injectCustomJs (jsPath) {
  jsPath = jsPath || 'js/inject.js'
  var temp = document.createElement('script')
  temp.setAttribute('type', 'text/javascript')
  // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.src = chrome.extension.getURL(jsPath)
  temp.onload = function () {
    // 放在页面不好看，执行完后移除掉
    this.parentNode.removeChild(this)
  }
  document.body.appendChild(temp)
}

// 接收来自后台的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('收到来自 ' + (sender.tab ? 'content-script(' + sender.tab.url + ')' : 'popup或者background') + ' 的消息：', request)
  if (request.cmd === 'update_font_size') {
    var ele = document.createElement('style')
    ele.innerHTML = `* {font-size: ${request.size}px !important;}`
    document.head.appendChild(ele)
  } else {
    console.log('>>> ', request)
    tip(formatYD(request))
    addWordToPanel(request)
    // sendResponse('我收到你的消息了：' + JSON.stringify(request))
  }
})

// 主动发送消息给后台
// 要演示此功能，请打开控制台主动执行sendMessageToBackground()
function sendMessageToBackground (message) {
  chrome.runtime.sendMessage({ greeting: message || '你好，我是content-script呀，我主动发消息给后台！' }, function (...response) {
    console.log(...response)
    // tip('收到来自后台的回复：' + response)
  })
}

function initCustomEventListen () {
  var hiddenDiv = document.getElementById('myCustomEventDiv')
  if (!hiddenDiv) {
    hiddenDiv = document.createElement('div')
    hiddenDiv.style.display = 'none'
    hiddenDiv.id = 'myCustomEventDiv'
    document.body.appendChild(hiddenDiv)
  }
  hiddenDiv.addEventListener('myCustomEvent', function () {
    var eventData = document.getElementById('myCustomEventDiv').innerText
    tip('收到自定义事件：' + eventData)
  })
}

var tipCount = 0
// 简单的消息通知
function tip (info) {
  info = info || ''
  var ele = document.createElement('div')
  ele.className = 'chrome-plugin-simple-tip slideInLeft'
  ele.style.top = tipCount * 70 + 20 + 'px'
  ele.innerHTML = `<div>${info}</div>`
  document.body.appendChild(ele)
  ele.classList.add('animated')
  tipCount++
  setTimeout(() => {
    ele.style.top = '-100px'
    setTimeout(() => {
      ele.remove()
      tipCount--
    }, 400)
  }, 3000)
}

function addWordToPanel (word) {
  const wc = document.getElementById('vocabul-id-word-panel')
  const ele = document.createElement('div')
  ele.innerHTML = `<div class="vocabul-class-word-c">${formatYD(word, true)}</div>`
  wc.appendChild(ele)
}
