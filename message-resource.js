var messageMap = {};

var getMessage = function(organisation) {
	if (!messageMap[organisation]) {
		messageMap[organisation] = ""
	}

	return messageMap[organisation];
}

var setMessage = function(organisation, subject) {
	messageMap[organisation] = subject;
}
module.exports.set = function(req, res, next) {
	setMessage(req.header('X-organisation'), req.body.message);
	res.status(201).send(getMessage(req.header('X-organisation')));
	return next();
}

module.exports.get = function(req, res, next) {
	res.status(200).send(getMessage(req.header('X-organisation')));
	return next();
}
