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

    var commands = message.text.toLowerCase().split(" ");
    if (commands[0] != "parking") return;

    switch(commands[1]) {
        case "add":
            licensePlate = commands[2].toLowerCase();

            redisClient.get(licensePlate, function(err, reply) {
                if (reply != null) {
                    rtm.sendMessage("I'm sorry <@" + message.user + ">, I'm afraid I can't do that. <@" + reply + "> already claimed that license plate.", message.channel);
                } else {
                    if (commands.length < 4) {
                        redisClient.set(licensePlate, message.user);
                        rtm.sendMessage(licensePlate.toUpperCase() + " linked to <@" + message.user + ">!", message.channel);
                    } else {
                        user_id = commands[3].replace(/[@<>]/g,'').toUpperCase();
                        redisClient.set(licensePlate, user_id);
                        rtm.sendMessage(licensePlate.toUpperCase() + " linked to <@" + user_id + ">!", message.channel);
                    }
                }
            });
            break;

        case "help":
            rtm.sendMessage("Hey <@" + message.user + ">, I help with parking! Type `parking abc1234` in this channel to get that person to move their car! If I don't know that car, I'll alert the channel for you.", message.channel);
            rtm.sendMessage("Add your own car with `parking add abc1234` so other people can notify you by your plates! Type `parking help` to see this message again or type `parking cmd` to see a list of commands.", message.channel);
            break;

        case "rm":
            licensePlate = commands[2].toLowerCase();

            redisClient.get(licensePlate, function(err, reply) {
                if (!reply) {
                    rtm.sendMessage("I'm sorry <@" + message.user + ">. That license plate is not currently assigned.", message.channel);
                } else {
                    redisClient.del(licensePlate);
                    rtm.sendMessage(licensePlate.toUpperCase() + " has been unassigned.", message.channel);
                }
            });
            break;

        case "cmd":
            rtm.sendMessage("*Parking Bot Commands:*", message.channel);
            rtm.sendMessage("`parking abc1234` - Send a notification to the owner of the license plate number.", message.channel);
            rtm.sendMessage("`parking add abc1234` - Add a license plate to your username. You can have multiple license plates assigned.", message.channel);
            rtm.sendMessage("`parking add abc1234 @user` - Add a license plate to another user.", message.channel);
            rtm.sendMessage("`parking rm abc1234` - Remove a license plate from parking bot.", message.channel);
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
                    rtm.sendMessage("I don't know who owns " + licensePlate + ", <!channel>? You can own this vehicle by posting `parking add " + licensePlate + "` :)", message.channel);
                    return;
                }
                rtm.sendMessage("Hey <@" + reply + ">, <@" + message.user + "> needs you to move your car!", message.channel);
            });

            break;
    }
});
