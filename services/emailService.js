var { Resend } = require('resend');
var validationMiddleware = require('../middleware/validation');

var resend = new Resend(process.env.RESEND_API_KEY || '');

// Owner email for claim approvals
var OWNER_EMAIL = process.env.OWNER_EMAIL || 'torkilv@gmail.com';
var FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Rate limiting for email requests (anti-spam)
var emailRequestStore = {};
var EMAIL_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
var EMAIL_RATE_LIMIT_MAX = 5; // Max 5 email requests per hour per IP/email

function isEmailRateLimited(identifier) {
	var now = Date.now();
	var clientData = emailRequestStore[identifier];

	if (!clientData) {
		emailRequestStore[identifier] = {
			count: 1,
			resetTime: now + EMAIL_RATE_LIMIT_WINDOW
		};
		return false;
	}

	// Reset if window expired
	if (now > clientData.resetTime) {
		emailRequestStore[identifier] = {
			count: 1,
			resetTime: now + EMAIL_RATE_LIMIT_WINDOW
		};
		return false;
	}

	// Check if limit exceeded
	if (clientData.count >= EMAIL_RATE_LIMIT_MAX) {
		return true;
	}

	clientData.count++;
	return false;
}

// Clean up old entries periodically
setInterval(function() {
	var now = Date.now();
	for (var identifier in emailRequestStore) {
		if (emailRequestStore[identifier].resetTime < now) {
			delete emailRequestStore[identifier];
		}
	}
}, EMAIL_RATE_LIMIT_WINDOW);

// Check rate limit for email requests
module.exports.checkEmailRateLimit = function(req, email) {
	var ip = req.ip || req.connection.remoteAddress || 'unknown';
	var identifier = ip + ':' + (email || '');
	return isEmailRateLimited(identifier);
};

// Send claim request email to owner
module.exports.sendClaimRequestEmail = function(organisationName, organisationShortName, requesterEmail, claimToken, callback) {
	if (!process.env.RESEND_API_KEY) {
		return callback(new Error('Email service not configured'));
	}

	// Validate email
	var emailValidation = validationMiddleware.validateEmail(requesterEmail);
	if (!emailValidation.valid) {
		return callback(new Error(emailValidation.error));
	}

	var approveUrl = `${FRONTEND_URL}/admin/approve-claim?token=${claimToken}`;
	var denyUrl = `${FRONTEND_URL}/admin/deny-claim?token=${claimToken}`;

	var html = `
		<h2>Organization Claim Request</h2>
		<p>Someone has requested to claim the organization <strong>${organisationName}</strong> (${organisationShortName}).</p>
		<p><strong>Requester Email:</strong> ${requesterEmail}</p>
		<p>To approve this claim, click the link below:</p>
		<p><a href="${approveUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Approve Claim</a></p>
		<p>To deny this claim, click the link below:</p>
		<p><a href="${denyUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Deny Claim</a></p>
		<p>This request will expire in 7 days.</p>
	`;

	resend.emails.send({
		from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
		to: OWNER_EMAIL,
		subject: `Claim Request: ${organisationName}`,
		html: html
	})
	.then(function(result) {
		callback(null, result);
	})
	.catch(function(error) {
		console.error('Error sending claim request email:', error);
		callback(error);
	});
};

// Send claim approval email to requester
module.exports.sendClaimApprovalEmail = function(organisationName, requesterEmail, callback) {
	if (!process.env.RESEND_API_KEY) {
		return callback(new Error('Email service not configured'));
	}

	var html = `
		<h2>Organization Claim Approved</h2>
		<p>Your request to claim the organization <strong>${organisationName}</strong> has been approved.</p>
		<p>You can now access the organization administration features.</p>
		<p><a href="${FRONTEND_URL}">Go to Ro i salen</a></p>
	`;

	resend.emails.send({
		from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
		to: requesterEmail,
		subject: `Claim Approved: ${organisationName}`,
		html: html
	})
	.then(function(result) {
		callback(null, result);
	})
	.catch(function(error) {
		console.error('Error sending claim approval email:', error);
		callback(error);
	});
};

// Send claim denial email to requester
module.exports.sendClaimDenialEmail = function(organisationName, requesterEmail, callback) {
	if (!process.env.RESEND_API_KEY) {
		return callback(new Error('Email service not configured'));
	}

	var html = `
		<h2>Organization Claim Denied</h2>
		<p>Your request to claim the organization <strong>${organisationName}</strong> has been denied.</p>
		<p>If you believe this is an error, please contact the system administrator.</p>
	`;

	resend.emails.send({
		from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
		to: requesterEmail,
		subject: `Claim Denied: ${organisationName}`,
		html: html
	})
	.then(function(result) {
		callback(null, result);
	})
	.catch(function(error) {
		console.error('Error sending claim denial email:', error);
		callback(error);
	});
};

