// HTTPS enforcement middleware (for production)
module.exports.enforceHTTPS = function(req, res, next) {
	// Only enforce in production
	if (process.env.NODE_ENV === 'production') {
		// Check if request is secure (behind proxy)
		var isSecure = req.secure || 
			req.headers['x-forwarded-proto'] === 'https' ||
			req.headers['x-forwarded-ssl'] === 'on';

		if (!isSecure) {
			return res.redirect(301, 'https://' + req.headers.host + req.url);
		}
	}
	next();
};

