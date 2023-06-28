import { getPdfDownloadLink } from "./helper_js/pdf-link-scraper.js"
import { extractMetadata } from "./helper_js/doi-metadata-scraper.js"

// webextension-polyfill.js (firefox)
if (!('browser' in self)) {
  self.browser = self.chrome;
}

// Old and less strict DOI regex.
// const doiRegex = "10.\\d{4,9}/[-._;()/:a-z0-9A-Z]+";
const doiRegex = new RegExp(
  /\b(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'<>])\S)+)\b/
);
const trueRed = "#BC243C";

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
  "venue-abbreviations": {}
};
// Variable management functions
function printVars() {
  console.log("sciHubUrl: " + sciHubUrl +
    "\nautodownload: " + autodownload +
    "\nautoname: " + autoname +
    "\nopenInNewTab: " + openInNewTab +
    "\nautoCheckServer: " + autoCheckServer);
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      setvariable(key, newValue);
      console.log(`Changed "${key}" from "${oldValue}" to "${newValue}".`);
    }
  }
});
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
    initialize(property, result[property]);
  }
});
// Special case: permission revoked:
var tmpPermissions;
chrome.permissions.onRemoved.addListener(function (permissions) {
  console.log("permissions revoked!!!", permissions)
  tmpPermissions = permissions;
  for (var origin of permissions.origins) {
    origin = origin.replaceAll("*", ".*"); // to match regex syntax
    console.log(origin, getApiQueryUrl("", ""));
    if (getApiQueryUrl("", "").match(origin)) {
      alert("You've removed the permission for \"Sci-Hub X Now!\" to access the doi metadata query service by https://doi.crossref.org." +
        "\nThe auto-naming feature will now be disabled but other functionality" + (autodownload ? " (including auto-downloading) " : " ") + "will continue to work." +
        "\nYou may re-enable auto-naming at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-name downloaded pdf's\" checkbox.");
      chrome.storage.local.set({ "autoname": false });
    }
    if (sciHubUrl.match(origin)) {
      alert("You've removed the permission for \"Sci-Hub X Now!\" to access the sci hub url: `" + sciHubUrl + "`." +
        "\nThe auto-download feature will now be disabled but redirecting doi's to sci-hub will continue to work." +
        "\nYou may re-enable auto-downloading at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-download pdf's\" checkbox.");
      chrome.storage.local.set({ "autodownload": false });
    }
  }
  for (const permission of permissions.permissions) {
    if (permission === "downloads") {
      alert("You've removed the permission for \"Sci-Hub X Now!\" to automatically download files." +
        "\nThe auto-download feature will now be disabled but redirecting doi's to sci-hub will continue to work." +
        "\nYou may re-enable auto-downloading at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-download pdf's\" checkbox.");
      chrome.storage.local.set({ "autodownload": false });
    }
  }
});

/************* BEGIN SERVER ALIVE CHECKING CODE ****************** */
let FILES_TO_CHECK = ["favicon.ico", "misc/img/raven_1.png", "pictures/ravenround_hs.gif"]
function checkServerStatus(domain) {
  var counts = [0, 0];
  var sent_message = false;

  console.log("CHECKING SERVER STATUS FOR ", domain);

  if (domain.charAt(domain.length - 1) != '/')
    domain = domain + '/';
  for (const file of FILES_TO_CHECK.values())
    checkServerStatusHelper(domain + file, function (success) {
      if (sent_message) { return; }
      console.log("IN CALLBACK! counts is ", counts);
      counts[0] += 1;
      if (success) counts[1] += 1;
      if (counts[0] < FILES_TO_CHECK.length) { return; }
      if ((counts[1] == 0)) {
        if (confirm("Looks like the mirror " + domain + " is dead.  Would you like to go to the options page to select a different mirror?")) {
          browser.tabs.create({ url: 'chrome://extensions/?options=' + chrome.runtime.id }).then();
        }
      } else if (counts[1] == 1) {
        if (confirm("We detected that the mirror " + domain + " might be dead." +
          "\nIf the page/pdf actually loaded correctly, then there's no need for action and you may consider going to the options page to disable \"Auto-check sci-hub mirror on each paper request\"." +
          "\nWould you like to go to the options page to select a different mirror or to turn off auto-checking?")) {
          browser.tabs.create({ url: 'chrome://extensions/?options=' + chrome.runtime.id }).then();
        }
      } else {
        // all good
      }
      sent_message = true;
    });

  setTimeout(function () {
    if (sent_message) { return; }
    if (counts[0] < FILES_TO_CHECK.length) {
      if (confirm("Looks like the mirror " + domain + " is dead.  Would you like to go to the options page to select a different mirror?")) {
        browser.tabs.create({ url: 'chrome://extensions/?options=' + chrome.runtime.id }).then();
      }
    }
    sent_message = true;
  }, 2000);
}
function checkServerStatusHelper(testurl, callback) {
  var img = document.body.appendChild(document.createElement("img"));
  img.height = 0;
  img.visibility = "hidden";
  img.onload = function () {
    callback && callback.constructor == Function && callback(true);
  };
  img.onerror = function () {
    callback && callback.constructor == Function && callback(false);
  }
  img.src = testurl;
}
/************* END SERVER ALIVE CHECKING CODE ****************** */

