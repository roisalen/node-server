var subject = "";

module.exports.set = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	subject = req.body;
	res.send(201);
	return next();
}

module.exports.get = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.send(200, subject);
	return next();
}