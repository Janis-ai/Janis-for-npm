'use strict';

var rp = require('request-promise-native');
var dashbot
if (process.env.DASHBOT_API_KEY) {
    dashbot = require('dashbot')(process.env.DASHBOT_API_KEY).universal;
}

var checkIfString = function(myVar) {
    return (typeof myVar === 'string' || myVar instanceof String)
}

function janisBot(apikey, clientkey, config) {
    var that = Object;
    that.apikey = apikey;
    that.clientkey = clientkey;

    that.debug = config.debug || false;
    that.serverRoot = config.serverRoot || 'https://api.janis.ai';
    that.controller = config.controller;
    that.platform = config.platform || 'messenger';
    that.platform = that.platform.toLowerCase();
    that.socketServer = config.socketServer || 'https://wordhop-socket-server.herokuapp.com';
    that.token = config.token || '';
    that.useWebhook = config.useWebhook || false;
    that.path = config.path || '/api/v1/';
    that.janisAppId = config.janisAppId || 1242623579085955;

    that.normalize = function(msg) {
        var message = msg;
        if (message.entry) {
          if (message.entry[0].messaging) {
            var facebook_message = message.entry[0].messaging[0];
            if (facebook_message.message || facebook_message.postback) {
              return true;
            }
          }
        }
        if (message.postback) {
            return true;
        }
        if (message.ok && message.message) {
          message.message.channel = message.channel;
          message = message.message;
        }
        else if (msg.message) {
            if  (!checkIfString(msg.message)) {
                message = msg.message;
            } else {
                if (msg.text === null) {
                    msg.text = msg.message;
                }
                delete msg.message;
            }
        }
        if  (msg.sourceEvent) {
            var slackMessage = msg.sourceEvent.SlackMessage;
            if (slackMessage) {
                message = slackMessage;
            } else if (msg.source == "facebook") {
                if (msg.sourceEvent.message) {
                    return true;
                }
            }
        }
        if (message.text == null) {
            message.text = "";
        }
        return message;
    }
    
    
    that.checkIfMessage = function(msg) {
        var message = that.normalize(msg)
        
        if ((message.type == 'direct_message' || message.type === 'direct_mention' || message.type == 'user_message' || message.type == 'message' || 
            message.type == 'facebook_postback' || message.type == null || message.page) &&
            message.transcript == null &&
            (message.subtype == null || message.subtype == "file_share") &&
            message.hasOwnProperty("reply_to") == false &&
            message.is_echo == null &&
            (message.text.length > 0 || message.attachments != null || message.attachment != null || message.fulfillmentMessages != null)) {
            return true;
        } else {
            return false;
        }
    }

    that.getClientKey = function(message) {
        var key = that.clientkey;
        if (message.client_key) {
            key = message.client_key;
        }
        return key;
    }

    that.logUnknownIntent = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.reject();
        }
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'unknown',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apikey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message),
                'failure': true,
                'type':'unknown'
            },
            json: message
        };
        if (that.token != "") {
            data.headers.token = that.token;
        }
        return rp(data)
        .then(function (obj) {
            return obj;
        })
        .catch(function (err) {
            return err;
        });
    }

    that.assistanceRequested = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.reject();
        }
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'human',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apikey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message)
            },
            json: message
        };
        if (that.token != "") {
            data.headers.token = that.token;
        }
        return rp(data)
        .then(function (obj) {
            return obj;
        })
        .catch(function (err) {
            return err;
        });
    }

    that.hopIn = function(message, reply, detectIntent) {
        if (that.checkIfMessage(message) == false) { 
            return Promise.reject();
        }
        if (dashbot) {
            var dashbotMsg = {text: message.text, userId: message.channel, "dashbot_timestamp": message.ts*1000}
            if (message.reply) {
                var response = JSON.parse(message.reply)
                if (response && response.result && response.result.metadata && response.result.metadata.intentName) {
                    dashbotMsg.intent = {name: response.result.metadata.intentName, inputs: []};
                    for (var k in response.result.parameters) {
                        var input = {name: k, value: response.result.parameters[k]}
                        dashbotMsg.intent.inputs.push(input)
                    }
                }
            }
                
            
            dashbot.logIncoming(dashbotMsg);

        }
        
        
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'in',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apikey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message),
                'type':'in'
            },
            json: message
        };
        if (detectIntent) {
            data.headers.detectIntent = true;
        }
        if (that.useWebhook === false) {
            data.headers.socket_id  = that.getSocketId();
        }
        if (reply) {
            data.json.reply  = reply;
        }
        if (that.token != "") {
            data.headers.token = that.token;
        }
        return rp(data)
        .then(function (obj) {
            return obj;
        })
        .catch(function (err) {
            return err;
        });
    }

    that.hopOut = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.reject();
        }
        if (dashbot) {
            var msg = that.normalize(message)
            var dashbotMsg = {text: msg.text, userId: msg.channel, "dashbot_timestamp": msg.ts*1000}
            dashbot.logOutgoing(dashbotMsg);
        }
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'out',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apikey,
                'platform': that.platform,
                'clientkey': that.getClientKey(message),
                'type':'out'
            },
            json: message
        };
        if (that.useWebhook === false) {
            data.headers.socket_id  = that.getSocketId();
        }
        if (that.token != "") {
            data.headers.token = that.token;
        }
        return rp(data)
        .then(function (obj) {
            return obj;
        })
        .catch(function (err) {
            return err;
        });
    }
    
    that.checkForPaused = function(msg, cb) {
        var channel;
        if  (typeof(msg) == 'string') {
            channel = msg;
        } else if (msg.channel) {
            channel = msg.channel; 
        } else if (msg.message.is_echo) {
            var obj = {paused: false};
            if (cb) {
                cb(obj);
            } 
            return Promise.resolve(obj);
        } else {
            try {
                channel = msg.sender.id;
            } catch (e) {
                var obj = {paused: false};
                if (cb) {
                    cb(obj);
                } 
                return Promise.resolve(obj);
            }
        }

            
        var headers = {
                        'content-type': 'application/json',
                        'apikey': that.apikey,
                        'clientkey': that.clientkey,
                        'type': 'paused_check'
                    };
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'channel_state',
            headers: headers,
            json: {"channel": channel}
        };
        return rp(data)
        .then(function (obj) {
            if (cb) {
                cb(obj);
            } 
            return obj;
        })
        .catch(function (err) {
            if (cb) {
                cb({paused: false});
            } 
            return {paused: false};
        });
    }

    that.getPausedChannels = function(cb) {
        var headers = {
                        'content-type': 'application/json',
                        'apikey': that.apikey,
                        'clientkey': that.clientkey,
                        'type': 'paused_check'
                    };
        var data = {
            method: 'GET',
            url: that.serverRoot + that.path + 'channels/paused',
            headers: headers
        };
        return rp(data)
        .then(function (body) {
            var obj = JSON.parse(body);
            if (cb) {
                cb(obj);
            } 
            return obj;
        })
        .catch(function (err) {
            if (cb) {
                cb(false);
            } 
            return err;
        });
    }

    that.pauseChannel = function(channel_id, minutes, cb) {
        var headers = {
            'content-type': 'application/json',
            'apikey': that.apikey,
            'clientkey': that.clientkey,
            'type': 'paused_channel'
        };

        var url = that.serverRoot + that.path + "update_channel";
        var data = {
            method: 'POST',
            url: url,
            json: {
                'channel_id': channel_id,
                'paused': true,
                'is_archived': false,
                'minutes': minutes
            },
            headers: headers
        };
        return rp(data)
        .then(function (obj) {
            if (cb) {
                cb(obj);
            } 
            return obj;
        })
        .catch(function (err) {
            if (cb) {
                cb(false);
            } 
            return err;
        });
    }

    that.passThreadControl = function(event, cb) {

        var message = event.message;
        var recipientID = message.page ? message.page : event.recipient.id;
        var isEcho = message.is_echo;
        var appId = message.app_id;

        //If an agent responds via the Messenger Inbox, then `appId` will be null.
        //If an agent responds from Janis on Slack, the `appId` will be 1242623579085955.
        //In both cases, we should pause your bot by giving the thread control to Janis.
        //Janis will pass control back to your app again after 10 minutes of inactivity. 
        //If you want to manually pass back control, use the slash command `/resume` 
        //in the Janis transcript channel, or press "Done" in the Page Inbox on the thread.

        //See: https://developers.facebook.com/docs/messenger-platform/handover-protocol#app_roles
        //This app should be the Primary Receiver. Janis should be a Secondary Receiver.
        //Every time an echo from either Janis or the Page Inbox is received,
        //this app passes control over to Janis so the humans are the only ones who can respond.            

        if (isEcho && (appId == that.janisAppId || appId == null)) {
          
            var data = {
                uri: 'https://graph.facebook.com/v3.0/me/pass_thread_control',
                qs: {
                    access_token: that.token
                },
                method: 'POST',
                json: {
                    "recipient": {
                        "id": recipientID
                    },
                    "target_app_id": that.janisAppId,
                    "metadata": "passing thread"
                }
            }
            return rp(data)
            .then(function (obj) {
                if (cb) {
                    cb(obj);
                } 
                return obj;
            })
            .catch(function (err) {
                if (cb) {
                    cb(false);
                } 
                return err;
            });
        }
        if (cb) {
            cb("message not from janis");
        }
        return Promise.resolve("message not from janis");      
    }

    if (that.useWebhook) {
        return that;
    }

    var io = require('socket.io-client');
    var socket = io.connect(that.socketServer);
    that.socket = socket;
    that.emit = function(event, message) {
        socket.emit(event, message);
    }

    socket.on('connect', function (message) {  
        that.trigger('connect');
    });

    socket.on('socket_id_set', function (socket_id) {
        that.setSocketId(socket_id);
        var data = {
            method: 'POST',
            url: that.serverRoot + that.path + 'update_bot_socket_id',
            headers: {
                'content-type': 'application/json',
                'apikey': that.apikey,
                'clientkey': that.clientkey,         
                'type': 'connect'
            },
            json: {'socket_id': socket_id}
        };
        that.trigger('socket_id_set');
        rp(data);
    });

    socket.on('chat response', function (msg) {
        var event = 'chat response';
        that.trigger(event, [msg]);
    });

    socket.on('user typing', function (msg) {
        var event = 'user typing';
        that.trigger(event, [msg]);
    });
    
    socket.on('channel update', function (msg) {
        var event = 'channel update';
        that.trigger(event, [msg]);
    });

    socket.on('incoming', function (msg) {
        var event = 'incoming';
        that.trigger(event, [msg]);
    });

    that.events = {};

    that.trigger = function(event, data) {
         if (that.debug) {
            console.log('handler:', event);
        }
        if (that.events[event]) {
            for (var e = 0; e < that.events[event].length; e++) {
                
                var res = that.events[event][e].apply(that, data);
                if (res === false) {
                    return;
                }
            }
        } else if (that.debug) {
            console.log('No handler for', event);
        }
    };

    that.on = function(event, cb) {
        var events = (typeof(event) == 'string') ? event.split(/\,/g) : event;
        for (var e in events) {
            if (!that.events[events[e]]) {
                that.events[events[e]] = [];
            }
            that.events[events[e]].push(cb);
        }
        return that;
    };

    that.getSocketId = function () {
        return that.socketId;
    }

    that.setSocketId = function(socketId) {
        that.socketId = socketId;
    }

    return that;
}


