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
    func: (message) => { alert("From Sci-Hub X Now! extension: " + message); },
    args: [message],
  }).catch(reason => {
    console.log("Failed to trigger alert, trying to open popup: ", reason);
    browser.storage.local.set({ 'error-message': message });
    // open options page
    browser.tabs.update({ url: 'chrome://extensions/?options=' + chrome.runtime.id });
  });
};
async function doConfirm(message) {
  console.log("Trying to trigger alert with message: ", message);
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  return chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: (message) => confirm("From Sci-Hub X Now! extension: " + message),
    args: [message],
  }).then(resp => resp[0].result).catch(reason => {
    console.log("Failed to trigger alert, trying to open popup: ", reason);
    browser.storage.local.set({ 'error-message': message });
    // open options page
    browser.tabs.update({ url: 'chrome://extensions/?options=' + chrome.runtime.id });
    return false;
  });
}

// On Install / upgrade / downgrade
// Variable Initialization
const install_message =
  "Thank you for installing Sci-Hub X Now!\n" +
  "Check out the options page to customize your experience! :)"
const update_message =
  "Thank you for upgrading Sci-Hub X Now!\n" +
  "We have new features!\n" +
  'Check out the "options" page now to enable them! :)';
function onInstall(details) {
  if (details.reason == "install") {
    doAlert(install_message).then(() => { browser.runtime.openOptionsPage(); });
    browser.tabs.create({ url: 'chrome://extensions/?options=' + chrome.runtime.id }).then();
  }
  if (details.reason == "update") {
    function parseVersion(version) {
      const parts = version.split(".");
      const major = parseInt(parts[0], 10);
      const minor = parseInt(parts[1], 10);
      const bugfix = parseInt(parts[2], 10);

      return { major, minor, bugfix };
    }
    let previousVersion = parseVersion(details.previousVersion);
    let current_version = parseVersion(chrome.runtime.getManifest().version);

    let major_update = current_version.major > previousVersion.major;
    let minor_update =
      current_version.major == previousVersion.major &&
      current_version.minor > previousVersion.minor;
    let bugfix_update =
      current_version.major == previousVersion.major &&
      current_version.minor == previousVersion.minor &&
      current_version.bugfix > previousVersion.bugfix;
    let no_update = current_version == previousVersion;

    if (major_update) {
      console.log("A major version update has occurred.");
      doConfirm(update_message).then(() => { browser.runtime.openOptionsPage(); });
    } else if (minor_update) {
      console.log("A minor version update has occurred.");
      doConfirm(update_message).then(() => { browser.runtime.openOptionsPage(); });
    } else if (bugfix_update) {
      console.log("A bugfix version update has occurred.");
    } else if (no_update) {
      console.log("No update has occurred.");
    } else {
      console.log("A downdate has occurred.");
    }
  }
}

function addListeners() {
  chrome.runtime.onInstalled.addListener(onInstall);
}

export { doAlert, doConfirm, addListeners }
