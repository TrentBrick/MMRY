/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
//'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

  //require the scripts that I am connecting to this::: ----------------------------------------
  var algo = require('./algo.js');

  //weird promise line...
  require('es6-promise').polyfill();

 // FIREBASE SCRIPT
var admin = require("firebase-admin");
var serviceAccount = require(" FIREBASE ADMIN JSON ");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: #firebase URL here. 
});

// set up unlimited access to the Firebase database.
var db = admin.database();
var ref = db.ref("restricted_access/secret_document");
ref.once("value", function(snapshot) {
  console.log(snapshot.val());
});

//check at 9am every morning for people to test their cards.
var nerdGifs = ["https://media.giphy.com/media/3oKIPyqTWsP720AOXe/giphy.gif", "https://media.giphy.com/media/yODVOeMxWBwBO/giphy.gif", "https://media.giphy.com/media/2wuWbwdFQlgkM/giphy.gif", "https://media.giphy.com/media/D0EjguuQzYr9m/giphy.gif", "https://media.giphy.com/media/GI0l8rHpXHANq/giphy.gif", "https://media.giphy.com/media/l41m04gr7tRet7Uas/giphy.gif", "https://media.giphy.com/media/OQsa4Yca9BJFS/giphy.gif", "https://media.giphy.com/media/ULHclikJ78DZe/giphy.gif"];
var tempTestUser = [];

var schedule = require('node-schedule');
/*
var j = schedule.scheduleJob('27 9 * * *', function(){
  console.log('MY CHRON SCHEDULER IS RUNNINGG!!!');
  harrassUser();
});
var j = schedule.scheduleJob('14 20 * * *', function(){
  console.log('MY CHRON SCHEDULER IS RUNNINGG!!!');
  harrassUser();
});
*/
function harrassUser() {
  //will run through to see if the user has any overdue cards
  var ref = db.ref('server/');
  ref.once("value", function(snapshot) {
    var p = new Promise(function(resolve, reject) {
      if (snapshot != null) {
        resolve('success');
      }
      else {
        reject('failure');
      }
    });
    p.then(function(){
      var allUsers = snapshot.val();
      var userNames = Object.keys(allUsers);
      //run through all cards to see how many need to be tested. I must do this per category
      for (user in userNames) {
        var u = userNames[user];
        tempTestUser.push(u);
        sendTextMessage(u, "1. Hey you, its time to learn because there are some overdue cards that you need to test yourself on!");
        //maybe I should send a gif here?
        var randNerdGif = nerdGifs[Math.floor(Math.random()*nerdGifs.length)];
        var str = "2. You have:\n";
        var userCats = Object.keys(allUsers[u]);
        for (i in userCats) {
          cat = userCats[i];
          var numCardsToTest = algo.cardQuizCount(allUsers[u][cat]);
          if (numCardsToTest == 0) {
            str = str + "No overdue cards in the -" + cat +"- category. \n";
          }
          else { str = str +numCardsToTest+" overdue cards in the -" + cat +"- category. \n";
          }
        }
        sendTextMessage(u, str);
        sendGifMessage(u, randNerdGif);
        //sendQuickReplyTest(u, "What category would you like to be tested on?");
    }

    }).catch(function() {
      console.log("oops, snapshot not stored for testing how many cards are overdue apparently...");
    })
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });

}

function testOnceGifSent() {
  for (i in tempTestUser) {
  sendTextMessage(tempTestUser[i], "Why dont we get started testing you right now!");
  sendQuickReplyTest(tempTestUser[i], "What category would you like to be tested on?");
  console.log("SHOULD HAVE RUN THE TESTER!!!!");
  tempTestUser.splice(i, 1);
  }
}


// Initialize the default app
//var defaultApp = admin.initializeApp(defaultAppConfig);

//console.log(defaultApp.name);  // "[DEFAULT]"

// Retrieve services via the defaultApp variable...
//var defaultAuth = defaultApp.auth();
//var defaultDatabase = defaultApp.database();

//  END OF FIREBASE SCRIPT

