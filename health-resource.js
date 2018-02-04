var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, []);


function getStatus(req, res, next) {
    db.runCommand({ping: 1}, function (err, success) {
        if(!err && success.ok) {
			res.status(200).send("db is ok :)\n");
			return next();
		} else {
			res.status(503).send("db is not ok :(\n");
			return next(err);
		}
	});
}

module.exports.get = getStatus;

