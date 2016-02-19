var Slack = require('slack-client');
var redis = require('redis');

// connect to data
var redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
var redisClient = redis.createClient(redisURL);

// Set up slack for real time messaging
var rtmClient = Slack.RtmClient;
var token = process.env.SLACK_API_TOKEN || '';
var rtm = new rtmClient(token);//, {logLevel: 'debug'});
rtm.start();

var licensePlate = "";

var RTM_EVENTS = Slack.RTM_EVENTS;
rtm.on(RTM_EVENTS.MESSAGE, function(message) {
    console.log(message.user + ": " + message.text);
    licensePlate = null;

    var commands = message.text.split(" ");
    if (commands[0] != "parking") return;

    switch(commands[1]) {
        case "add":
            licensePlate = commands[2].toLowerCase();
            redisClient.set(licensePlate, message.user);
            rtm.sendMessage(licensePlate.toUpperCase() + " linked to <@" + message.user + ">!", message.channel);
            break;

        case "help":
            rtm.sendMessage("Hey <@"+message.user+">, I help with parking! Type `parking abc1234` in this channel to get that person to move their car!", message.channel);
            rtm.sendMessage("Add your own car with `parking add abc1234` so other people can notify you by your plates! Type `parking help` to see this message again.", message.channel);
            break;

        default:
            licensePlate = commands[1];
            if (!licensePlate) {
                rtm.sendMessage("I need a license plate to help. Use `parking add \<your plate\>` to add your own!", message.channel);
                return;
            }

            licensePlate = licensePlate.toLowerCase();
            redisClient.get(licensePlate, function(err, reply) {
                if (!reply) {
                    rtm.sendMessage("I don't know who owns "+licensePlate+", <!channel>?", message.channel);
                    return;
                }
                rtm.sendMessage("Hey <@"+reply+">, <@"+message.user+"> needs you to move your car!", message.channel);
            });

            break;
    }
});
