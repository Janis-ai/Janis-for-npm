// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const path = require('path');
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

const { ActivityTypes } = require('botbuilder');






class MyBot {
    /**
     *
     * @param {ConversationState} conversation state object
     */
    constructor(conversationState, janis) {
        // Creates a new state accessor property.
        // See https://aka.ms/about-bot-state-accessors to learn more about the bot state and state accessors
        this.conversationState = conversationState;
        this.janis = janis;
    }

    normalize(obj) {
        if (obj.conversation && obj.conversation.id) {
            obj.channel = obj.conversation.id;
            obj.client_key = process.env.JANIS_CLIENT_KEY;
            if (obj.from && obj.from.id) {
                obj.user = obj.from.id;
            }
        }
    }

    structureReply(src, resp) {
        var msg = {};
        if (typeof(resp) == 'string') {
            msg.text = resp;
        } else {
            msg = resp;
        }
        msg.channelData = src.channelData;
        msg.channel = src.channel;
        msg.serviceUrl = src.serviceUrl;
        msg.conversation = src.conversation;
        msg.from = src.recipient;
        msg.recipient = src.from;
        return msg;
    };
    
    async processChatResponse(turnContext, message) {
        message.type = "message"
        await turnContext.sendActivity(`${ message.text }`);        
        await this.janis.hopOut(message)
    }

    async respond(isPaused, message, elements, turnContext) {
        if (isPaused) {
            return Promise.resolve(false)
        };
        for (var i = 0; i < elements.length; i++) {
            var obj = elements[i]
            obj = this.structureReply(message, obj);

            obj.channel = message.channel;
            obj.metadata = {
                "bot": "janis"
            };
            if (obj.quick_replies) {
                obj.metadata.quick_replies = obj.quick_replies;
            }
            await turnContext.sendActivity(`${ obj.text }`);
            await this.janis.hopOut(obj)
        }
    }

    /**
     *
     * Use onTurn to handle an incoming activity, received from a user, process it, and reply as needed
     *
     * @param {TurnContext} on turn context object.
     */
    async onTurn(turnContext, message) {
        // Handle message activity type. User's responses via text or speech or card interactions flow back to the bot as Message activity.
        // Message activities may contain text, speech, interactive cards, and binary or unknown attachments.
        // see https://aka.ms/about-bot-activity-message to learn more about the message and other activity types
        if (turnContext.activity.type === ActivityTypes.Message) {
            this.normalize(message)
            let isBotPaused = await this.janis.hopIn(message)
            // If your bot is paused, stop it from replying
            if (isBotPaused) { return };
            if (message.text == "help") {
                // send a Janis alert to your slack channel
                // that the user could use assistance                      
                await this.janis.assistanceRequested(message);
            }
            //array of responses
            var responses = ["yeah!"]
            await this.respond(isBotPaused, message, responses, turnContext);          
        } else {
            // Generic handler for all other activity types.
            await turnContext.sendActivity(`[${ turnContext.activity.type } event detected]`);
        }
        // Save state changes
        await this.conversationState.saveChanges(turnContext);
    }
}



exports.MyBot = MyBot;
