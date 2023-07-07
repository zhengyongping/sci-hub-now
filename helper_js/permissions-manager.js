import { sciHubUrl, autodownload } from "./config.js";
import { doAlert } from "./browser.js";
import { getApiQueryUrl } from "./doi-metadata-scraper.js";

const promisifyPermission = (func, ...args) => {
  return new Promise((resolve, reject) => {
    func(...args, (result) => {
      if (result) resolve();
      reject();
    })
  });
}

// CORS for DOI metadata fetching
function metadataFailMsg() {
  return "The permission request for \"Sci-Hub X Now!\" to access the doi metadata query service by https://doi.crossref.org failed." +
    "\nThe auto-naming feature will now be disabled but other functionality" + (propnameValueCache["autodownload"] ? " (including auto-downloading) " : " ") + "will continue to work." +
    "\nYou may re-enable auto-naming at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-name downloaded pdf's\" checkbox.";
}
function requestCorsPermissionMetadata() {
  const request = {
    origins: ['https://doi.crossref.org/servlet/query*']
  };
  return promisifyPermission(chrome.permissions.contains, request)
    .catch(
      (reason) => {
        console.log("metadata contains failed");
        return promisifyPermission(chrome.permissions.request, request);
      })
    .catch(
      (reason) => {
        return Promise.reject(metadataFailMsg());
      }
    );
}

// CORS for sci-hub pdf link grabbing
function scihubFailMsg(sciHubUrl) {
  return "The permission request for \"Sci-Hub X Now!\" to access the sci hub url: `" + sciHubUrl + "` failed." +
    "\nThe auto-download feature will now be disabled but redirecting doi's to sci-hub will continue to work." +
    "\nYou may re-enable auto-downloading at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-download pdf's\" checkbox.";
}
function requestCorsPermissionScihub(sciHubUrl) {
  sciHubUrl = sciHubUrl.replace(/\/$/, ""); // strip trailing /
  const request = {
    permissions: ['downloads'],
    origins: [sciHubUrl + '/*'] // this is needed to query for the pdf link
  };

  return promisifyPermission(chrome.permissions.contains, request)
    .catch(
      (reason) => {
        console.log("metadata contains failed");
        return promisifyPermission(chrome.permissions.request, request);
      })
    .catch(
      (reason) => {
        return Promise.reject(scihubFailMsg(sciHubUrl));
      }
    );
}

// On permissions changes
// TODO(gerry): fix this.
function addListeners() {
  chrome.permissions.onRemoved.addListener(function (permissions) {
    console.log("permissions revoked!!!", permissions)
    const tmpPermissions = permissions;
    // TODO: doAlert won't work because it's inside a chrome:// tab which is permissions protected.
    // One workaround is to save the reason auto-download was disabled and then display it when the user next opens the options page.
    const alertAndDisableAutoname = (msg) => {
      doAlert(msg).finally(() => { chrome.storage.local.set({ "autoname": false }); });
    };
    const alertAndDisableDownload = (msg) => {
      doAlert(msg).finally(() => { chrome.storage.local.set({ "autodownload": false }); });
    };
    for (var origin of permissions.origins) {
      origin = origin.replaceAll("*", ".*"); // to match regex syntax
      console.log(origin, getApiQueryUrl("", ""));
      if (getApiQueryUrl("", "").match(origin)) {
        alertAndDisableAutoname("You've removed the permission for \"Sci-Hub X Now!\" to access the doi metadata query service by https://doi.crossref.org." +
          "\nThe auto-naming feature will now be disabled but other functionality" + (autodownload ? " (including auto-downloading) " : " ") + "will continue to work." +
          "\nYou may re-enable auto-naming at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-name downloaded pdf's\" checkbox.");
      }
      if (sciHubUrl.match(origin)) {
        alertAndDisableDownload("You've removed the permission for \"Sci-Hub X Now!\" to access the sci hub url: `" + sciHubUrl + "`." +
          "\nThe \"auto-download\" and \"auto-check server alive\" features will now be disabled but redirecting doi's to sci-hub will continue to work." +
          "\nYou may re-enable auto-downloading at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-download pdf's\" checkbox.");
      }
    }
    for (const permission of permissions.permissions) {
      if (permission === "downloads") {
        alertAndDisableDownload("You've removed the permission for \"Sci-Hub X Now!\" to automatically download files." +
          "\nThe auto-download feature will now be disabled but redirecting doi's to sci-hub will continue to work." +
          "\nYou may re-enable auto-downloading at any time by going to the options page (right click the extension icon and click \"Options\") then selecting the \"Auto-download pdf's\" checkbox.");
      }
    }
  });
}

export { requestCorsPermissionMetadata, requestCorsPermissionScihub, addListeners };
