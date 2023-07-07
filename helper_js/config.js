
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
function onChangedListener(changes, area) {
  if (area === 'local') {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      setvariable(key, newValue);
      console.log(`Changed "${key}" from "${oldValue}" to "${newValue}".`);
    }
  }
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
function initializeVar(name, value) {
  console.log("initializing " + name + ": " + value);
  setvariable(name, value);
}

chrome.storage.local.get(defaults, function (result) {
  for (const property in result) {
    console.log("Initializing ", property, ": ", result[property]);
    initializeVar(property, result[property]);
  }
});


// Initialization, on install / upgrade / downgrade
function initialize(details) {
  // Set variables to default if they don't already exist
  chrome.storage.local.get(defaults, function (result) {
    console.log("Initializing variables onInstalled: ", result);
    chrome.storage.local.set(result); // for if variables were not set
  });
}

function addListeners() {
  chrome.storage.onChanged.addListener(onChangedListener);
  chrome.runtime.onInstalled.addListener(initialize);
}

export { doiRegex, sciHubUrl, autodownload, autoname, openInNewTab, autoCheckServer, venueAbbreviations, addListeners };
