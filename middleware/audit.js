// Simple audit logging middleware
module.exports.logAction = function(action, organisation, details) {
	var timestamp = new Date().toISOString();
	var logEntry = {
		timestamp: timestamp,
		action: action,
		organisation: organisation,
		details: details || {}
	};

	// In production, this should write to a proper log file or logging service
	console.log('[AUDIT]', JSON.stringify(logEntry));
	
	// You could also write to a file or database here
	// fs.appendFileSync('audit.log', JSON.stringify(logEntry) + '\n');
};

// Middleware to log requests
module.exports.auditMiddleware = function(req, res, next) {
	var organisation = req.header('X-organisation');
	var method = req.method;
	var path = req.path;
	var action = method + ' ' + path;

	// Log sensitive operations
	if (['POST', 'PUT', 'DELETE'].includes(method)) {
		module.exports.logAction(action, organisation, {
			ip: req.ip || req.connection.remoteAddress,
			userAgent: req.header('user-agent')
		});
	}

	next();
};

