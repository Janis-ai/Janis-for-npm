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

  Get a Botkit Studio token from Botkit.ai:

    -> https://studio.botkit.ai/

  Run your bot from the command line:

    token=<MY SLACK TOKEN> studio_token=<MY BOTKIT STUDIO TOKEN> node bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
var Botkit = require('botkit');

if (!process.env.token) {
    console.log('Error: Specify a Slack bot token in environment.');
    usage_tip();
    process.exit(1);
}
//
// if (!process.env.studio_token) {
//     console.log('Error: Specify a Botkit Studio token in environment.');
//     usage_tip();
//     process.exit(1);
// }

// Create the Botkit controller, which controls all instances of the bot.
var controller = Botkit.slackbot({
    debug: false,
    retry: 10,
    studio_token: process.env.studio_token
});

// Dashbot is a turnkey analytics platform for bots.
// Sign up for a free key here: https://www.dashbot.io/ to see your bot analytics in real time.
if (process.env.DASHBOT_API_KEY) {
  var dashbot = require('dashbot')(process.env.DASHBOT_API_KEY).slack;
  controller.middleware.receive.use(dashbot.receive);
  controller.middleware.send.use(dashbot.send);
  controller.log.info('Thanks for using Dashbot. Visit https://www.dashbot.io/ to see your bot analytics in real time.');
} else {
  controller.log.info('No DASHBOT_API_KEY specified. For free turnkey analytics for your bot, go to https://www.dashbot.io/ to get your key.');
}

if (process.env.janis_API_KEY && process.env.janis_CLIENT_KEY) {
  var janis = require('janis')(process.env.janis_API_KEY, process.env.janis_CLIENT_KEY, {platform:'slack'});
  // Add the janis middleware 
  controller.middleware.receive.use(janis.receive); 
  controller.middleware.send.use(janis.send);
  // Handle forwarding the messages sent by a human through your bot
  janis.on('chat response', function (message) {
      bot.say(message);
  });
  controller.log.info('Thanks for using janis.');

  // Listens for an intent whereby a user wants to talk to a human
  controller.studio.before('help', function(convo, next) {
      // Forwards request to talk to a human to janis
      janis.assistanceRequested(convo.source_message);
      next();
  });
}

// Spawn a single instance of the bot to connect to your Slack team
// You can extend this bot later to connect to multiple teams.
// Refer to the Botkit docs on Github
var bot = controller.spawn({
    token: process.env.token,
}).startRTM();


var normalizedPath = require("path").join(__dirname, "skills");
require("fs").readdirSync(normalizedPath).forEach(function(file) {
  require("./skills/" + file)(controller);
});


// This captures and evaluates any message sent to the bot as a DM
// or sent to the bot in the form "@bot message" and passes it to
// Botkit Studio to evaluate for trigger words and patterns.
// If a trigger is matched, the conversation will automatically fire!
// You can tie into the execution of the script using the functions
// controller.studio.before, controller.studio.after and controller.studio.validate
if (process.env.studio_token) {
    controller.on('direct_message,direct_mention,mention', function(bot, message) {
        // If your bot is paused, stop it from replying
        if (message.paused) { return };
        controller.studio.runTrigger(bot, message.text, message.user, message.channel).then(function(convo) {
            if (janis && convo == null) {
                // log an unknown intent with janis
                janis.logUnkownIntent(message); 
                bot.reply(message, 'huh?');
            }

        }).catch(function(err) {
            bot.reply(message, 'I experienced an error with a request to Botkit Studio: ' + err);
        });
    });
} else {
    console.log('~~~~~~~~~~');
    console.log('NOTE: Botkit Studio functionality has not been enabled');
    console.log('To enable, pass in a studio_token parameter with a token from https://studio.botkit.ai/');
}

function usage_tip() {
    console.log('~~~~~~~~~~');
    console.log('Botkit Studio Starter Kit');
    console.log('Execute your bot application like this:');
    console.log('token=<MY SLACK TOKEN> studio_token=<MY BOTKIT STUDIO TOKEN> node bot.js');
    console.log('Get a Slack token here: https://my.slack.com/apps/new/A0F7YS25R-bots')
    console.log('Get a Botkit Studio token here: https://studio.botkit.ai/')
    console.log('~~~~~~~~~~');
}

