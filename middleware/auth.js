var jwt = require('jsonwebtoken');
var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations']);

var JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
var JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Generate JWT token after successful password verification
module.exports.generateToken = function(organisationShortName) {
	return jwt.sign(
		{ 
			organisation: organisationShortName,
			iat: Math.floor(Date.now() / 1000)
		},
		JWT_SECRET,
		{ expiresIn: JWT_EXPIRY }
	);
};

// Verify JWT token and check organization
module.exports.verifyToken = function(req, res, next) {
	var token = req.header('Authorization');
	var organisation = req.header('X-organisation');

	if (!token) {
		return res.status(401).json({ error: 'Authentication required' });
	}

	// Remove 'Bearer ' prefix if present
	if (token.startsWith('Bearer ')) {
		token = token.substring(7);
	}

	try {
		var decoded = jwt.verify(token, JWT_SECRET);
		
		// Verify token organization matches request organization
		if (decoded.organisation !== organisation) {
			return res.status(403).json({ error: 'Invalid token for organization' });
		}

		// Attach decoded token to request for use in route handlers
		req.authenticatedOrganisation = decoded.organisation;
		next();
	} catch (err) {
		if (err.name === 'TokenExpiredError') {
			return res.status(401).json({ error: 'Token expired' });
		}
		return res.status(401).json({ error: 'Invalid token' });
	}
};

// Cache for organization existence (to reduce DB lookups)
var orgCache = {};
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Middleware to verify organization exists and is valid
module.exports.verifyOrganization = function(req, res, next) {
	var organisation = req.header('X-organisation');

	if (!organisation) {
		return res.status(400).json({ error: 'Organization header required' });
	}

	// Basic validation - allow existing organizations with various formats
	// Only reject obviously invalid inputs (empty, too long, contains dangerous chars)
	if (typeof organisation !== 'string' || organisation.length === 0 || organisation.length > 50) {
		return res.status(400).json({ error: 'Invalid organization format' });
	}

	// Check cache first
	var cacheKey = organisation.toLowerCase();
	var cached = orgCache[cacheKey];
	if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
		if (cached.exists) {
			req.validatedOrganisation = cached.originalName;
			return next();
		} else {
			return res.status(404).json({ error: 'Organization not found' });
		}
	}

	// Check if organization exists in database (case-insensitive search)
	// First try exact match, then case-insensitive
	db.organisations.findOne({ _id: organisation }, function(err, org) {
		if (err) {
			console.error('Database error checking organization:', err);
			return res.status(500).json({ error: 'Database error' });
		}

		if (org) {
			// Cache the result
			orgCache[cacheKey] = {
				exists: true,
				originalName: org._id,
				timestamp: Date.now()
			};
			req.validatedOrganisation = org._id;
			return next();
		}

		// Try case-insensitive search for backward compatibility
		db.organisations.find({}, function(err, allOrgs) {
			if (err) {
				console.error('Database error searching organizations:', err);
				return res.status(500).json({ error: 'Database error' });
			}

			var found = allOrgs.find(function(o) {
				return o._id && o._id.toLowerCase() === organisation.toLowerCase();
			});

			if (found) {
				// Cache the result
				orgCache[cacheKey] = {
					exists: true,
					originalName: found._id,
					timestamp: Date.now()
				};
				req.validatedOrganisation = found._id;
				return next();
			}

			// Cache negative result
			orgCache[cacheKey] = {
				exists: false,
				timestamp: Date.now()
			};
			return res.status(404).json({ error: 'Organization not found' });
		});
	});
};

