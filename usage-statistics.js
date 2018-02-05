var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['metrics']);


function trackEvent(req, res, next) {
    if (typeof req.query.e === 'string') 
        registerEvent(req.query.e, function() {
            return next();
        });
}

function registerEvent(eventclass, callback) {
    db.metrics.save({type: '' + eventclass, time: new Date()}, function(err, success) {
        if (err) {
            console.log(err)
        } else if (callback) { 
            callback();
        }
    });
}

module.exports.get = trackEvent;
module.exports.registerEvent = registerEvent;
