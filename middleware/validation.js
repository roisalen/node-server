// Validate and sanitize organization name
// For backward compatibility: allow existing organizations, but sanitize for new uses
module.exports.validateOrganization = function(organisation) {
	if (!organisation || typeof organisation !== 'string') {
		return { valid: false, error: 'Organization must be a string' };
	}

	// Basic safety: reject obviously dangerous inputs
	if (organisation.length === 0 || organisation.length > 50) {
		return { 
			valid: false, 
			error: 'Organization name must be 1-50 characters' 
		};
	}

	// Sanitize: remove dangerous characters but preserve the name
	// This allows existing organizations with various formats to work
	var sanitized = organisation.trim();
	
	// Remove characters that could be used for injection
	sanitized = sanitized.replace(/[<>\"'\\]/g, '');
	
	// For new organizations, we'll enforce stricter rules in addOrganisation
	// But for existing lookups, we're more permissive
	return { valid: true, sanitized: sanitized };
};

// Validate speaker number
module.exports.validateSpeakerNumber = function(speakerNumber) {
	if (speakerNumber === undefined || speakerNumber === null) {
		return { valid: false, error: 'Speaker number required' };
	}

	var num = parseInt(speakerNumber);
	if (isNaN(num) || num < 1 || num > 9999) {
		return { valid: false, error: 'Speaker number must be between 1 and 9999' };
	}

	return { valid: true, sanitized: num };
};

// Validate array index
module.exports.validateIndex = function(index, maxIndex) {
	if (index === undefined || index === null) {
		return { valid: false, error: 'Index required' };
	}

	var idx = parseInt(index);
	if (isNaN(idx) || idx < 0 || idx >= maxIndex) {
		return { valid: false, error: 'Index out of bounds' };
	}

	return { valid: true, sanitized: idx };
};

// Validate organization short name
module.exports.validateShortName = function(shortName) {
	if (!shortName || typeof shortName !== 'string') {
		return { valid: false, error: 'Short name must be a string' };
	}

	if (shortName.length < 3 || shortName.length > 11) {
		return { valid: false, error: 'Short name must be 3-11 characters' };
	}

	if (!/^[a-zA-Z0-9-]+$/.test(shortName)) {
		return { valid: false, error: 'Short name can only contain alphanumeric characters and hyphens' };
	}

	return { valid: true, sanitized: shortName };
};

// Validate organization name
module.exports.validateOrgName = function(name) {
	if (!name || typeof name !== 'string') {
		return { valid: false, error: 'Organization name must be a string' };
	}

	if (name.length < 1 || name.length > 200) {
		return { valid: false, error: 'Organization name must be 1-200 characters' };
	}

	// Sanitize: remove potentially dangerous characters but allow most unicode
	var sanitized = name.trim().replace(/[<>]/g, '');
	
	return { valid: true, sanitized: sanitized };
};

// Validate password strength
module.exports.validatePassword = function(password) {
	if (!password || typeof password !== 'string') {
		return { valid: false, error: 'Password must be a string' };
	}

	if (password.length < 8) {
		return { valid: false, error: 'Password must be at least 8 characters' };
	}

	if (password.length > 128) {
		return { valid: false, error: 'Password must be less than 128 characters' };
	}

	// Check for at least one uppercase, one lowercase, one number
	var hasUpper = /[A-Z]/.test(password);
	var hasLower = /[a-z]/.test(password);
	var hasNumber = /[0-9]/.test(password);
	var hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

	if (!hasUpper || !hasLower || !hasNumber) {
		return { 
			valid: false, 
			error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
		};
	}

	return { valid: true, sanitized: password };
};

// Validate email address
module.exports.validateEmail = function(email) {
	if (!email || typeof email !== 'string') {
		return { valid: false, error: 'Email must be a string' };
	}

	// Basic email regex
	var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return { valid: false, error: 'Invalid email format' };
	}

	if (email.length > 254) {
		return { valid: false, error: 'Email must be less than 254 characters' };
	}

	// Additional validation: check for common spam patterns
	var lowerEmail = email.toLowerCase();
	
	// Block disposable email domains (basic list, can be extended)
	var disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
	var domain = lowerEmail.split('@')[1];
	if (disposableDomains.indexOf(domain) !== -1) {
		return { valid: false, error: 'Disposable email addresses are not allowed' };
	}

	// Sanitize: trim and convert to lowercase
	var sanitized = email.trim().toLowerCase();
	
	return { valid: true, sanitized: sanitized };
};

