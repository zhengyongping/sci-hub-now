// Add some random hacks related to chrome and MV3/unable to use `alert`.

// webextension-polyfill.js (firefox)
if (!('browser' in self)) {
  self.browser = self.chrome;
}

// Util function to do an alert using Manifest v3.  Usage:
//  await doAlert("message");
// `tab` must be passed in from a callback.
async function doAlert(message) {
  console.log("Trying to trigger alert with message: ", message);
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  return chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: (message) => { alert(message); },
    args: [message],
  }).catch(reason => {
    console.log("Failed to trigger alert, trying to open popup: ", reason);
    // browser.tabs.update({ url: 'chrome://extensions/?options=' + chrome.runtime.id }).then(tab => {
    //   return chrome.scripting.executeScript({
    //     target: { tabId: tab.id },
    //     func: () => {
    //       document.querySelector(".modal").style.display = 'block';
    //       document.querySelector(".modal-body").innerHTML = text;
    //     }
    //   });
    // });
    // browser.tabs.create({ url: 'chrome://extensions/?options=' + chrome.runtime.id }).then();
    // chrome.tabs.create({ url: "helper_js/notif-popup.html" });
  });
};

export { doAlert }
