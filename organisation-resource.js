var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations']);

function getOrganisations(req, res, next) {
	db.organisations.find(function(err, success) {
		if (success) {
			res.status(200).send(success);
			return next();
		} else {
			res.status(500).send();
			return next(err);
		}
	});
}

function addOrganisation(req, res, next) {
	req.body._id = req.body.shortName;
	db.organisations.save(req.body, function(err, success) {
		if (!err && success) {
			res.status(201).send(success);
			return next();
		} else {
			console.log(success);
			res.status(500).send();
			return next(err);
		}
	});
}

function deleteOrganisation(req, res, next) {
	var id = req.params.id;
	db.organisations.remove({_id: id}, function (err, success) {
		if (success) {
			console.log("deleted all");
			res.status(200).send();
		} else {
			res.status(500).send();
		}
		return next(err);

	});
}

module.exports.get = getOrganisations;
module.exports.add = addOrganisation;
module.exports.delete = deleteOrganisation;