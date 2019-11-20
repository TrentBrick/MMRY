

var fs = require('fs');
var readline = require('readline');

//var cardFile = 'baseCards.json',

function readCardFile(file) {
  var data = String(fs.readFileSync(file));
  return data;
}

var allText = (readCardFile("./Heuristics_&_Biases.txt"));
var lines = allText.split("\n");

lines.forEach(function(element)){
  
}

function writeCardFile(cardFile) {
  fs.writeFileSync(cardFile, JSON.stringify(cards, null, 2));
  console.log("\nProgress saved back to file.");
}
