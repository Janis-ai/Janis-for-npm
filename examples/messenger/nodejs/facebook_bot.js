/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* jshint node: true, devel: true */
'use strict';

require('dotenv').config();

const
    bodyParser = require('body-parser'),
    crypto = require('crypto'),
    express = require('express'),
    https = require('https'),
    request = require('request');

var app = express();
app.set('port', process.env.PORT || 3210);
app.set('view engine', 'ejs');
app.use(bodyParser.json({
    verify: verifyRequestSignature
}));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = process.env.MESSENGER_APP_SECRET;

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = process.env.MESSENGER_VALIDATION_TOKEN;

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;

// API.AI token
const APIAI_TOKEN = (process.env.APIAI_TOKEN);

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
    console.error("Missing config values");
    process.exit(1);
}
if (APIAI_TOKEN) {
    var apiai = require('apiai');
    var apiaiapp = apiai(APIAI_TOKEN);
}

var janis = require('janis')(process.env.JANIS_API_KEY, process.env.JANIS_CLIENT_KEY, {
    platform: 'messenger',
    useWebhook: true,
    token: PAGE_ACCESS_TOKEN
});


/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/facebook/receive', function(req, res) {
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
app.post('/facebook/receive', function(req, res) {
    var data = req.body;
    console.log(data)
    
    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            if (pageEntry.messaging) {
                pageEntry.messaging.forEach(function(messagingEvent) {
                    if (messagingEvent.message) {
                        receivedMessage(messagingEvent);
                    }
                });
            }
        });
        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've 
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);

    }
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
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to query api.ai with user's text input.
 * 
 */
function receivedMessage(event) {

    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);

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
        console.log("Received echo for message %s and app %d with metadata %s",
            messageId, appId, metadata);
      
        //See: https://developers.facebook.com/docs/messenger-platform/handover-protocol#app_roles
        //This app should be the Primary Receiver. Janis should be a Secondary Receiver.
        //Every time an echo from either Janis or the Page Inbox is received,
        //this app passes control over to Janis so the humans are the only ones who can respond.
        //Janis will pass control back to this app again after 10 minutes of inactivity. 
        //If you want to manually pass back control, use the slash command `/resume` 
        //in the Janis transcript channel, or press "Done" in the Page Inbox on the thread.
        janis.passThreadControl(event);
      

        return;

    } else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        console.log("Quick reply for message %s with payload %s",
            messageId, quickReplyPayload);
        
        //Let's convert the quick-reply payload into text so we can process it as user input
        if (APIAI_TOKEN &&
            (typeof quickReplyPayload === 'string' || quickReplyPayload instanceof String)) {
            //process quick reply payload as user input text with api.ai
            messageText = quickReplyPayload;
        } else {
            sendTextMessage(senderID, "Quick reply tapped");
            return;
        }
    }
    
    if (messageText) {
        if (APIAI_TOKEN) {
            //An example showing how to process user input if you're using API.AI
            receiveMessageWithApiai(messageText, senderID, event);
        } else {
            //An example showing how to process user input if you're not using API.AI
            receivedMessageWithoutNLP(messageText, senderID, event);
        }
    }
}

/*
 * Sends a request to API.AI and processes response
 *
 */
function receiveMessageWithApiai(messageText, senderID, event) {
    var trequest = apiaiapp.textRequest(messageText, {
        sessionId: senderID
    });
    trequest.on('response', function(response) {
      
        var message = janis.convertFromApiaiResponseToMessage(response);
        var messageData = {
            recipient: {
                id: senderID
            },
            message: message
        }
        callSendAPI(messageData);

        if (response.result.action == "human") {
            // send a janis alert to your slack channel
            // that the user could use assistance
            janis.assistanceRequested(event);
        } else if (response.result.action == "input.unknown" ||
            (response.result.metadata.intentId == null && response.result.fulfillment.speech == "")) {
            //associate an action in api.ai with your fallback intents so you can catch them.
            //in this example, "input.unknown" is the action set in api.ai on the Default Fallback Intent.
          
            //capture conversational ‘dead-ends’ 
            //and send janis an alert to your slack channel
            janis.logUnknownIntent(event);
        }
    });
    trequest.on('error', function(error) {
        console.log(error);
        //capture conversational ‘dead-ends’ 
        //and send janis an alert to your slack channel
        janis.logUnkownIntent(event);
        sendTextMessage(senderID, error.message);
    });
    trequest.end();
}

/*
 * A simple example of responding to user input
 *
 */
function receivedMessageWithoutNLP(messageText, senderID, event) {
    // match a greeting intent and send a response,
    if (messageText == "hi" || messageText == "hello") {
        sendTextMessage(senderID, "Hello there.");
    }
    // match an intent to talk to a real human
    else if (messageText == "help" || messageText == "operator") {
        // let the user know that they are being routed to a human
        sendTextMessage(senderID, "Hang tight. Let me see what I can do.");
        // send a janis alert to your slack channel
        // that the user could use assistance
        janis.assistanceRequested(event);
        
    }
    // otherwise log an unknown intent with janis
    else {
        // let the user know that the bot does not understand
        sendTextMessage(senderID, "Sorry, I don't understand.");
        // capture conversational ‘dead-ends’.
        janis.logUnknownIntent(event);
    }
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
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
        qs: {
            access_token: PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {

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

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

module.exports = app;