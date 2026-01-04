var mongojs = require("mongojs");
var bcrypt = require('bcrypt');
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations']);
var validationMiddleware = require('./middleware/validation');
var auditMiddleware = require('./middleware/audit');

function compare(orgA, orgB) {
	return orgA.name.localeCompare(orgB.name);
}

function getOrganisations(req, res, next) {
	db.organisations.find(function(err, success) {
		if (success) {
			// Remove password hashes from response
			success = success.map(function(org) {
				var orgCopy = Object.assign({}, org);
				delete orgCopy.passwordHash;
				return orgCopy;
			});
			success.sort(compare);
			res.status(200).json(success);
			return next();
		} else {
			console.error('Database error getting organizations:', err);
			res.status(500).json({ error: 'Failed to retrieve organizations' });
			return next(err);
		}
	});
}

function addOrganisation(req, res, next) {
	// Validate short name
	var shortNameValidation = validationMiddleware.validateShortName(req.body.shortName);
	if (!shortNameValidation.valid) {
		res.status(400).json({ error: shortNameValidation.error });
		return next();
	}

	// Validate organization name
	var nameValidation = validationMiddleware.validateOrgName(req.body.name);
	if (!nameValidation.valid) {
		res.status(400).json({ error: nameValidation.error });
		return next();
	}

	// Validate password strength
	var passwordValidation = validationMiddleware.validatePassword(req.body.password);
	if (!passwordValidation.valid) {
		res.status(400).json({ error: passwordValidation.error });
		return next();
	}

	// Check if organization already exists
	db.organisations.findOne({ _id: shortNameValidation.sanitized }, function(err, existing) {
		if (err) {
			console.error('Database error checking organization:', err);
			res.status(500).json({ error: 'Failed to create organization' });
			return next();
		}

		if (existing) {
			res.status(409).json({ error: 'Organization already exists' });
			return next();
		}

		// Hash the password before storing
		var passwordHash = bcrypt.hashSync(passwordValidation.sanitized, 10);
		
		// Create organization object without plain password
		var orgData = {
			_id: shortNameValidation.sanitized,
			name: nameValidation.sanitized,
			shortName: shortNameValidation.sanitized,
			passwordHash: passwordHash
		};

		// Add optional fields if present (with validation)
		if (req.body.email) {
			var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (emailRegex.test(req.body.email) && req.body.email.length <= 254) {
				orgData.email = req.body.email;
			}
		}

		db.organisations.save(orgData, function(err, success) {
			if (!err && success) {
				// Don't send password hash back to client
				delete success.passwordHash;
				auditMiddleware.logAction('CREATE_ORGANIZATION', shortNameValidation.sanitized, {
					name: nameValidation.sanitized
				});
				res.status(201).json(success);
				return next();
			} else {
				console.error('Database error saving organization:', err);
				res.status(500).json({ error: 'Failed to create organization' });
				return next(err);
			}
		});
	});
}

function deleteOrganisation(req, res, next) {
	var id = req.params.id;
	var organisation = req.authenticatedOrganisation || req.header('X-organisation');

	// Validate organization format
	var orgValidation = validationMiddleware.validateOrganization(id);
	if (!orgValidation.valid) {
		res.status(400).json({ error: 'Invalid organization ID' });
		return next();
	}

	// Verify user can only delete their own organization (or add admin check)
	if (organisation !== orgValidation.sanitized) {
		res.status(403).json({ error: 'Unauthorized to delete this organization' });
		return next();
	}

	db.organisations.remove({_id: orgValidation.sanitized}, function (err, success) {
		if (err) {
			console.error('Database error deleting organization:', err);
			res.status(500).json({ error: 'Failed to delete organization' });
			return next(err);
		}

		if (success) {
			auditMiddleware.logAction('DELETE_ORGANIZATION', orgValidation.sanitized, {});
			res.status(200).json({ message: 'Organization deleted' });
		} else {
			res.status(404).json({ error: 'Organization not found' });
		}
		return next();
	});
}


module.exports.get = getOrganisations;
module.exports.add = addOrganisation;
module.exports.delete = deleteOrganisation;

