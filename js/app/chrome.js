/* global chrome, localStorage */

function openWindow () {
  chrome.windows.create({
    height: 360,
    width: 480,
    type: 'panel',
    url: chrome.extension.getURL('index.html')
  })
}

chrome.browserAction.onClicked.addListener(function (tab) {
  const optionsUrl = chrome.extension.getURL('index.html')

  chrome.tabs.query({}, function (extensionTabs) {
    let found = false

    for (let i = 0; i < extensionTabs.length; i++) {
      if (optionsUrl === extensionTabs[i].url) {
        found = true
      }
    }

    if (found === false) {
      openWindow()
    }
  })
})

function onInstall () {
  if (localStorage.getItem('PDKExtensionInstallTime')) {
    return
  }

  const now = new Date().getTime()

  chrome.storage.local.set({
    PDKExtensionInstallTime: now
  }, function (result) {
    openWindow()
  })
}

onInstall()
