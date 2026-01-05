var mongojs = require("mongojs");
var crypto = require("crypto");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations']);

function compare(orgA, orgB) {
	return orgA.name.localeCompare(orgB.name);
}

function validShortName(shortName) {
	return shortName && shortName.length > 2 && shortName.length < 12;
}

function validOrgName(orgName) {
	return orgName && orgName.length > 0;
}

function generateSlug() {
	// Generate a random 16-character alphanumeric string for obscure URLs
	return crypto.randomBytes(8).toString('hex');
}

function getOrganisations(req, res, next) {
	// Filter out hidden organizations for front-page display, unless includeHidden=true
	var query = {};
	if (req.query.includeHidden !== 'true') {
		query.hidden = { $ne: true };
	}
	db.organisations.find(query, function(err, success) {
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
	// Generate slug if not provided (for obscure URLs)
	if (!req.body.slug) {
		req.body.slug = generateSlug();
	}
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


module.exports.get = getOrganisations;
module.exports.add = addOrganisation;
module.exports.delete = deleteOrganisation;