var app = express();
app.set('port', process.env.PORT || 8080);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}
/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL.
 *
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will
  // be passed to the Account Linking callback.
  var authCode = "AUTHORIZATION CODE";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/* THIS IS WHAT MATTERS -------------------------------------------------------------------------------------------------------------------
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */

var makingCard = [];
var waitingGuess = [];
var waitingRank = [];
var currCard = {};
var cardInd = {};
var cardMax = {};
var allCards = {};
var currPayload = {};
var cardNames = [];
var cleanSendWait = [];
var cleanSendDict ={};

//I need to load in more instant access decks.
var loadableDecks = ["English_Vocab"];
var loadingDeck = [];

var db = admin.database();
var ref = db.ref("server/");

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    if (typeof(metadata) != 'undefined'){
      if (metadata.indexOf("cleanMsg") > -1) {
        console.log("contains cleanMSG!!");
        sender = metadata.split(" ")[1];
        if (typeof(cleanSendDict[sender]) != 'undefined' && cleanSendDict[sender].length !==0){
          sendTextMessage(sender, cleanSendDict[sender].shift(), "cleanMsg "+sender);
        }
      }
    }
//not getting the address of user to send this to!!!
    else if(messageAttachments && messageAttachments[0].payload.url.indexOf("gif") > -1) {
      testOnceGifSent();
      return;
    }
    else {console.log("Received echo for message %s and app %d with metadata %s",
      messageId, appId, metadata);
    return;
  }
  } else if (quickReply) {

    if(loadingDeck.indexOf(senderID) > -1) {
      var quickReplyPayload = quickReply.payload;
      console.log("Quick reply for message %s with payload %s",
        messageId, quickReplyPayload);
      sendTextMessage(senderID, "Going to load the deck: " + quickReplyPayload);
      loadDeck(senderID, quickReplyPayload);
      //remove the user from the loadingDeck waitlist.
      removeSender(senderID, loadingDeck);
      console.log("values inside loading deck LOOOOOOKKKK AAAAAAAAAATTTTTTTT THHHHISSSSSSS::: ",loadingDeck);
    }
    else {
      var quickReplyPayload = quickReply.payload;
      if (quickReplyPayload == "Not Now") {
        sendTextMessage(senderID, "No worries. Be sure to come back and get tested later!");
        return;
      }
      else {
      console.log("Quick reply for message %s with payload %s",
        messageId, quickReplyPayload);
        currPayload[senderID] = quickReplyPayload;
      cleanSend(senderID, ["Going to test cards in the category: " + quickReplyPayload]);
      setCardsToTest(senderID,quickReplyPayload);
      //testUser(senderID, quickReplyPayload);
      return;
      }
    }
  }
  else {
  //else{sendTypingOn(senderID);}
  if(!messageText) {
    messageText = "lol";
  }

  if(messageText== 'image') {
    sendImageMessage(senderID);
    messageText = "lol";
    return;
  }

  if( messageText== 'gif') {
    sendGifMessage(senderID, "https://media.giphy.com/media/NWlBEcDW5evFS/giphy.gif");
    messageText = "lol";
    return;
  }

  if(messageText.toLowerCase() == "reset") {
    resetBot(senderID);
    sendTextMessage(senderID, "resetting for you xoxox");
  }

  if(messageText.toLowerCase() == "help") {
    messages = [];
    messages.push("I'm happy to help. Here is the order in which cards will be tested: \n" +
    "a. Front of card will be displayed. \n b. A guess from you will be expected." +
    "\n c. The back of the card will be displayed. \n d. A ranking from 0-5 on how well you knew the info will be expected.");
    messages.push("After each word please grade yourself as follows:\n" +
      "(0) What the heck was that? (No recognition)\n" +
      "(1) Wrong answer, but recognized the word.\n" +
      "(2) Wrong answer, but it was on the tip of my tongue!\n" +
      "(3) Got it right, but just barely.\n" +
      "(4) Got it right, had to think about it.\n" +
      "(5) Knew the answer immediately.");

    messages.push("Here are all of the keywords and what they do:\n" +
    "\"load deck\" - initialises a process for premade card decks to be loaded into your portfolio.");

    messages.push("\"make card\"- generates a new card. You must call this command and then in your next message have" +
    "-- category:<name of the category you want it in> front: <front of card info> back: <back of card info> .\n\n" +
    "\"test me\" - will test you on all of your overdue cards in a category you select.");
    messages.push("\"discard\" - say this if you want the card currently being tested to be permenently deleted for good. \n\n" +
    "\"stop\" - ends the current test and saves your progress during this session so you can come back again later. \n\n" +
    "\"reset\" - resets the variables behind your conversation with me, your best friend.");
    cleanSend(senderID, messages);
    return;
}

  if(messageText.toLowerCase() == "stop") {
    messages = [];
    messages.push("Okay, going to save your cards and stop testing you");
    messages.push("Please come back again soon. You still have untested cards to complete!");
    cleanSend(senderID, messages);
    //need to make sure that it doesnt print the next back card
    removeSender(senderID, waitingGuess);
    cardInd[senderID] = cardMax[senderID];
    incrementCard(senderID);
    return;
  }
  //making card is true if the previous message was to make a card.
  if(makingCard.indexOf(senderID) > -1 && messageText) {
    //split the messageText up which should be in the format
    //front: blah back: blah
    var pText = messageText.split(":");
    var category = pText[1];
    category = category.substring(0,category.length -5);
    category = category.trim();
    var front = pText[2];
    front = front.substring(0,front.length -4);
    var back = pText[3];

    sendTextMessage(senderID, "The category of the card is::: " + category+ " . Front of the card is::: " + front + ". Back of the card is::: " + back);
    // need to get around to adding in card making confirmation.
    var ref = db.ref("server/");
    var senderRef = ref.child(senderID);
    var categoryRef = senderRef.child(category.toLowerCase());
    var newCardRef = categoryRef.push().set({
        front: front.trim(),
        back: back.trim()
    });
    removeSender(senderID, makingCard);
  }

  else if(waitingGuess.indexOf(senderID) > -1 && messageText) {
    removeSender(senderID, waitingGuess);
    console.log("waitingguess, list LOOOOK AT THISSSSSS:::  ", waitingGuess);
    if(messageText.toLowerCase() == "discard"){
      discardCard(senderID);

    }
    else {
      sendTextMessage(senderID, currCard[senderID].back);
      waitingRank.push(senderID);
    }

  }

  else if(waitingRank.indexOf(senderID) > -1 && messageText) {
    //this following code changes the rank of the card.
    //remove the senderID from the global index so that we know this sender is no longer waiting
    removeSender(senderID, waitingRank);

    if(messageText.toLowerCase() == "discard"){
      discardCard(senderID);
    }
    else {
      var rank = parseInt(messageText);

      if (rank >= 0 && rank <= 5) {
        //console.log("card before rank update:: ", currCard);
        currCard[senderID] = algo.calcIntervalEF(currCard[senderID], rank);
        //update the current card to the card collection. at the end of the test this will update back to the database.
        //need to go back one before incrementing occurs.
        var currCardName = cardNames[cardInd[senderID]-1];
        //here I should be updating the card in firebase

        // I do not need this line, doesnt matter if the old data base is updated allCards[senderID][currCardName] = currCard[senderID];

        var cardDeckRef = db.ref("server/"+senderID+"/"+currPayload[senderID]+"/"+currCardName);

        var p = new Promise(function(resolve) {
            cardDeckRef.set(currCard[senderID]);
            resolve();
        });

        p.then(function() {
          console.log("this is executing after the specific card has been Set!!");
          incrementCard(senderID);
          //resetBot(senderID);
          //cardInd[senderID] = 0;
        });
        p.catch(function(error) {
          console.log("there is an error with resaving the tested cards");
        });


      }
      //this is if the entry is not a number 0-5
      else { //Bad input
        sendTextMessage(senderID, "Please enter between 0-5 for the card...");
        waitingRank.push(senderID);
      }
    }
  }

  else if (messageText) {
    // If we receive a text message, check to see if it matches any special ------------------------------------------------------
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText.toLowerCase()) {

      case 'make card':
        console.log("Trying to make a flash card!");
        var messageT = "Ready to make Card:";
        sendTextMessage(senderID, messageT);
        makingCard.push(senderID);
        break;

      case 'test me':
          console.log("Trying to test the user!");
          var messageT = "What category would you like to be tested on?";
          sendQuickReplyTest(senderID, messageT);
          // calls QuickReply which gives users options. when option is selected this message is recieved with an
          //if statement. this is stored as the Payload and then calls the 'testUser'
          break;

      case 'load deck':
        console.log("Trying to make a flash card!");
        //needs to query what type of deck to load in first.
        sendQuickReplyLoad(recipientID, "What deck would you like to load in?", senderID);
        loadingDeck.push(senderID);
        break;

      default:
        console.log("this is trying to echo back");
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}
}

