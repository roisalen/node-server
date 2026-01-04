var validationMiddleware = require('./middleware/validation');
var auditMiddleware = require('./middleware/audit');

var subjectMap = {};

var getSubject = function(organisation) {
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		return "";
	}

	var validatedOrg = orgValidation.sanitized;
	if (!subjectMap[validatedOrg]) {
		subjectMap[validatedOrg] = ""
	}

	return subjectMap[validatedOrg];
}

var setSubject = function(organisation, subject) {
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		return false;
	}

	var validatedOrg = orgValidation.sanitized;
	// Sanitize subject - limit length and remove dangerous characters
	var sanitizedSubject = String(subject || "").trim();
	if (sanitizedSubject.length > 500) {
		sanitizedSubject = sanitizedSubject.substring(0, 500);
	}
	subjectMap[validatedOrg] = sanitizedSubject;
	return true;
}

module.exports.set = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	
	if (!req.body || typeof req.body.subject !== 'string') {
		res.status(400).json({ error: 'Subject is required' });
		return next();
	}

	if (setSubject(organisation, req.body.subject)) {
		auditMiddleware.logAction('SET_SUBJECT', organisation, {});
		res.status(201).json({ message: 'Subject updated' });
		return next();
	} else {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}
}

module.exports.get = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var subject = getSubject(organisation);
	res.status(200).json(subject);
	return next();
}

module.exports.getSubject = getSubject;