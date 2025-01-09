var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations']);
var ObjectId = require('mongojs').ObjectId;

function compare(orgA, orgB) {
	return orgA.name.localeCompare(orgB.name);
}

function validShortName(shortName) {
	return shortName && shortName.length > 2 && shortName.length < 12;
}

function validOrgName(orgName) {
	return orgName && orgName.length > 0;
}

function getOrganisations(req, res, next) {
	db.organisations.find(function(err, success) {
		if (success) {
			success.sort(compare);
			res.status(200).send(success);
			return next();
		} else {
			console.log(err)
			res.status(500).send();
			return next(err);
		}
	});
}

function addOrganisation(req, res, next) {
	if (!validShortName(req.body.shortName) || !validOrgName(req.body.name)) {
		res.status(400).send();
		return next();
	}
	req.body._id = req.body.shortName;
	db.organisations.save(req.body, function(err, success) {
		if (!err && success) {
			res.status(201).send(success);
			return next();
		} else {
			console.log(err);
			res.status(500).send();
			return next(err);
		}
	});
}

function deleteOrganisation(req, res, next) {
	var id = req.params.id;
	if (id.length > 12) {
		id = db.ObjectId(id);
	}
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

function deleteInactiveOrganisations(req, res, next) {
	// Set cutoff date to January 1st, 2022
	const cutoffDate = new Date('2022-01-01');
	
	db.organisations.remove(
		{
			$or: [
				{ lastActivity: { $lt: cutoffDate } },
				{ lastActivity: { $exists: false } }  // Also remove orgs with no activity
			]
		}, 
		function(err, result) {
			if (err) {
				console.log("Error deleting inactive organizations:", err);
				res.status(500).send();
				return next(err);
			}
			
			console.log("Deleted inactive organizations:", result.n);
			res.status(200).send({deletedCount: result.n});
			return next();
		}
	);
}

module.exports.get = getOrganisations;
module.exports.add = addOrganisation;
module.exports.delete = deleteOrganisation;
module.exports.deleteInactive = deleteInactiveOrganisations;