// Automatic file name lookup & pdf downloading
function httpGet(theUrl) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", theUrl, false); // false for synchronous request
  xmlHttp.send(null);
  return xmlHttp.responseText;
}
function getApiQueryUrl(doi, email) {
  return 'https://doi.crossref.org/servlet/query' + '?pid=' + email + '&id=' + doi;
}
function createFilenameFromMetadata(md) {
  if (!md)
    return undefined;
  return md.authorlastname + md.yearmod100 + md.shortvenue + "_" + md.shorttitle + '.pdf';
}
function downloadPaper(link, fname, scihublink) {
  console.log("Downloading " + link + " as " + fname);
  chrome.downloads.download({
    url: link,
    filename: fname
  }, (downloadId) => {
    if (!downloadId) {
      alert("Download failed - redirecting to sci-hub...");
      redirectToScihub(scihublink);
    } else {
      setTimeout(() => {
        chrome.downloads.search({ id: downloadId }, (results) => {
          console.log(results, results[0].bytesReceived);
          console.log(results, results[0].bytesReceived);
          if (!results || !results[0].bytesReceived) {
            alert("Download is very slow.\nSuspected failure downloading.\nRedirecting to sci-hub...");
            redirectToScihub(scihublink);
          }
        });
      }, 500);
    }
  });
}
function redirectToScihub(destUrl) {
  if (openInNewTab) {
    var creatingTab = browser.tabs.create({ url: destUrl });
    creatingTab.then();
  } else {
    browser.tabs.update(undefined, { url: destUrl });
  }
}

// Primary callback upon icon click
function getHtml(htmlSource) {
  htmlSource = htmlSource[0];
  let foundRegex = htmlSource.result.match(doiRegex);
  if (foundRegex) {
    var doi = foundRegex[0].split(";")[0];
    doi = doi.replace(/\.pdf/, "");
    var destUrl = sciHubUrl + doi;
    // console.log("Regex: " + foundRegex);
    if (autodownload) {
      var metadata = undefined;
      if (autoname) {
        const email = 'gchenfc.developer@gmail.com';
        var contents = httpGet(getApiQueryUrl(doi, email));
        console.log(contents);
        metadata = extractMetadata(contents);
        console.log(metadata);
      }
      var pdfLink = '';
      try {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.timeout = 2000;
        xmlHttp.open("GET", destUrl, true); // false for synchronous request
        xmlHttp.onerror = function () {
          alert("Error 25: Failed to obtain download link - redirecting to sci-hub...");
          redirectToScihub(destUrl);
        };
        xmlHttp.ontimeout = xmlHttp.onerror;
        xmlHttp.onload = function () {
          pdfLink = getPdfDownloadLink(xmlHttp.responseText);
          if (!pdfLink) {
            alert("Error 23: Download link parser failed - redirecting to sci-hub...");
            redirectToScihub(scihublink);
          }
          console.log(pdfLink);
          downloadPaper(pdfLink, createFilenameFromMetadata(metadata), destUrl);
        };
        xmlHttp.send(null);
      } catch (e) {
        alert("Error 24: Failed to obtain download link - redirecting to sci-hub...");
        redirectToScihub(destUrl);
        return;
      }
    } else {
      redirectToScihub(destUrl);
    }
    if (autoCheckServer) {
      setTimeout(checkServerStatus, 1, sciHubUrl);
    }
  } else {
    // browser.action.setBadgeTextColor({ color: "white" });
    browser.action.setBadgeBackgroundColor({ color: trueRed });
    browser.action.setBadgeText({ text: ":'(" });
  }
}

// Icon click
function executeJs() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    return browser.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => { return document.body.innerHTML; },
    }).then(getHtml);
  });
}
browser.action.onClicked.addListener(executeJs);

// Context menus (right click)
browser.contextMenus.create({
  id: "doi-selection",
  title: "Find article by DOI!",
  contexts: ["selection", "link"],
});
browser.contextMenus.onClicked.addListener((info, tab) => {
  // if right-clicked on link, then parse link address first
  var doi = info.linkUrl;
  doi = doi ? doi.match(doiRegex)[0].split(";")[0] : doi;
  // if link not valid, try the highlighted text
  if (!doi) {
    doi = info.selectionText;
  }
  var creatingTab = browser.tabs.create({
    url: sciHubUrl + doi,
  });
});

// Badge stuff
function resetBadgeText() {
  browser.action.setBadgeText({ text: "" });
}
browser.tabs.onUpdated.addListener(resetBadgeText);
browser.tabs.onActivated.addListener(resetBadgeText);
