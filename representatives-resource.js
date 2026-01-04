var Speaker = require("./models/speaker");
var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, []);
var validationMiddleware = require('./middleware/validation');
var auditMiddleware = require('./middleware/audit');

// Safe collection name generation - prevents NoSQL injection
function getCollectionName(organisation) {
	// Validate organization name first
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		return null;
	}
	// Use validated organization name
	return orgValidation.sanitized + "-representatives";
}

function getSpeakerFromDB(organisation, speakerId, callBack) {
	var collectionName = getCollectionName(organisation);
	if (!collectionName) {
		return callBack(false);
	}

	var speakerValidation = validationMiddleware.validateSpeakerNumber(speakerId);
	if (!speakerValidation.valid) {
		return callBack(false);
	}

	var representatives = db.collection(collectionName);
	representatives.findOne({number: speakerValidation.sanitized}, function(err, success) {
		if (err) {
			console.error('Database error getting speaker:', err);
			return callBack(false);
		}
		if (success){
			return callBack(success);
		}
		return callBack(false);
	});
}


module.exports.getSpeakerFromDB = getSpeakerFromDB;

module.exports.getAll = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var collectionName = getCollectionName(organisation);
	
	if (!collectionName) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var representatives = db.collection(collectionName);
	representatives.find().sort({number: 1}, function(err, success){
		if (err) {
			console.error('Database error getting representatives:', err);
			res.status(500).json({ error: 'Failed to retrieve representatives' });
			return next(err);
		}
		if (success) {
			res.status(200).json(success);
			return next();
		} else {
			res.status(500).json({ error: 'Failed to retrieve representatives' });
			return next();
		}
	});
};

module.exports.get = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	
	var speakerValidation = validationMiddleware.validateSpeakerNumber(req.params.speakerId);
	if (!speakerValidation.valid) {
		res.status(400).json({ error: speakerValidation.error });
		return next();
	}

	getSpeakerFromDB(organisation, speakerValidation.sanitized, function(speaker) {
		if (speaker) {
			res.status(200).json(speaker);
			return next();
		} else {
			res.status(404).json({ error: 'Representative not found' });
			return next();
		}
	});
};

module.exports.delete = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var collectionName = getCollectionName(organisation);
	
	if (!collectionName) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var speakerValidation = validationMiddleware.validateSpeakerNumber(req.params.speakerId);
	if (!speakerValidation.valid) {
		res.status(400).json({ error: speakerValidation.error });
		return next();
	}

	var representatives = db.collection(collectionName);
	representatives.remove({number: speakerValidation.sanitized}, function(err, success){
		if (err) {
			console.error('Database error deleting representative:', err);
			res.status(500).json({ error: 'Failed to delete representative' });
			return next(err);
		}
		if (success) {
			auditMiddleware.logAction('DELETE_REPRESENTATIVE', organisation, {
				speakerNumber: speakerValidation.sanitized
			});
			res.status(200).json({ message: 'Representative deleted' });
			return next();
		} else {
			res.status(404).json({ error: 'Representative not found' });
			return next();
		}
	});
}

module.exports.deleteAll = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var collectionName = getCollectionName(organisation);
	
	if (!collectionName) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var representatives = db.collection(collectionName);
	representatives.remove({},function(err, success) {
		if (err) {
			console.error('Database error deleting all representatives:', err);
			res.status(500).json({ error: 'Failed to delete representatives' });
			return next(err);
		}
		if (success) {
			auditMiddleware.logAction('DELETE_ALL_REPRESENTATIVES', organisation, {});
			res.status(200).json({ message: 'All representatives deleted' });
			return next();
		} else {
			res.status(500).json({ error: 'Failed to delete representatives' });
			return next();
		}
	});
}


module.exports.add = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var collectionName = getCollectionName(organisation);
	
	if (!collectionName) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var speakerValidation = validationMiddleware.validateSpeakerNumber(req.body.number);
	if (!speakerValidation.valid) {
		res.status(400).json({ error: speakerValidation.error });
		return next();
	}

	// Validate name
	if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
		res.status(400).json({ error: 'Name is required' });
		return next();
	}

	if (req.body.name.length > 200) {
		res.status(400).json({ error: 'Name must be less than 200 characters' });
		return next();
	}

	// Validate sex (if provided)
	var validSexValues = ['male', 'female', 'other', 'M', 'F', 'O'];
	var sex = req.body.sex ? String(req.body.sex).toLowerCase() : null;
	if (sex && !validSexValues.includes(sex)) {
		res.status(400).json({ error: 'Invalid sex value' });
		return next();
	}

	// Validate group (if provided)
	var group = req.body.group ? String(req.body.group).trim() : '';
	if (group.length > 100) {
		res.status(400).json({ error: 'Group must be less than 100 characters' });
		return next();
	}

	var speaker = new Speaker(
		String(req.body.name).trim(), 
		speakerValidation.sanitized, 
		sex, 
		group
	);

	var representatives = db.collection(collectionName);
	representatives.save(speaker, function(err, success) {
		if (err) {
			console.error('Database error adding representative:', err);
			res.status(500).json({ error: 'Failed to add representative' });
			return next(err);
		}
		if (success) {
			auditMiddleware.logAction('ADD_REPRESENTATIVE', organisation, {
				speakerNumber: speakerValidation.sanitized
			});
			res.status(201).json(speaker);
			return next();
		} else {
			res.status(500).json({ error: 'Failed to add representative' });
			return next();
		}
	});
}
