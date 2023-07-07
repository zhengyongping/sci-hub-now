
// Old and less strict DOI regex.
// const doiRegex = "10.\\d{4,9}/[-._;()/:a-z0-9A-Z]+";
const doiRegex = new RegExp(
  /\b(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'<>])\S)+)\b/
);

// Variable management constants
var sciHubUrl;
var autodownload = false;
var autoname = false;
var openInNewTab = false;
var autoCheckServer = true;
var venueAbbreviations = {};
const defaults = {
  "autodownload": false,
  "scihub-url": "https://sci-hub.st/",
  "autoname": false,
  "open-in-new-tab": false,
  "autocheck-server": false,
  "venue-abbreviations": {},
};
// Variable management functions
function printVars() {
  console.log("sciHubUrl: " + sciHubUrl +
    "\nautodownload: " + autodownload +
    "\nautoname: " + autoname +
    "\nopenInNewTab: " + openInNewTab +
    "\nautoCheckServer: " + autoCheckServer);
}
function addListeners() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        setvariable(key, newValue);
        console.log(`Changed "${key}" from "${oldValue}" to "${newValue}".`);
      }
    }
  });
}
function setvariable(name, value) {
  switch (name) {
    case "scihub-url":
      sciHubUrl = value;
      break;
    case "autodownload":
      autodownload = value;
      break;
    case "autoname":
      autoname = value;
      break;
    case "open-in-new-tab":
      openInNewTab = value;
      break;
    case "autocheck-server":
      autoCheckServer = value;
      break;
    case "venue-abbreviations":
      venueAbbreviations = value;
      break;
  }
  console.log("setvariable called!!!");
  printVars();
}
function initialize(name, value) {
  console.log("initializing " + name + ": " + value);
  setvariable(name, value);
}

// Variable Initialization
chrome.runtime.onInstalled.addListener(function (details) {
  // Set variables to default if they don't already exist
  chrome.storage.local.get(defaults, function (result) {
    console.log("Initializing variables onInstalled: ", result);
    chrome.storage.local.set(result); // for if variables were not set
  });

  if (details.reason == "install") {
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

    let update_message =
      "Thank you for upgrading Sci-Hub X Now!\n" +
      "We have new features!\n" +
      'Would you like to go to the "options" page now to enable them?';
    if (major_update) {
      console.log("A major version update has occurred.");
      if (confirm(update_message)) {
        browser.runtime.openOptionsPage();
      }
    } else if (minor_update) {
      console.log("A minor version update has occurred.");
      if (confirm(update_message)) {
        browser.runtime.openOptionsPage();
      }
    } else if (bugfix_update) {
      console.log("A bugfix version update has occurred.");
    } else if (no_update) {
      console.log("No update has occurred.");
    } else {
      console.log("A downdate has occurred.");
    }
  }
});
chrome.storage.local.get(defaults, function (result) {
  for (const property in result) {
    console.log("Initializing ", property, ": ", result[property]);
    initialize(property, result[property]);
  }
});

export { doiRegex, sciHubUrl, autodownload, autoname, openInNewTab, autoCheckServer, venueAbbreviations, addListeners };
