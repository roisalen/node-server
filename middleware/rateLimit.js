// Simple in-memory rate limiter
// In production, use redis-based rate limiting for distributed systems
var rateLimitStore = {};

var RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
var RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '200'); // 200 requests per window (configurable)
var RATE_LIMIT_AUTH_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10'); // 10 auth attempts per window (configurable)

function getClientIdentifier(req) {
	return req.ip || req.connection.remoteAddress || 'unknown';
}

function isRateLimited(identifier, maxRequests) {
	var now = Date.now();
	var clientData = rateLimitStore[identifier];

	if (!clientData) {
		rateLimitStore[identifier] = {
			count: 1,
			resetTime: now + RATE_LIMIT_WINDOW
		};
		return false;
	}

	// Reset if window expired
	if (now > clientData.resetTime) {
		rateLimitStore[identifier] = {
			count: 1,
			resetTime: now + RATE_LIMIT_WINDOW
		};
		return false;
	}

	// Check if limit exceeded
	if (clientData.count >= maxRequests) {
		return true;
	}

	clientData.count++;
	return false;
}

// General rate limiting middleware
module.exports.rateLimit = function(req, res, next) {
	var identifier = getClientIdentifier(req);
	
	if (isRateLimited(identifier, RATE_LIMIT_MAX_REQUESTS)) {
		return res.status(429).json({ 
			error: 'Too many requests. Please try again later.' 
		});
	}

	next();
};

// Stricter rate limiting for authentication endpoints
module.exports.authRateLimit = function(req, res, next) {
	var identifier = getClientIdentifier(req);
	
	if (isRateLimited(identifier, RATE_LIMIT_AUTH_MAX)) {
		return res.status(429).json({ 
			error: 'Too many authentication attempts. Please try again later.' 
		});
	}

	next();
};

// Stricter rate limiting for claim requests (anti-spam)
module.exports.claimRateLimit = function(req, res, next) {
	var identifier = getClientIdentifier(req);
	
	// Very strict: 3 requests per hour per IP
	if (isRateLimited(identifier, 3)) {
		return res.status(429).json({ 
			error: 'Too many claim requests. Please try again later.' 
		});
	}

	next();
};

// Clean up old entries periodically
setInterval(function() {
	var now = Date.now();
	for (var identifier in rateLimitStore) {
		if (rateLimitStore[identifier].resetTime < now) {
			delete rateLimitStore[identifier];
		}
	}
}, RATE_LIMIT_WINDOW);

