var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var cors = require('cors')

//Get app resources
var SpeakerListResource = require('./speaker-list-resource');
var SubjectResource = require('./subject-resource');
var MessageResource = require('./message-resource');
var RepresentativesResource = require('./representatives-resource');
var StatisticsResource = require('./statistics-resource');
var OrganisationResource = require('./organisation-resource');
var HealthResource = require('./health-resource');
var AuthResource = require('./auth-resource');
var ClaimResource = require('./claim-resource');

//Get middleware
var authMiddleware = require('./middleware/auth');
var validationMiddleware = require('./middleware/validation');
var auditMiddleware = require('./middleware/audit');
var rateLimitMiddleware = require('./middleware/rateLimit');
var securityMiddleware = require('./middleware/security');

//Set server
var server = app.listen(8080, function() {
	var host = server.address().address
	var port = server.address().port
	console.log('Listening at http://%s:%s', host, port)
})

//Configure CORS - restrict to specific origins in production
var allowedOrigins = process.env.ALLOWED_ORIGINS ? 
	process.env.ALLOWED_ORIGINS.split(',') : 
	['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'https://roisalen.no'];

var corsOptions = {
	origin: function (origin, callback) {
		// In development, be more permissive
		if (process.env.NODE_ENV !== 'production') {
			return callback(null, true);
		}
		
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) return callback(null, true);
		
		if (allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			console.warn('CORS blocked origin:', origin);
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true
};

//Enforce HTTPS in production
app.use(securityMiddleware.enforceHTTPS);

//Disable caching for API responses
app.use(function(req, res, next) {
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');
	next();
});

//Use bodyparser with size limit and cors
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors(corsOptions));

//Apply rate limiting to all routes
app.use(rateLimitMiddleware.rateLimit);

//Apply audit logging
app.use(auditMiddleware.auditMiddleware);

//Public endpoints (no auth required)
app.get('/organisations', OrganisationResource.get);
app.get('/speakerList', authMiddleware.verifyOrganization, SpeakerListResource.getList);
app.get('/subject', authMiddleware.verifyOrganization, SubjectResource.get);
app.get('/message', authMiddleware.verifyOrganization, MessageResource.get);
app.get('/representatives', authMiddleware.verifyOrganization, RepresentativesResource.getAll);
app.get('/representatives/:speakerId', authMiddleware.verifyOrganization, RepresentativesResource.get);

//Auth endpoints (rate limited)
app.post('/auth/verify', rateLimitMiddleware.authRateLimit, AuthResource.verify);

//Protected admin endpoints (require authentication)
app.post('/organisations', OrganisationResource.add);
app.delete('/organisations/IMSURE/:id', authMiddleware.verifyToken, authMiddleware.verifyOrganization, OrganisationResource.delete);

//Claim organization endpoints (with anti-spam rate limiting)
app.post('/organisations/:organisation/claim', rateLimitMiddleware.claimRateLimit, ClaimResource.requestClaim);
app.get('/organisations/:organisation/claim-status', ClaimResource.getClaimStatus);
app.get('/admin/approve-claim', ClaimResource.approveClaim);
app.get('/admin/deny-claim', ClaimResource.denyClaim);

//Speakerlist admin endpoints
app.post('/speakerList', authMiddleware.verifyToken, authMiddleware.verifyOrganization, SpeakerListResource.addSpeaker);
app.delete('/speakerList/:speakerRank', authMiddleware.verifyToken, authMiddleware.verifyOrganization, SpeakerListResource.removeSpeaker);
app.post('/speakerList/:speakerRank/replies', authMiddleware.verifyToken, authMiddleware.verifyOrganization, SpeakerListResource.addReply);
app.delete('/speakerList/:speakerRank/replies/:replyRank', authMiddleware.verifyToken, authMiddleware.verifyOrganization, SpeakerListResource.deleteReply);
app.post('/speakerList/:speakerRank', authMiddleware.verifyToken, authMiddleware.verifyOrganization, SpeakerListResource.nextSpeaker);
app.put('/speakerList/:oldPlace', authMiddleware.verifyToken, authMiddleware.verifyOrganization, SpeakerListResource.moveSpeaker);

//Subject admin endpoints
app.post('/subject', authMiddleware.verifyToken, authMiddleware.verifyOrganization, SubjectResource.set);

//Message admin endpoints
app.post('/message', authMiddleware.verifyToken, authMiddleware.verifyOrganization, MessageResource.set);

//Representatives admin endpoints
app.post('/representatives', authMiddleware.verifyToken, authMiddleware.verifyOrganization, RepresentativesResource.add);
app.delete('/representatives/:speakerId', authMiddleware.verifyToken, authMiddleware.verifyOrganization, RepresentativesResource.delete);
app.delete('/representativesDeleteAll/IMSURE', authMiddleware.verifyToken, authMiddleware.verifyOrganization, RepresentativesResource.deleteAll);

//Statistics endpoints (read-only, but require organization validation)
app.get('/statistics/:field', authMiddleware.verifyOrganization, StatisticsResource.getRankedListByField);
app.get('/statistics/:field/:fromDate', authMiddleware.verifyOrganization, StatisticsResource.getRankedListByField);
app.get('/statistics/:field/:fromDate/:toDate', authMiddleware.verifyOrganization, StatisticsResource.getRankedListByField);

//Healthcheck
app.get('/status', HealthResource.get);