function janisBotFacebook(janisbot) {
    var that = this;
    that.controller = janisbot.controller;
    if (that.controller) {
        that.controller.on('message_received', function(bot, message) {
            janisbot.logUnknownIntent(message);
        });
    }

    // botkit middleware endpoints
    that.send = function(bot, message, next) {
        that.hopOut(message);
        next();   
    };

    that.receive = function(bot, message, next) {
        that.hopIn(message, function(msg) {
            next();
        });
    };

    return that;
}


function janisBotMicrosoft(janisbot) {
    var that = this;
    that.controller = janisbot.controller;
    if (that.controller) {
        that.controller.on('message_received', function(bot, message) {
            janisbot.logUnknownIntent(message);
        });
    }

    // botkit middleware endpoints
    that.send = function(bot, message, next) {
        that.hopOut(message);
        next();   
    };

    that.receive = function(bot, message, next) {
        that.hopIn(message, function(msg) {
            next();
        });
    };
    return that;
}

function janisBotSlack(janisbot) {
    var that = this;
    that.controller = janisbot.controller;
    
    // botkit middleware endpoints
    that.send = function(bot, message, next) {
        if (message.user == null) {
            message.user = bot.identity.id;
        }
        that.hopOut(message);
        next();
    };

    // botkit middleware endpoints
    that.receive = function(bot, message, next) {  
        var msg = that.modifiedMessage(JSON.parse(JSON.stringify(message)), bot);
        
        that.hopIn(msg)
        .then(function (isPaused) {
            message.paused = isPaused;
            next();
        });
        
    };

    that.modifiedMessage = function(message, bot) {
        if ('message' == message.type) {
            var mentionSyntax = '<@' + bot.identity.id + '(\\|' + bot.identity.name.replace('.', '\\.') + ')?>';
            var mention = new RegExp(mentionSyntax, 'i');
            var direct_mention = new RegExp('^' + mentionSyntax, 'i');
            if (message.text) {
                message.text = message.text.trim();
            }
            if (message.channel.match(/^D/)) {
                // this is a direct message
                if (message.user == bot.identity.id) {
                    return message;
                }
                if (!message.text) {
                    // message without text is probably an edit
                    return message;
                }
                // remove direct mention so the handler doesn't have to deal with it
                message.text = message.text.replace(direct_mention, '')
                .replace(/^\s+/, '').replace(/^\:\s+/, '').replace(/^\s+/, '');
                message.event = 'direct_message';
                return message;
            } else {
                if (message.user == bot.identity.id) {
                    return message;
                }
                if (!message.text) {
                    // message without text is probably an edit
                    return message;
                }
                if (message.text.match(direct_mention)) {
                    // this is a direct mention
                    message.text = message.text.replace(direct_mention, '')
                    .replace(/^\s+/, '').replace(/^\:\s+/, '').replace(/^\s+/, '');
                    message.event = 'direct_mention';
                    return message;
                } else if (message.text.match(mention)) {
                    //message.event = 'mention';
                    return message;
                } else {
                    //message.event = 'ambient';
                    return message;
                }
            }
        }
        return message;
    }
    if (that.controller) {
        // reply to a direct mention
        that.controller.on('direct_mention', function(bot, message) {
            janisbot.logUnknownIntent(message);
        });
        // reply to a direct message
        that.controller.on('direct_message', function(bot, message) {
            janisbot.logUnknownIntent(message);
        });
    }
    return that;
}

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}
    
