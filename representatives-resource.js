var Speaker = require("./models/speaker");
var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, []);


function getSpeakerFromDB(organisation, speakerId, callBack) {
	var representatives = db.collection(organisation+"-representatives");
	representatives.findOne({number: speakerId}, function(err, success) {
		if (success){
			return callBack(success);
		}
		return callBack(false);
	});
}


module.exports.getSpeakerFromDB = getSpeakerFromDB;

module.exports.getAll = function(req, res, next) {
	var representatives = db.collection(req.header('X-organisation')+"-representatives");
	representatives.find().sort({number: 1}, function(err, success){
		if (success){
			res.status(200).send(success);
		} else{
			res.status(500).send();
			return next(err);
		}
	});
};

module.exports.get = function(req, res, next) {
	getSpeakerFromDB(req.header('X-organisation'), parseInt(req.params.speakerId), function(speaker) {
		if (speaker) {
			res.status(200).send(speaker);
			return next();
		} else {
			res.status(500).send();
			return next(err);
		}
	});
};

module.exports.delete = function(req, res, next) {
	var representatives = db.collection(req.header('X-organisation')+"-representatives");
	representatives.remove({number: parseInt(req.params.speakerId)}, function(err, success){
		if (success) {
			res.status(200).send();
			return next();
		} else {
			res.status(500).send();
		}

		return next(err);
	});
}

module.exports.deleteAll = function(req, res, next) {
	var representatives = db.collection(req.header('X-organisation')+"-representatives");
	representatives.remove({},function(err, success) {
		if (success) {
			console.log("deleted all");
			res.status(200).send();
		} else {
			res.status(500).send();
		}
		return next(err);
	});
}


module.exports.add = function(req, res, next) {
	var representatives = db.collection(req.header('X-organisation')+"-representatives");

	var speakerJson = req.body;
	var speaker = new Speaker(speakerJson.name, parseInt(speakerJson.number), speakerJson.sex, speakerJson.group);

	representatives.save(speaker, function(err, success) {
		console.log("Response success "+success);
		console.log('Response error '+err);
		if (success) {
			res.status(201).send(speaker);
			return next();
		} else {
			res.status(500).send();
			return next(err);
		}
	});
}