var SpeakerQueue = require("./models/speakerqueue");
var RepresentativesResource = require("./representatives-resource");

var speakerQueue = new SpeakerQueue();

module.exports.getList = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.send(200, speakerQueue.list);
	return next();
}

module.exports.addSpeaker = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	RepresentativesResource.getSpeakerFromDB(parseInt(req.body), function(speaker) {
		if (speaker) {
			if (speakerQueue.list.length === 0) {
				speaker.speaking = true;
			}
			speakerQueue.add(speaker);
			res.send(200, speakerQueue.list);
			return next();
		}
		res.send(500);
		return next(err);
	});	
}

module.exports.addReply = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	var replicantId = parseInt(req.body);
	var speakerIndex = 0 //req.params.speakerRank;

	RepresentativesResource.getSpeakerFromDB(replicantId, function(speaker) {
		if (speaker) {
			var speaker = speakerQueue.get(speakerIndex);
			speaker.replies.push(speaker);
			res.send(200);
			return next();
		}
		res.send(500);
		return next(err);
	});
};

module.exports.nextSpeaker = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	var speaker = speakerQueue.get(req.params.speakerRank);
	if (speaker.replies.length > 0) {
		nextReplyOrMainSpeakerDone(speaker, req.params.speakerRank);
	} else {
		mainSpeakerDone(speaker, req.params.speakerRank);
	}

	res.send(200, speakerQueue.list);
	return next();
}

module.exports.removeSpeaker = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	speakerQueue.removeAt(req.params.speakerRank);
	res.send(200);
	return next();
}

module.exports.deleteReply = function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	speakerQueue.get(req.params.speakerRank).replies.splice(req.params.replyRank,1);
	res.send(200);
	return next();
}

function nextReplyOrMainSpeakerDone(speaker, speakerRank) {
	if (speaker.speaking) {
		speaker.speaking = false;
		speaker.replies[0].speaking = true;
	} else {
		var speakingIndex = 0;
		speaker.replies.forEach(function(reply, index, array) {
			if (reply.speaking) {
				speakingIndex = index;		
			}
		});

		if (speakingIndex + 1 === speaker.replies.length) {
			mainSpeakerDone(speaker,speakerRank)
		} else {
			speaker.replies[speakingIndex].speaking = false;
			speaker.replies[speakingIndex + 1].speaking = true;
		}	
	}
}

function mainSpeakerDone(speaker, speakerRank) {
	if (speakerRank + 1 < speakerQueue.size()) {
		var nextSpeaker = speakerQueue.get(parseInt(speakerRank) + 1);
		nextSpeaker.speaking = true;
	}
	speakerQueue.remove(speaker);
}