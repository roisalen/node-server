var mongojs = require("mongojs");
var crypto = require('crypto');
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['organisations', 'claimRequests']);
var validationMiddleware = require('./middleware/validation');
var auditMiddleware = require('./middleware/audit');
var emailService = require('./services/emailService');

var OWNER_EMAIL = process.env.OWNER_EMAIL || 'torkilv@gmail.com';
var CLAIM_EXPIRY_DAYS = 7;
var CLAIM_EXPIRY_MS = CLAIM_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Generate secure random token for claim requests
function generateClaimToken() {
	return crypto.randomBytes(32).toString('hex');
}

// Request to claim an organization
module.exports.requestClaim = function(req, res, next) {
	var organisation = req.params.organisation; // shortName from URL
	var email = req.body.email;

	// Validate organization
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		res.status(400).json({ error: orgValidation.error });
		return next();
	}
	organisation = orgValidation.sanitized;

	// Validate email
	var emailValidation = validationMiddleware.validateEmail(email);
	if (!emailValidation.valid) {
		res.status(400).json({ error: emailValidation.error });
		return next();
	}
	email = emailValidation.sanitized;

	// Check rate limiting for email requests (anti-spam)
	if (emailService.checkEmailRateLimit(req, email)) {
		res.status(429).json({ error: 'Too many email requests. Please try again later.' });
		return next();
	}

	// Check if organization exists
	db.organisations.findOne({ _id: organisation }, function(err, org) {
		if (err) {
			console.error('Database error checking organization:', err);
			res.status(500).json({ error: 'Failed to process claim request' });
			return next();
		}

		if (!org) {
			res.status(404).json({ error: 'Organization not found' });
			return next();
		}

		// Check if organization already has an email
		if (org.email) {
			res.status(409).json({ error: 'Organization already has an associated email' });
			return next();
		}

		// Check if there's already a pending claim for this organization
		db.claimRequests.findOne({ 
			organisation: organisation,
			status: 'pending'
		}, function(err, existingClaim) {
			if (err) {
				console.error('Database error checking existing claims:', err);
				res.status(500).json({ error: 'Failed to process claim request' });
				return next();
			}

			if (existingClaim) {
				// Check if it's the same email
				if (existingClaim.email === email) {
					res.status(409).json({ error: 'A claim request with this email is already pending' });
					return next();
				}
				// If different email, deny the old one and create new
				existingClaim.status = 'denied';
				existingClaim.deniedAt = new Date();
				db.claimRequests.save(existingClaim, function(saveErr) {
					if (saveErr) {
						console.error('Database error denying existing claim:', saveErr);
						res.status(500).json({ error: 'Failed to process claim request' });
						return next();
					}
					// Continue with checking for existing email claims after save completes
					checkForExistingEmailClaim();
				});
				return; // Exit early, callback will continue
			}

			// If no existing claim, proceed directly to check for existing email claims
			checkForExistingEmailClaim();

			// Check if this email already has a pending claim for any organization
			function checkForExistingEmailClaim() {
				db.claimRequests.findOne({ 
					email: email,
					status: 'pending'
				}, function(err, existingEmailClaim) {
				if (err) {
					console.error('Database error checking existing email claims:', err);
					res.status(500).json({ error: 'Failed to process claim request' });
					return next();
				}

				if (existingEmailClaim) {
					res.status(409).json({ error: 'You already have a pending claim request. Please wait for approval or contact support.' });
					return next();
				}

				// Create new claim request
				var claimToken = generateClaimToken();
				var claimRequest = {
					organisation: organisation,
					organisationName: org.name,
					email: email,
					token: claimToken,
					status: 'pending',
					requestedAt: new Date(),
					expiresAt: new Date(Date.now() + CLAIM_EXPIRY_MS),
					ip: req.ip || req.connection.remoteAddress || 'unknown'
				};

				db.claimRequests.save(claimRequest, function(err, saved) {
					if (err) {
						console.error('Database error saving claim request:', err);
						res.status(500).json({ error: 'Failed to process claim request' });
						return next();
					}

					// Send email to owner
					emailService.sendClaimRequestEmail(
						org.name,
						organisation,
						email,
						claimToken,
						function(emailErr) {
							if (emailErr) {
								console.error('Error sending claim request email:', emailErr);
								// Don't fail the request, just log the error
							}
						}
					);

					auditMiddleware.logAction('REQUEST_CLAIM', organisation, {
						email: email,
						ip: req.ip
					});

					res.status(201).json({ 
						message: 'Claim request submitted. You will receive an email when it is approved or denied.',
						token: claimToken // For testing/admin purposes
					});
					return next();
				});
				});
			}
		});
	});
};

