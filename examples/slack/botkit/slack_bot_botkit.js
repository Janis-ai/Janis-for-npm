/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node slack_bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it is running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

require('dotenv').config();

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true,
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();


var janis = require('janis')(process.env.JANIS_API_KEY,process.env.JANIS_CLIENT_KEY, 
                             {platform:'slack', 
                              serverRoot: 'https://devapi.janis.ai',
                              socketServer: 'https://devsocket.janis.ai/'});

// Add the janis middleware 
//controller.middleware.receive.use(janis.receive); 
//controller.middleware.send.use(janis.send);

// Hnadle forwarding the messages sent by a human through your bot
janis.on('chat response', function (message) {
    bot.say(message);
});

// Listens for an intent whereby a user wants to talk to a human
controller.hears(['help', 'operator', 'human'], 'direct_message,direct_mention,mention', function(bot, message) {
    // Forwards request to talk to a human to janis
    janis.assistanceRequested(message);
});

controller.on('interactive_message_callback', function (bot, message) {
    console.log(message)
    janis.hopInAndDetectIntent(message, function(m) {
        if (m.isPaused) { return };
        // Process incoming message
        console.log("message:")
        if (Array.isArray(m)) {
            for (message of m) {
                if (message.reply) {
                    var response = janis.convertFromApiaiResponseToMessage(JSON.parse(message.reply))
                    console.log(response)
                    
                    bot.reply(message, response);
                }
            }
        }
    })

});



// Handle receiving a message
controller.on(['direct_mention','direct_message'],function(bot,message) { 

    janis.hopInAndDetectIntent(message, function(m) {
        if (m.isPaused) { return };
        // Process incoming message
        console.log("message:")
        if (Array.isArray(m)) {
            for (message of m) {
                if (message.reply) {
                    var response = janis.convertFromApiaiResponseToMessage(JSON.parse(message.reply))
                    console.log(response)
                    
                    bot.reply(message, response);
                }
            }
        }
    })

    // log an unknown intent with janis
    //janis.logUnkownIntent(message); 
    //bot.reply(message, 'huh?');
}); 



