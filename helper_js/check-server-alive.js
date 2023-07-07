import { doConfirm } from "./browser.js"

function checkServerStatus(url, timeout = 1000) {
  const controller = new AbortController();
  setTimeout(() => { controller.abort() }, timeout);
  fetch(url, { signal: controller.signal })
    .then(() => {
      console.log("CHECK VALID SUCCESS");
    })
    .catch((err) => {
      console.log("CHECK VALID FAILED", err);
      doConfirm("We detected that the mirror " + url + " might be dead." +
        "\nIf the page/pdf actually loaded correctly, then there's no need for action and you may consider going to the options page to disable \"Auto-check sci-hub mirror on each paper request\"." +
        "\nWould you like to go to the options page to select a different mirror or to turn off auto-checking?").then((yesno) => {
          if (yesno) {
            browser.tabs.create({ url: 'chrome://extensions/?options=' + chrome.runtime.id });
          }
        });
    });
}
/************* BEGIN SERVER ALIVE CHECKING CODE ****************** */
let FILES_TO_CHECK = ["favicon.ico", "misc/img/raven_1.png", "pictures/ravenround_hs.gif"]
function checkServerStatusOld(domain) {
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
  // TDOO(gerry): use virtual DOM defined in chrome extension mv3 docs
  // edit: actually this requires additional chrome permissions, so I think it's best to just
  //  request host/CORS permissions for sci-hub.se instead.
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

export { checkServerStatus };
