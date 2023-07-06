async function httpGetText(theUrl) {
  // TODO(gerry): add a timeout, e.g. via 
  // https://stackoverflow.com/questions/46946380/fetch-api-request-timeout/57888548#57888548
  // https://stackoverflow.com/questions/31061838/how-do-i-cancel-an-http-fetch-request/47250621#47250621
  return fetch(theUrl)
    .then(response => response.text())
    .catch(error => { throw error; });
}

export { httpGetText };
