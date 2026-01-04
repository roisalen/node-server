var bcrypt = require('bcrypt');
var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations']);
var authMiddleware = require('./middleware/auth');
var validationMiddleware = require('./middleware/validation');

module.exports.verify = function(req, res, next) {
	var password = req.body.password;
	var organisation = req.header('X-organisation');

	if (!password) {
		res.status(400).json({ valid: false, error: 'Password required' });
		return next();
	}

	if (!organisation) {
		res.status(400).json({ valid: false, error: 'Organization required' });
		return next();
	}

	// Validate organization format
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		res.status(400).json({ valid: false, error: orgValidation.error });
		return next();
	}

	// Get organization from database to verify password
	db.organisations.findOne({ _id: orgValidation.sanitized }, function(err, org) {
		if (err) {
			console.error('Database error in auth:', err);
			res.status(500).json({ valid: false, error: 'Authentication failed' });
			return next();
		}

		if (!org || !org.passwordHash) {
			// Generic error message to prevent information disclosure
			res.status(401).json({ valid: false, error: 'Invalid credentials' });
			return next();
		}

		// Compare provided password with stored hash
		bcrypt.compare(password, org.passwordHash, function(err, result) {
			if (err) {
				console.error('Password comparison error:', err);
				res.status(500).json({ valid: false, error: 'Authentication failed' });
				return next();
			}

			if (result) {
				// Generate JWT token
				var token = authMiddleware.generateToken(orgValidation.sanitized);
				res.status(200).json({ valid: true, token: token });
			} else {
				res.status(401).json({ valid: false, error: 'Invalid credentials' });
			}
			return next();
		});
	});
};

