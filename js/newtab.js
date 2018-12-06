/* global chrome, fetch */

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
  return `<div class="vocabul-class-word-c">
  <div class="vocabul-class-word-header">
    <div class="vocabul-class-word">${x.query}</div>
    <div class="vocabul-class-word-header-tools">
      <div class="vocabul-class-word-learnCount">${x.learnCount}</div>
      <div class="vocabul-class-word-delete" data-id=${x._id} data-action="delete">✘</div>
    </div>
  </div>
  <div class="vocabul-class-word-exp">
    <div class="vocabul-class-phonetic-c">
      <span class="vocabul-class-phonetic">IN [<span class="phonetic">${x.basic.phonetic}</span>]</span>
      <span class="vocabul-class-phonetic">UK [<span class="phonetic">${x.basic['uk-phonetic']}</span>]</span>
      <span class="vocabul-class-phonetic">US [<span class="phonetic">${x.basic['us-phonetic']}</span>]</span>
    </div>
    <div class="vocabul-class-explains">${x.basic.explains.map(formatExp).join('<br/>')}</div>
    ${web}
  </div>
</div>
`
}

/* ==================================================
   Comunication with server
 **================================================== */
const SEP_W = '>#<'
// const urlBase = 'http://localhost:9000'
const urlBase = 'https://monkeysoft.cc'
const urlAddWord = urlBase + '/api/vocabul/add'
const urlDeleteWord = urlBase + '/api/vocabul/delete'
const urlGetWords = urlBase + '/api/vocabul/words'

const EleWordListContainer = document.getElementById('vocabul-id-bk-word-list')

function compressWord (word) {
  return {
    query: word.query,
    phonetic: [word.basic.phonetic, word.basic['uk-phonetic'], word.basic['us-phonetic']].join(SEP_W),
    exp: word.basic.explains.join(SEP_W),
    web: (word.web || []).map(web => `${web.key}:${web.value}`).join(SEP_W)
  }
}

function uncompressWord (word) {
  const [inp, ukp, usp] = (word.phonetic || '').split(SEP_W)
  return {
    query: word.word,
    basic: {
      phonetic: inp,
      'uk-phonetic': ukp,
      'us-phonetic': usp,
      explains: (word.exp || '').split(SEP_W)
    },
    web: (word.web || '').split(SEP_W).map(w => {
      const comps = w.split(':')
      return { key: comps[0] || '', value: [comps.slice(1).join(':') || ''] }
    }),
    _id: word._id,
    learnCount: word.learnCount
  }
}

function restAddWord (word) {
  return post(urlAddWord, compressWord(word))
    .then((res) => {
      console.log(res)
    })
}

function restDeleteWord (id) {
  return post(urlDeleteWord, { id })
}

function restGetWords () {
  return fetch(urlGetWords)
    .then(res => res.json())
    .catch(err => {
      console.log(err)
    })
}

function updateWordListWith (words) {
  let html = ''
  for (let i = 0; i < words.length; ++i) {
    const word = uncompressWord(words[i])
    console.log(word)
    html += formatYD(word)
  }
  EleWordListContainer.innerHTML = html
}

function handleGetWords () {
  console.log('handle get words')
  restGetWords().then(result => {
    console.log('result ->', result)
    if (result.ok) {
      updateWordListWith(result.data)
    }
  })
}

function handleClickWord (e) {
  const action = e.target.dataset.action
  if (action === 'delete') {
    restDeleteWord(e.target.dataset.id).then(result => {
      console.log('result ->', result)
      if (result.ok) {
        handleGetWords()
      }
    })
  }
}

document.getElementById('vocabul-id-bk-get-words').addEventListener('click', handleGetWords)
document.getElementById('vocabul-id-bk-word-list').addEventListener('click', handleClickWord)

handleGetWords()

/* ================================================== */
/* ================================================== */

const urlYD = 'https://fanyi.youdao.com/openapi.do?keyfrom=whyliam&key=1331254833&type=data&doctype=json&version=1.1&q='
function yd (word) {
  const url = urlYD + word
  return fetch(url)
    .then((res) => {
      // console.log('res -> ', res)
      return res.json()
    }).then(result => {
      // console.log(result);
      return result
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

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('收到来自content-script的消息：')
  console.log(request, sender, sendResponse)
  // let _result = ''
  // yd(request.greeting).then((result) => {
  //   _result = formatExplaination(result)
  //   console.log(_result)
  //   // sendResponse(_result)

  //   restAddWord(result)

  //   chrome.tabs.sendMessage(sender.tab.id, result, (response) => {
  //     console.log('response from content ->', response)
  //   })
  // })
})