// Approve a claim request (owner only)
module.exports.approveClaim = function(req, res, next) {
	var token = req.query.token || req.body.token;

	if (!token) {
		res.status(400).json({ error: 'Token required' });
		return next();
	}

	// Find claim request by token
	db.claimRequests.findOne({ token: token, status: 'pending' }, function(err, claim) {
		if (err) {
			console.error('Database error finding claim request:', err);
			res.status(500).json({ error: 'Failed to process approval' });
			return next();
		}

		if (!claim) {
			res.status(404).json({ error: 'Claim request not found or already processed' });
			return next();
		}

		// Check if expired
		if (new Date() > new Date(claim.expiresAt)) {
			claim.status = 'expired';
			db.claimRequests.save(claim);
			res.status(410).json({ error: 'Claim request has expired' });
			return next();
		}

		// Update organization with email
		db.organisations.findOne({ _id: claim.organisation }, function(err, org) {
			if (err) {
				console.error('Database error finding organization:', err);
				res.status(500).json({ error: 'Failed to process approval' });
				return next();
			}

			if (!org) {
				res.status(404).json({ error: 'Organization not found' });
				return next();
			}

			// Check if organization already has an email
			if (org.email) {
				// Mark claim as denied since org already has email
				claim.status = 'denied';
				claim.deniedAt = new Date();
				claim.denialReason = 'Organization already has an associated email';
				db.claimRequests.save(claim);
				res.status(409).json({ error: 'Organization already has an associated email' });
				return next();
			}

			// Add email to organization
			org.email = claim.email;
			db.organisations.save(org, function(err, saved) {
				if (err) {
					console.error('Database error updating organization:', err);
					res.status(500).json({ error: 'Failed to process approval' });
					return next();
				}

				// Update claim status
				claim.status = 'approved';
				claim.approvedAt = new Date();
				db.claimRequests.save(claim);

				// Send approval email to requester
				emailService.sendClaimApprovalEmail(
					claim.organisationName,
					claim.email,
					function(emailErr) {
						if (emailErr) {
							console.error('Error sending approval email:', emailErr);
							// Don't fail the request, just log the error
						}
					}
				);

				auditMiddleware.logAction('APPROVE_CLAIM', claim.organisation, {
					email: claim.email,
					approvedBy: 'owner'
				});

				// Remove password hash from response
				delete saved.passwordHash;

				res.status(200).json({ 
					message: 'Claim approved successfully',
					organisation: saved
				});
				return next();
			});
		});
	});
};

// Deny a claim request (owner only)
module.exports.denyClaim = function(req, res, next) {
	var token = req.query.token || req.body.token;

	if (!token) {
		res.status(400).json({ error: 'Token required' });
		return next();
	}

	// Find claim request by token
	db.claimRequests.findOne({ token: token, status: 'pending' }, function(err, claim) {
		if (err) {
			console.error('Database error finding claim request:', err);
			res.status(500).json({ error: 'Failed to process denial' });
			return next();
		}

		if (!claim) {
			res.status(404).json({ error: 'Claim request not found or already processed' });
			return next();
		}

		// Update claim status
		claim.status = 'denied';
		claim.deniedAt = new Date();
		db.claimRequests.save(claim);

		// Send denial email to requester
		emailService.sendClaimDenialEmail(
			claim.organisationName,
			claim.email,
			function(emailErr) {
				if (emailErr) {
					console.error('Error sending denial email:', emailErr);
					// Don't fail the request, just log the error
				}
			}
		);

		auditMiddleware.logAction('DENY_CLAIM', claim.organisation, {
			email: claim.email,
			deniedBy: 'owner'
		});

		res.status(200).json({ message: 'Claim denied successfully' });
		return next();
	});
};

// Get claim status (for checking if a claim is pending)
module.exports.getClaimStatus = function(req, res, next) {
	var organisation = req.params.organisation;

	// Validate organization
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		res.status(400).json({ error: orgValidation.error });
		return next();
	}
	organisation = orgValidation.sanitized;

	// Find pending claim for this organization
	db.claimRequests.findOne({ 
		organisation: organisation,
		status: 'pending'
	}, function(err, claim) {
		if (err) {
			console.error('Database error finding claim:', err);
			res.status(500).json({ error: 'Failed to check claim status' });
			return next();
		}

		if (!claim) {
			res.status(404).json({ hasPendingClaim: false });
			return next();
		}

		// Check if expired
		if (new Date() > new Date(claim.expiresAt)) {
			claim.status = 'expired';
			db.claimRequests.save(claim);
			res.status(404).json({ hasPendingClaim: false });
			return next();
		}

		// Don't expose sensitive information
		res.status(200).json({ 
			hasPendingClaim: true,
			requestedAt: claim.requestedAt
		});
		return next();
	});
};

