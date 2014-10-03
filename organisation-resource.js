var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations']);

function getOrganisations(req, res, next) {
	db.organisations.find(function(err, success) {
		if (success) {
			res.send(200, success);
			return next();
		} else {
			res.send(500);
			return next(err);
		}
	});
}

function addOrganisation(req, res, next) {
	db.organisations.save(req.body, function(err, success) {
		if (!err && success) {
			res.send(201, success);
			return next();
		} else {
			console.log(success);
			res.send(500);
			return next(err);
		}
	});
}

module.exports.get = getOrganisations;
module.exports.add = addOrganisation;