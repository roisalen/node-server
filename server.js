var restify = require('restify');
var mongojs = require("mongojs");
var Speaker = require("./models/speaker");
var SpeakerListResource = require('./speaker-list-resource');
var SubjectResource = require('./subject-resource');

var preflightEnabler = require('se7ensky-restify-preflight');

var ip_addr = '';
var port    =  process.env.PORT || '8080';
 
var server = restify.createServer({
    name : "roisalen"
});


 
server.listen(port, function(){
    console.log('%s listening at %s ', server.name , server.url);
});

preflightEnabler(server);
server.use(restify.queryParser());
server.use(restify.bodyParser());

var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/myapp';
var db = mongojs(connection_string, ['myapp']);
var speakers = db.collection("speakers");

var PATH = "/speakers";

//Representatives endpoints
server.get({path: "/speakers", version: "0.0.1"}, getAllSpeakers);
server.get({path: "/speakers/:speakerId", version: "0.0.1"}, getSpeaker);
server.del({path: "/speakers/:speakerId", version: "0.0.1"}, deleteSpeaker);
server.del({path: "/speakersDeleteAll/IMSURE", version: "0.0.1"}, deleteAllSpeakers);
server.post({path: "/speakers", version: "0.0.1"}, createNewSpeaker);

//Speakerlist endpoints
server.get({path: "/speakerList", version: "0.0.1"}, SpeakerListResource.getList);
server.post({path: "/speakerList", version: "0.0.1"}, SpeakerListResource.addSpeaker);
server.del({path: "/speakerList/:speakerRank", version: "0.0.1"}, SpeakerListResource.removeSpeaker);
server.post({path: "/speakerList/:speakerRank/replies", version: "0.0.1"}, SpeakerListResource.addReply);
server.del({path: "/speakerList/:speakerRank/replies/:replyRank", version: "0.0.1"}, SpeakerListResource.deleteReply);
server.post({path: "/speakerList/:speakerRank", version: "0.0.1"}, SpeakerListResource.nextSpeaker);

//Subject endpoints
server.post({path: "/subject", version: "0.0.1"}, SubjectResource.set);
server.get({path: "/subject", version: "0.0.1"}, SubjectResource.get);




function getAllSpeakers(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	speakers.find().sort({number: 1}, function(err, success){
		//console.log("Response success "+success);
		//console.log("Response error "+err);
		if (success){
			res.send(200, success);
		} else{
			res.send(500);
			return next(err);
		}
	});
}

function getSpeaker(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	speakers.findOne({number: parseInt(req.params.speakerId)}, function(err, success) {
		//console.log("Response success "+success);
		//console.log("Response error "+err);
		if (success){
			res.send(200, success);
			return next();
		}
		res.send(500);
		return next(err);
	});
}

function deleteSpeaker(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');

	console.log("Hepp");
	speakers.remove({number: parseInt(req.params.speakerId)}, function(err, success){
		if (success) {
			res.send(200);
		} else {
			res.send(500);
		}

		return next(err);
	});
}

function deleteAllSpeakers(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');

	console.log("Hepp");
	
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


function createNewSpeaker(req, res, next) {
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



