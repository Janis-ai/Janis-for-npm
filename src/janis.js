'use strict';

var rp = require('request-promise');
var Promise = require("bluebird");

var checkIfString = function(myVar) {
    return (typeof myVar === 'string' || myVar instanceof String)
}

function janisBot(apikey, clientkey, config) {
    var that = Object;
    that.apikey = apikey;
    that.clientkey = clientkey;

    that.debug = config.debug || false;
    that.serverRoot = config.serverRoot || 'https://wordhopapi.herokuapp.com';
    that.controller = config.controller;
    that.platform = config.platform || 'messenger';
    that.platform = that.platform.toLowerCase();
    that.socketServer = config.socketServer || 'https://wordhop-socket-server.herokuapp.com';
    that.token = config.token || '';
    that.useWebhook = config.useWebhook || false;
    that.path = config.path || '/api/v1/';
    
    
    that.checkIfMessage = function(msg) {
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
        if (msg.message) {
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
        if ((message.type == 'user_message' || message.type == 'message' || 
            message.type == 'facebook_postback' || message.type == null || message.page) &&
            message.transcript == null &&
            (message.subtype == null || message.subtype == "file_share") &&
            message.hasOwnProperty("reply_to") == false &&
            message.is_echo == null &&
            message.bot_id == null &&
            (message.text.length > 0 || message.attachments != null || message.attachment != null)) {
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
        return rp(data);
    }

    that.assistanceRequested = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.resolve();
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
        return rp(data);
    }

    that.hopIn = function(message, reply) {
        if (that.checkIfMessage(message) == false) { 
            return Promise.resolve();
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
        if (that.useWebhook === false) {
            data.headers.socket_id  = that.getSocketId();
        }
        if (reply) {
            data.json.reply  = reply;
        }
        if (that.token != "") {
            data.headers.token = that.token;
        }
        return rp(data);
    }

    that.hopOut = function(message) {
        if (that.checkIfMessage(message) == false) {
            return Promise.resolve();
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
        return rp(data);
    }
    
    that.checkForPaused = function(channel, cb) {
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
                cb(false);
            } 
            throw err;
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
            throw err;
        });
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

    socket.on('channel update', function (msg) {
        var event = 'channel update';
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
    janisObj.socket = janisbot.socket;

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