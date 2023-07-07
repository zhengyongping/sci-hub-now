import { doiRegex, sciHubUrl, autodownload, autoname, openInNewTab, autoCheckServer, addListeners as addConfigListeners } from "./helper_js/config.js"
import { doAlert, addListeners as addBrowserListeners } from "./helper_js/browser.js"
import { getPdfDownloadLink } from "./helper_js/pdf-link-scraper.js"
import { getApiQueryUrl, createFilenameFromMetadata, extractMetadata } from "./helper_js/doi-metadata-scraper.js"
import { httpGetText } from "./helper_js/download_utils.js"
import { addListeners as addPermissionsListeners } from "./helper_js/permissions-manager.js"
import { checkServerStatus } from "./helper_js/check-server-alive.js"

// All imported event listeners
addConfigListeners();
addPermissionsListeners();
addBrowserListeners();

// Automatic file name lookup & pdf downloading
function downloadPaper(link, fname, scihublink) {
  console.log("Downloading " + link + " as " + fname);
  chrome.downloads.download({
    url: link,
    filename: fname
  }, (downloadId) => {
    if (!downloadId) {
      alertAndRedirect("Download failed - redirecting to sci-hub...", scihublink);
    } else {
      setTimeout(() => {
        chrome.downloads.search({ id: downloadId }, (results) => {
          console.log(results, results[0].bytesReceived);
          console.log(results, results[0].bytesReceived);
          if (!results || !results[0].bytesReceived) {
            alertAndRedirect("Download is very slow.\nSuspected failure downloading.\nRedirecting to sci-hub...", scihublink);
          }
        });
      }, 500);
    }
  });
}
async function redirectToScihub(destUrl) {
  if (openInNewTab) {
    const resp = await browser.tabs.create({ url: destUrl });
    console.log("Created tab:", resp);
  } else {
    const resp = await browser.tabs.update(undefined, { url: destUrl })
    console.log("Updated tab:", resp);
  }
  if (autoCheckServer) {
    checkServerStatus(destUrl);
  }
}
function alertAndRedirect(msg, destUrl) {
  doAlert(msg).then(() => redirectToScihub(destUrl));
}

function downloadPaperWithMetadata(url, metadata = undefined) {
  var pdfLink = '';
  httpGetText(url)
    .then(htmlSource => {
      pdfLink = getPdfDownloadLink(url, htmlSource);
      if (!pdfLink) {
        alertAndRedirect("Error 23: Download link parser failed - redirecting to sci-hub...", url);
        return;
      }
      console.log("Downloading file from link: ", pdfLink);
      downloadPaper(pdfLink, createFilenameFromMetadata(metadata), url);
    })
    .catch(err => {
      console.log("failed???", url, err);
      alertAndRedirect("Error 25: Failed to obtain download link - redirecting to sci-hub...", url);
    });
}
function main(doi) {
  console.log("RUNNING MAIN ON ", doi);
  const destUrl = sciHubUrl + doi;
  if (autodownload) {
    if (autoname) {
      httpGetText(getApiQueryUrl(doi))
        .then(contents => {
          const metadata = extractMetadata(contents);
          return downloadPaperWithMetadata(destUrl, metadata);
        })
        .catch(err => {
          console.log("Error 24: Failed to obtain metadata (err: ", err, ") - redirecting to sci-hub...", destUrl)
          alertAndRedirect("Error 24: Failed to obtain metadata (err: " + err + ") - redirecting to sci-hub...", destUrl)
        });
    } else {
      return downloadPaperWithMetadata(destUrl, undefined);
    }
  } else {
    redirectToScihub(destUrl);
  }
}

// Primary callback upon icon click
function findDoiFromHtml(htmlSource) {
  htmlSource = htmlSource[0];
  let foundRegex = htmlSource.result.match(doiRegex);
  if (foundRegex) {
    var doi = foundRegex[0].split(";")[0];
    doi = doi.replace(/\.pdf/, "");
    // console.log("Regex: " + foundRegex);
    main(doi);
  } else {
    // browser.action.setBadgeTextColor({ color: "white" });
    browser.action.setBadgeBackgroundColor({ color: "#BC243C" });
    browser.action.setBadgeText({ text: ":'(" });
  }
}

// Icon click
function executeJs() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    return browser.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => { return document.body.innerHTML },
    }).then(findDoiFromHtml);
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
  main(doi);
});

// Badge stuff
function resetBadgeText() {
  browser.action.setBadgeText({ text: "" });
}
browser.tabs.onUpdated.addListener(resetBadgeText);
browser.tabs.onActivated.addListener(resetBadgeText);