function removeSender(senderID, arr) {
  var ind = arr.indexOf(senderID);
  arr.splice(ind,1);
}

function sendQuickReplyLoad(recipientId, quest, senderID) {
  //need to access the available categories
      console.log("Quick Reply with loadableDecks is running");
      var quickRep = [];

      for (key in loadableDecks) {
        //need to get the value from the array for each
        var temp = {
          "content_type":"text",
          "title":loadableDecks[key],
          "payload":loadableDecks[key]
        };
        quickRep.push(temp);
      }

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          text: quest,
          quick_replies: quickRep
        }
      };
      callSendAPI(messageData);
  }

function loadDeck(senderID, quickReplyPayload) {
//English_Vocab
var file = quickReplyPayload + ".json";
fs=require("fs");
var content=fs.readFileSync(file, "utf8");
var obj = JSON.parse(content);
//here I am taking the file that is stored on the server and loading it into an object to then store in firebase.
var ref = db.ref("server/"+senderID+"/"+quickReplyPayload);
ref.set(obj);

sendTextMessage(senderID, "New deck created for you!");

console.log("a new deck HAS BEEN SET!!!");
}

function cleanSend(senderID, messagesToSend) {
  //treat messagesToSend as a queue of messages
  sendTextMessage(senderID, messagesToSend.shift(), "cleanMsg "+senderID);
  cleanSendWait.push(senderID);
  cleanSendDict[senderID] = messagesToSend;
}

