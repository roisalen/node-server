var Speaker = require("./models/speaker");
var mongojs = require("mongojs");

var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/myapp';
var db = mongojs(connection_string, ['myapp']);
var speakers = db.collection("speakers");


module.exports.getSpeakerFromDB = function(speakerId,callBack) {
	speakers.findOne({number: speakerId}, function(err, success) {
		if (success){
			return callBack(success);
		}
		return callBack(false);
	});
}

module.exports.getAll = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	speakers.find().sort({number: 1}, function(err, success){
		if (success){
			res.send(200, success);
		} else{
			res.send(500);
			return next(err);
		}
	});
};

module.exports.get = function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	module.exports.getSpeakerFromDB(parseInt(req.params.speakerId), function(speaker) {
		if (speaker) {
			res.send(200, speaker);
			return next();
		} else {
			res.send(500);
			return next(err);
		}
	});
};

module.exports.delete = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	speakers.remove({number: parseInt(req.params.speakerId)}, function(err, success){
		if (success) {
			res.send(200);
			return next();
		} else {
			res.send(500);
		}

		return next(err);
	});
}

module.exports.deleteAll = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	speakers.remove({},function(err, success) {
		if (success) {
			console.log("deleted all");
			res.send(200);
		} else {
			res.send(500);
		}
		return next(err);
	});
}


module.exports.add = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	console.log(req.body);
	var speakerJson = req.body;
	console.log(speakerJson);
	var speaker = new Speaker(speakerJson.name, parseInt(speakerJson.number), speakerJson.sex, speakerJson.group);
	
	res.setHeader('Access-Control-Allow-Origin', '*');
	speakers.save(speaker, function(err, success) {
		console.log("Response success "+success);
		console.log('Response error '+err);
		if (success) {
			res.send(201, speaker);
			return next();
		} else {
			res.send(500);
			return next(err);
		}
	});
}