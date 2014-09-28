var subjectMap = {};

var getSubject = function(organisation) {
	if (!subjectMap[organisation]) {
		subjectMap[organisation] = ""
	}

	return subjectMap[organisation];
}

var setSubject = function(organisation, subject) {
	subjectMap[organisation] = subject;
}
module.exports.set = function(req, res, next) {
	setSubject(req.header('X-organisation'), req.body);
	res.send(201);
	return next();
}

module.exports.get = function(req, res, next) {
	res.send(200, getSubject(req.header('X-organisation')));
	return next();
}