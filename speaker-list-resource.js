var SpeakerQueue = require("./models/speakerqueue");
var RepresentativesResource = require("./representatives-resource");
var StatisticsService = require('./statistics-resource');

var speakerQueues = {};

function getSpeakerQueue(organisation) {
	if (!speakerQueues[organisation]) {
		speakerQueues[organisation] = new SpeakerQueue();
	}
	return speakerQueues[organisation];
}

module.exports.getList = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	res.send(200, speakerQueue.list);
	return next();
}

module.exports.addSpeaker = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	
	RepresentativesResource.getSpeakerFromDB(req.header('X-organisation'), parseInt(req.body), function(speaker) {
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
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	var replicantId = parseInt(req.body);
	var speakerIndex = 0 //req.params.speakerRank;

	RepresentativesResource.getSpeakerFromDB(req.header('X-organisation'), replicantId, function(replicant) {
		if (replicant) {
			var speaker = speakerQueue.get(speakerIndex);
			speaker.replies.push(replicant);
			res.send(200);
			return next();
		}
		res.send(500);
		return next(err);
	});
};

module.exports.nextSpeaker = function(req, res, next) {
	var organisation = req.header('X-organisation')
	var speakerQueue = getSpeakerQueue(organisation);
	var speaker = speakerQueue.get(req.params.speakerRank);
	handleSpeakerOrReplicantDone(speaker, req.params.speakerRank, organisation);
	res.send(200, speakerQueue.list);
	return next();
}

module.exports.removeSpeaker = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	speakerQueue.removeAt(req.params.speakerRank);
	res.send(200);
	return next();
}

module.exports.deleteReply = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	speakerQueue.get(req.params.speakerRank).replies.splice(req.params.replyRank,1);
	res.send(200);
	return next();
}

function handleSpeakerOrReplicantDone(speaker, speakerRank, organisation) {
	if (speaker.speaking) {
		StatisticsService.logRepresentativeSpoke(speaker, organisation);
		handleSpeakerDoneSpeaking(speaker, speakerRank, organisation);
	} else {
		var currentReplicantIndex = getCurrentReplicantIndex(speaker.replies);
		StatisticsService.logRepresentativeReplied(speaker.replies[currentReplicantIndex], organisation);
		handleReplicantDoneSpeaking(speaker, speakerRank, currentReplicantIndex, organisation);
	}
}

function handleSpeakerDoneSpeaking(speaker, speakerRank, organisation) {
	speaker.speaking = false;
	if (speaker.replies.length > 0) {
		speaker.replies[0].speaking = true;
	} else {
		speakerAndAllRepliesDone(speaker, speakerRank, organisation);
	}
}

function handleReplicantDoneSpeaking(speaker, speakerRank, currentReplicantIndex, organisation) {
	if (currentReplicantIndex + 1 === speaker.replies.length) {
		speakerAndAllRepliesDone(speaker,speakerRank, organisation)
	} else {
		speaker.replies[currentReplicantIndex].speaking = false;
		speaker.replies[currentReplicantIndex + 1].speaking = true;
	}	
}

function getCurrentReplicantIndex(replies) {
	var replicantSpeakingIndex = -1;
	replies.forEach(function(reply, index, array) {
		if (reply.speaking) {
			replicantSpeakingIndex = index;		
		}
	});

	return replicantSpeakingIndex;
}

function speakerAndAllRepliesDone(speaker, speakerRank, organisation) {
	var speakerQueue = getSpeakerQueue(organisation);
	if (speakerRank + 1 < speakerQueue.size()) {
		var nextSpeaker = speakerQueue.get(parseInt(speakerRank) + 1);
		nextSpeaker.speaking = true;
	}
	speakerQueue.remove(speaker);
}