function discardCard(senderID) {
  currCard[senderID] = null;
  var currCardName = cardNames[cardInd[senderID]-1];
  console.log("Discarding the card: ");
  allCards[senderID][currCardName] = null;
  incrementCard(senderID);
}

function setCardsToTest(senderID,payload) {
  var ref = db.ref('server/'+senderID+'/'+currPayload[senderID]);
  ref.once("value", function(snapshot) {
    var p = new Promise(function(resolve, reject) {
      if (snapshot !== null) {
        resolve('success');
      }
      else {
        reject('failure');
      }
    });
    p.then(function(){
      allCards[senderID] = snapshot.val();
      console.log ("this is the snapshot stored in allCards", allCards[senderID]);

//gets the number of objects contained inside all cards.
      Object.size = function(obj) {
            var size = 0, key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) size++;
            }
            return size;
        };
        //store in tempCards so it is more efficient, dont have to reference the dictionary for every step
      var tempAllCards = allCards[senderID];

      // Get the size of an object
      cardMax[senderID] = Object.size(tempAllCards);
      cardInd[senderID] = 0;
      console.log("card Max value is: " +cardMax[senderID]);

      //find out what the number of cards that I will be tested on is. use cardQuizCount.
      var numCardsToTest = algo.cardQuizCount(tempAllCards);

      if (numCardsToTest === 0) {
        sendTextMessage(senderID, "Nevermind, no new cards to test for today.");
        resetBot(senderID);
        return;
      }

      sendTextMessage(senderID, "You are going to be tested on " + numCardsToTest + " cards");

      //assign an index to all of the allCards values.
      cardNames = [];
      var i = 0;
      for (var o in tempAllCards) {
        cardNames.push(o);
        //console.log(cardNames[i]);
        i++;
      }

      incrementCard(senderID);

    }).catch(function() {
      console.log("oops, snapshot not stored in allCards apparently...");
    });
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
}

