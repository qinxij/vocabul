/* global chrome, fetch */

// 获取当前选项卡ID
function getCurrentTabId (callback) {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs) {
      if (callback) callback(tabs.length ? tabs[0].id : null)
    }
  )
}

// -------------------- 右键菜单演示 ------------------------//
chrome.contextMenus.create({
  title: 'Vocabul',
  onclick: function () {
    chrome.notifications.create(null, {
      type: 'basic',
      iconUrl: 'img/icon.png',
      title: 'Vocabul',
      message: '您刚才点击了自定义右键菜单！'
    })
    // // 注意不能使用location.href，因为location是属于background的window对象
    // chrome.tabs.create({ url: 'https://www.baidu.com/s?ie=utf-8&wd=' + encodeURI(params.selectionText) })
  }
})
chrome.contextMenus.create({
  title: 'Vocabul: %s', // %s表示选中的文字
  contexts: ['selection'], // 只有当选中文字时才会出现此右键菜单
  onclick: function (params) {
    getCurrentTabId(tabId => {
      tabId && queryWordSendToContent(params.selectionText, tabId)
    })
    // queryWordSendToContent(params.selectionText, 0)
  }
})

function post (url, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .catch(err => {
      console.log(err)
    })
}

/* ==================================================
   Comunication with server
 **================================================== */
const SEP_W = '>#<'
// const urlBase = 'http://localhost:9000'
const urlBase = 'https://monkeysoft.cc'
const urlAddWord = urlBase + '/api/vocabul/add'

function compressWord (word) {
  return {
    query: word.query,
    phonetic: [word.basic.phonetic, word.basic['uk-phonetic'], word.basic['us-phonetic']].join(SEP_W),
    exp: word.basic.explains.join(SEP_W),
    web: (word.web || []).map(web => `${web.key}:${web.value}`).join(SEP_W)
  }
}

function restAddWord (word) {
  return post(urlAddWord, compressWord(word))
    .then((res) => {
      console.log(res)
    })
}

/* ================================================== */
/* ================================================== */

const urlYD = 'https://fanyi.youdao.com/openapi.do?keyfrom=whyliam&key=1331254833&type=data&doctype=json&version=1.1&q='
function yd (word) {
  const url = urlYD + word
  return fetch(url)
    .then((res) => {
      // console.log('res -> ', res)
      return res.json()
    })
    .then(result => {
      // console.log(result);
      return result
    })
    .catch(err => {
      console.log('查询失败', err)
    })
}

function formatExplaination (exp) {
  return `* ${exp.query}
IN [${exp.basic.phonetic}], UK [${exp.basic['uk-phonetic']}], US [${exp.basic['us-phonetic']}]
${exp.basic.explains.join('\n')}
-
${exp.web.map(w => w.key + ': ' + w.value.join(',')).join(';')}
`
}

function queryWordSendToContent (word, tabId) {
  if (!word) { return }

  let _result = ''
  yd(word).then((result) => {
    _result = formatExplaination(result)
    console.log(_result)
    // sendResponse(_result)

    restAddWord(result)

    chrome.tabs.sendMessage(tabId, result, (response) => {
      console.log('response from content ->', response)
    })
  })
}

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('收到来自content-script的消息：')
  console.log(request, sender, sendResponse)
  queryWordSendToContent(request.word, sender.tab.id)
})
