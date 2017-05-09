

var express = require('express');
var app = express();
var request = require('request');
var WebSocket = require('ws');
require('dotenv').config();

var janis = require('janis')(process.env.JANIS_API_KEY,process.env.JANIS_CLIENT_KEY, {platform:'slack'});

//start
app.listen(3000, function(){
    console.log('Starting...');
    console.log('argument: ');
    startListening();
});



function startListening(){

    //call rtm.start to initiate session
    request.post({url:'https://slack.com/api/rtm.start', 
        form: {token:process.env.token, no_unreads:'true'}}, function(err,res,body){ 
        
        if(err){
            console.log(err);
        }else{    

            //parse the returned body 
            obj = JSON.parse(body);
                
            //create new websocket to connect to RTM using URL returned from RTM.start 
            ws = new WebSocket(obj.url); 

            var sendMessage = function(message) {
                // send a reply
                ws.send(JSON.stringify(message)); 
                // Log the reply with janis
                janis.hopOut(message); 
            }

            //open websocket connection to Slack rtm api - error handling?
            ws.on('open', function() {
                console.log('Websocket opened');    
            });

            // Handle forwarding the messages sent by a human through your bot
            janis.on('chat response', function (message) { 
                // program your bot to pass on the human's message
                sendMessage(message);
            });

            //listen for activity on Slack 
            ws.on('message', function(message) {

                var parsed = JSON.parse(message);
                
                //easy tp parse events by type
                if (parsed.type == 'hello') {
                    
                    //First hello returned. Proper connected
                    console.log('Connection established');

                } else if (parsed.type=='message') {
                    // Let janis know when a message comes through 
                    janis.hopIn(parsed, function(isPaused) {
                        if (isPaused) { return };
                        // Process incoming message

                        // match a greeting intent and send a response
                        if(parsed.text == 'hi' || parsed.text == 'hello'){
                            console.log('INFO: received "hi"');
                            var reply = { 
                                  type: 'message', 
                                   text: 'Hello there.', 
                                 channel: parsed.channel 
                            }; 
                            sendMessage(reply);

                        }
                        // match an intent to talk to a real human
                        else if (parsed.text == "help" || parsed.text == "operator") {
                            // send a janis alert to your slack channel
                            // that the user could use assistance
                            janis.assistanceRequested(parsed);
                            // let the user know that they are being routed to a human
                            var reply = { 
                                type: 'message', 
                                text: 'Hang tight. Let me see what I can do.', 
                                channel: parsed.channel 
                            }; 
                            sendMessage(reply);
                        } 
                        // otherwise log an unknown intent with janis
                        else {

                            var reply = { 
                                  type: 'message', 
                                   text: 'Huh?', 
                                 channel: parsed.channel 
                            }; 
                            // let the user know that the bot does not understand
                            sendMessage(reply);
                            // capture conversational ‘dead-ends’.
                            janis.logUnkownIntent(parsed);
                            
                        }
                    });
                }
            }); 
        }
    });
}