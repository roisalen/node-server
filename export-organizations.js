#!/usr/bin/env node

/**
 * Export all organizations with their URLs to a local file
 * Uses the public API to fetch organizations (no direct database access needed)
 * Usage: node export-organizations.js
 * Default output: organizations-export.json and organizations-export.txt
 */

var http = require('http');
var https = require('https');
var fs = require("fs");
var path = require("path");
var url = require('url');

// Get API URL from environment or use production default
// Production API is typically at https://roisalen.no/rest or https://roisalen.no
var apiUrl = process.env.API_URL || 'https://roisalen.no';
var baseUrl = process.env.BASE_URL || apiUrl.replace('/rest', ''); // Remove /rest from base URL for frontend links

// Parse the API URL
var parsedUrl = url.parse(apiUrl);
var protocol = parsedUrl.protocol === 'https:' ? https : http;
var hostname = parsedUrl.hostname;
var port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);
var pathname = parsedUrl.pathname || '';

console.log('Fetching organizations from API...');
console.log('API URL:', apiUrl);
console.log('Base URL (for links):', baseUrl);
console.log('');

// Fetch all organizations including hidden ones
// Try /rest/organisations first (production), fall back to /organisations
var apiPath = (pathname + '/organisations?includeHidden=true').replace('//', '/');
if (!pathname || pathname === '/') {
	// If no path specified, try /rest/organisations (common production setup)
	apiPath = '/rest/organisations?includeHidden=true';
}
var options = {
	hostname: hostname,
	port: port,
	path: apiPath,
	method: 'GET',
	headers: {
		'Accept': 'application/json'
	}
};

var req = protocol.request(options, function(res) {
	var data = '';

	res.on('data', function(chunk) {
		data += chunk;
	});

	res.on('end', function() {
		if (res.statusCode !== 200) {
			console.error('Error: API returned status code', res.statusCode);
			console.error('Response:', data);
			process.exit(1);
		}

		var organizations;
		try {
			organizations = JSON.parse(data);
		} catch (e) {
			console.error('Error parsing JSON response:', e.message);
			console.error('Response:', data);
			process.exit(1);
		}

		if (!organizations || organizations.length === 0) {
			console.log('No organizations found.');
			process.exit(0);
		}

		console.log('Found', organizations.length, 'organization(s)');
		console.log('');

		// Sort by name
		organizations.sort(function(a, b) {
			return (a.name || '').localeCompare(b.name || '');
		});

		// Prepare data
		var exportData = organizations.map(function(org) {
			var urlIdentifier = org.slug || org.shortName;
			var orgUrl = baseUrl + '/' + urlIdentifier + '/speaker-list';
			
			return {
				name: org.name || 'N/A',
				shortName: org.shortName || 'N/A',
				slug: org.slug || 'N/A',
				url: orgUrl,
				urlIdentifier: urlIdentifier,
				hidden: org.hidden !== undefined ? org.hidden : true, // Default to true if not set
				email: org.email || ''
			};
		});

		// Generate timestamp
		var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		// Output files
		var jsonFile = path.join(__dirname, 'organizations-export-' + timestamp + '.json');
		var txtFile = path.join(__dirname, 'organizations-export-' + timestamp + '.txt');

		// Write JSON file
		fs.writeFileSync(jsonFile, JSON.stringify(exportData, null, 2), 'utf8');
		console.log('✓ JSON export saved to:', jsonFile);

		// Write human-readable text file
		var txtContent = 'Organizations Export - ' + new Date().toISOString() + '\n';
		txtContent += '='.repeat(80) + '\n\n';
		txtContent += 'Total organizations: ' + exportData.length + '\n\n';

		exportData.forEach(function(org, index) {
			txtContent += (index + 1) + '. ' + org.name + '\n';
			txtContent += '   Short Name: ' + org.shortName + '\n';
			txtContent += '   Slug: ' + org.slug + '\n';
			txtContent += '   URL: ' + org.url + '\n';
			txtContent += '   Hidden: ' + (org.hidden ? 'Yes' : 'No') + '\n';
			if (org.email) {
				txtContent += '   Email: ' + org.email + '\n';
			}
			txtContent += '\n';
		});

		fs.writeFileSync(txtFile, txtContent, 'utf8');
		console.log('✓ Text export saved to:', txtFile);

		// Summary
		console.log('\nSummary:');
		console.log('  Total organizations: ' + exportData.length);
		console.log('  Hidden: ' + exportData.filter(function(o) { return o.hidden; }).length);
		console.log('  Visible: ' + exportData.filter(function(o) { return !o.hidden; }).length);
		console.log('  With slugs: ' + exportData.filter(function(o) { return o.slug && o.slug !== 'N/A'; }).length);

		process.exit(0);
	});
});

req.on('error', function(e) {
	console.error('Error making API request:', e.message);
	console.error('Make sure the API server is accessible at:', apiUrl);
	console.error('You can override the API URL with: export API_URL="http://localhost:8080"');
	process.exit(1);
});

req.end();

