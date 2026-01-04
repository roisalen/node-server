var validationMiddleware = require('./middleware/validation');
var auditMiddleware = require('./middleware/audit');

var messageMap = {};

var getMessage = function(organisation) {
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		return "";
	}

	var validatedOrg = orgValidation.sanitized;
	if (!messageMap[validatedOrg]) {
		messageMap[validatedOrg] = ""
	}

	return messageMap[validatedOrg];
}

var setMessage = function(organisation, message) {
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		return false;
	}

	var validatedOrg = orgValidation.sanitized;
	// Sanitize message - limit length
	var sanitizedMessage = String(message || "").trim();
	if (sanitizedMessage.length > 10000) {
		sanitizedMessage = sanitizedMessage.substring(0, 10000);
	}
	messageMap[validatedOrg] = sanitizedMessage;
	return true;
}

module.exports.set = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	
	if (!req.body || typeof req.body.message !== 'string') {
		res.status(400).json({ error: 'Message is required' });
		return next();
	}

	if (setMessage(organisation, req.body.message)) {
		auditMiddleware.logAction('SET_MESSAGE', organisation, {});
		var savedMessage = getMessage(organisation);
		res.status(201).json(savedMessage);
		return next();
	} else {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}
}

module.exports.get = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var message = getMessage(organisation);
	res.status(200).json(message);
	return next();
}
