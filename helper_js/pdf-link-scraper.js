const pdfRegexes = [
  new RegExp(/location\.href\s*=\s*'([^']*?\.pdf)/),
  new RegExp(/embed\s*type\s*=\s*"application\/pdf"\s*src\s*=\s*"([^"]*?\.pdf)/),
  new RegExp(/iframe\s*src\s*=\s*"([^"]*?\.pdf)/)
];

function getPdfDownloadLink(urlRoot, htmlSource) {
  for (let pdfRegex of pdfRegexes) {
    console.log("regex is: ", pdfRegex);
    const foundRegex = htmlSource.match(pdfRegex);
    console.log("foundRegex is: ", foundRegex);
    if (foundRegex) {
      let toReturn = foundRegex[1];
      console.log("toReturn is: ", toReturn);
      if (toReturn.startsWith("//")) { // quirk of sci-hub.st
        console.log("toReturn starts with //");
        toReturn = "https:" + toReturn;
      }
      if (toReturn.startsWith("/")) { // download link is relative to site root
        toReturn = urlRoot + toReturn;
        console.log("toReturn starts with /.  New link is ", toReturn);
      }
      return toReturn;
    }
  }
}

// getPdfDownloadLink(document.body.innerHTML);

export { getPdfDownloadLink };
