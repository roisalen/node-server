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
	setSubject(req.header('X-organisation'), req.body.subject);
	res.status(201).send();
	return next();
}

module.exports.get = function(req, res, next) {
	res.status(200).send(getSubject(req.header('X-organisation')));
	return next();
}

module.exports.getSubject = getSubject;