function incrementCard(senderID) {
  console.log("trying to increment cards and test the first one. ");
  var currCardInd = cardInd[senderID];
  console.log(currCardInd + "    " + cardMax[senderID]);
  if (currCardInd < cardMax[senderID]) {

    if ((currCardInd+1)%50 === 0) {
      sendTextMessage(senderID, "Congrats on doing so many cards! You have tested a total of:", currCardInd+1);
    }
    var currCardName = cardNames[currCardInd];
    currCard[senderID] = allCards[senderID][currCardName];
    console.log("current card is:::, ", currCard[senderID]);
    //console.log("the type of this card is " + typeof currCard);
    var t = new Date();
    var today = t.getTime();
//wanted to assign to a temporary variable to not have to access the dictionary as much
    var card = currCard[senderID];
    //test if this specific card needs to be tested or not. and add values to it.
    if (!card.nextDate) { card.nextDate = today; }
    if (!card.prevDate) { card.prevDate = today; }
    if (!card.interval) { card.interval = 0; }
    if (!card.reps) {  card.reps = 0; }
    if (!card.EF) { card.EF = 2.5; }

    var nextDate = new Date(card.nextDate); //convert to comparable date type
    currCard[senderID] = card;

    if (nextDate <= today) {
      sendTextMessage(senderID, currCard[senderID].front);
      waitingGuess.push(senderID);
      //resave the currCard back into the global dictionary
      currCardInd++;
      cardInd[senderID] = currCardInd;
    } else {
      currCardInd++;
      cardInd[senderID] = currCardInd;
      incrementCard(senderID);
    }
  }

}
/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 *
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 *
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

/*
 * Send a text message using the Send API.
 * SENDS A TEXT MESSAGE -------------------------------------------------------------
 */
function sendTextMessage(recipientId, messageText, metaD) {
  //sendTypingOff(recipientId);
  if (typeof(metaD)==='undefined') metaD = "default";

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: metaD
    }
  };

  callSendAPI(messageData);
}


/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

//this has been given up to the testing cards function. I have made a new one for loading Decks
function sendQuickReplyTest(senderID, quest) {
  //need to access the available categories
  var categoriesData = null;
  var ref = db.ref('server/'+senderID);
  ref.once("value", function(snapshot) {
    var p = new Promise(function(resolve, reject) {
      if (snapshot !== null) {
        resolve('success');
      }
      else {
        reject('failure');
      }
    });
    p.then(function(){
      categoriesData = snapshot.val();
      console.log ("QUICKREPLYTEST IS RUNNING!!!!");

      cats = Object.keys(categoriesData);
      console.log("Quick Reply with categoriesData is running");
      var quickRep = [];

      cats.forEach(function(cat) {
        var temp = {
          "content_type":"text",
          "title":cat,
          "payload":cat
        };
        quickRep.push(temp);
      });

      var cancel = {
        "content_type":"text",
        "title":"Not Now",
        "payload":"Not Now"
      };
      quickRep.push(cancel);

      var messageData = {
        recipient: {
          id: senderID
        },
        message: {
          text: quest,
          quick_replies: quickRep
        }
      };
      callSendAPI(messageData);

    }).catch(function() {
      console.log("oops, snapshot not stored in allCards");
      sendTextMessage(senderID, "It looks like we dont have any decks currently loaded to test you on! Try the command \"load deck\".");
    });
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });

}

function resetBot(senderID) {
  removeSender(senderID, makingCard);
  removeSender(senderID, waitingGuess);
  removeSender(senderID, waitingRank);
  //remove the potentially very large object size from allCards[senderID]
  delete allCards[senderID];
}

function sendGifMessage(recipientId, gifLink) {

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: gifLink
        }
      }
    }
  };
  callSendAPI(messageData);
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