module.exports = function(apikey, clientkey, config) {

    if (!apikey && !clientkey) {
        throw new Error('YOU MUST SUPPLY AN API_KEY AND A CLIENT_KEY TO janis!');
    }
    if (!apikey) {
        throw new Error('YOU MUST SUPPLY AN API_KEY TO janis!');
    }
    if (!clientkey) {
        throw new Error('YOU MUST SUPPLY A CLIENT_KEY TO janis');
    }

    if (config == null) {
        config = {};
    }

    var janisbot = janisBot(apikey, clientkey, config);
    var platform = janisbot.platform;
    var janisObj;
    if (platform == 'slack') {
        janisObj = new janisBotSlack(janisbot);
    } else if (platform == 'facebook' || platform == 'messenger') {
        platform = "messenger";
        janisObj = new janisBotFacebook(janisbot);
    } else if (platform == 'microsoft') {
        platform = "microsoft";
        janisObj = new janisBotMicrosoft(janisbot);
    } else {
        throw new Error('platform not supported. please set it to be either "slack" or "messenger (alias: facebook)".');
    }
    janisbot.platform = platform;
    if (janisbot.useWebhook === false) {
        janisObj.emit = janisbot.emit;
        janisObj.on = janisbot.on;
        janisObj.getSocketId = janisbot.getSocketId;
    }
    janisObj.checkForPaused = janisbot.checkForPaused;
    janisObj.logUnkownIntent = janisbot.logUnknownIntent;
    janisObj.logUnknownIntent = janisbot.logUnknownIntent;
    janisObj.assistanceRequested = janisbot.assistanceRequested;
    janisObj.getPausedChannels = janisbot.getPausedChannels;
    janisObj.pauseChannel = janisbot.pauseChannel;
    janisObj.socket = janisbot.socket;
    janisObj.passThreadControl = janisbot.passThreadControl;

    

    /*
     * Converts API.AI response into message object and returns it
     *
     */
    janisObj.convertFromApiaiResponseToMessage = function(response) {
        if (response.result.fulfillment.messages != null) {
            var attachments = [];
            var quick_replies = [];

            var text = response.result.fulfillment.speech;
            if (response.result.fulfillment.messages) {
                for (var i = 0; i < response.result.fulfillment.messages.length; i++) {
                    var m = response.result.fulfillment.messages[i];
                    if (m.payload) {
                        var payload = m.payload;
                        if (payload.attachments) {
                            for (var a = 0; a < payload.attachments.length; a++) {
                                attachments.push(payload.attachments[a]);
                            }
                        }
                        if (payload.text) {
                            text = text + "\n" + payload.text;
                        }
                    }
                    if (m.speech) {
                        if (m.speech) {
                            text = m.speech;
                        }
                    } else if (m.replies != null) {
                        for (var r = 0; r < m.replies.length; r++) {
                            var reply = m.replies[r];
                            var callback_id = reply;
                            var action = {
                                "content_type": "text",
                                "title": reply,
                                "payload": callback_id
                            }
                            quick_replies.push(action);
                        }
                    } else if (m.buttons != null) {
                        var actions = [];
                        for (var r = 0; r < m.buttons.length; r++) {
                            var button = m.buttons[r];
                            var callback_id = "generic_callback";
                            if (response.result.action) {
                                callback_id = response.result.action;
                            }
                            var postback = button.text;
                            if (button.postback) {
                                postback = button.postback;
                            }
                            if (button.text) {
                                var action = {
                                    "name": button.text,
                                    "text": button.text,
                                    "type": "button",
                                    "value": postback
                                }
                                actions.push(action);
                            }
                        }
                        var title = "";
                        if (m.title) {
                            title = m.title;
                        }
                        var subtitle = "";
                        if (m.subtitle) {
                            subtitle = m.subtitle;
                        }
                        var attachment = {
                            "mrkdwn_in": ["fields", "text", "pretext"],
                            "text": subtitle,
                            "title": title,
                            "callback_id": callback_id,
                            "attachment_type": "default",
                            "color": "#3AA3E3",
                            "fallback": title,
                            "actions": actions
                        };
                        attachments.push(attachment);
                    } else if (m.imageUrl != null) {
                        var attachment = {
                            "fallback": "image",
                            "title": "",
                            "text": "",
                            "color": "#3AA3E3",
                            "image_url": m.imageUrl
                        }
                        attachments.push(attachment);
                    }
                }
            }
            text = text.replace(/\\n/g, "\n");
            text = text.replace(/\\t/g, "\t");
            var obj = {
                text: text
            };
            if (attachments.length > 0) {
                obj.attachments = attachments;
            }
            if (quick_replies.length > 0) {
                if (janisbot.platform == 'slack') {
                    if (obj.attachments == null) {
                        obj.attachments = []
                    }
                    obj.attachments.push({text: ' ', callback_id: "generic", attachment_type: "default", actions: []})
                    for (var qr of quick_replies) {
                        var action = {"name": qr.title, "text": qr.title, "type": "button", value: qr.title}
                        obj.attachments[obj.attachments.length -1].actions.push(action)
                    }
                } else {
                    obj.quick_replies = quick_replies;
                }
                obj.metadata = '{"quick_replies": ' + JSON.stringify(quick_replies) + '}';
            }
            return obj;
        } else {
            return {text: ""};
        }
    }

    janisObj.hopInAndDetectIntent = function(message, arg1, arg2) {
        var cb;
        var reply;
        if (isFunction(arg1)) {
            cb = arg1;
        } else {
            reply = arg1;
            cb = arg2;
        }
        return janisbot.hopIn(message, reply, true)
        .then(function (obj) {
            
            if (cb) {
                cb(obj);
            }
            return Promise.resolve(obj);
        })
        .catch(function (err) {
            if (cb) {
                cb(false);
            } 
            return Promise.reject(err);
        });
    };

    janisObj.hopIn = function(message, arg1, arg2) {
        var cb;
        var reply;
        if (isFunction(arg1)) {
            cb = arg1;
        } else {
            reply = arg1;
            cb = arg2;
        }
        
        return janisbot.hopIn(message, reply)
        .then(function (obj) {
            



            var isPaused = false;
            if (obj) {
                isPaused = obj.paused;
            } 
            message.paused = isPaused;
            if (cb) {
                cb(isPaused);
            }
            return Promise.resolve(isPaused);
        })
        .catch(function (err) {
            if (cb) {
                cb(false);
            } 
            return Promise.reject(err);
        });
    };

    janisObj.hopOut = function(message, cb) {
        
        
        return janisbot.hopOut(message)
        .then(function (obj) {
            
            if (cb) {
                cb(true);
            } 
            return Promise.resolve(true);
        })
        .catch(function (err) {
            if (cb) {
                cb(false);
            } 
            return Promise.reject(err);
        });
    };

    janisObj.setPlatform = function(platform) {
        if (platform == 'facebook' || platform == 'messenger') {
            platform = "messenger";
        }
        if (platform === 'slack' || platform === 'messenger' || platform === 'microsoft') {
            janisbot.platform = platform;
        }
    }
    
    return janisObj;
};