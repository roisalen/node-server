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
			res.send(200, speakerQueue.list);
			return next();
		}
		res.send(500);
		return next(err);
	});
};

function updateQueueWithNextSpeakerBasedOnSpeaker(currentSpeaker, speakerRank, speakerQueue) 
{
	currentSpeaker.speaking = false;
	if (currentSpeaker.replies.length > 0) {
		currentSpeaker.replies[0].speaking = true;
	} else if (speakerRank + 1 < speakerQueue.size()) {
		speakerQueue.get(parseInt(speakerRank) + 1).speaking = true;
		speakerQueue.removeAt(speakerRank);
	} else {
		speakerQueue.removeAt(speakerRank);
	}
}

function updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, replicantRank, speakerQueue) 
{
	if (parseInt(replicantRank) + 1 === speaker.replies.length) {
		if (speakerRank + 1 < speakerQueue.size()) {
			speakerQueue.get(parseInt(speakerRank) + 1).speaking = true;
		}
		speakerQueue.removeAt(speakerRank);
	} else {
		speaker.replies[replicantRank].speaking = false;
		speaker.replies[parseInt(replicantRank) + 1].speaking = true;
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

module.exports.nextSpeaker = function(req, res, next) {
	var organisation = req.header('X-organisation')
	var speakerQueue = getSpeakerQueue(organisation);
	var speakerRank = req.params.speakerRank;
	var speaker = speakerQueue.get(speakerRank);

	if (speaker.speaking) {
		StatisticsService.logRepresentativeSpoke(speaker, organisation);
		updateQueueWithNextSpeakerBasedOnSpeaker(speaker, speakerRank, speakerQueue);
	} else {
		var currentReplicantIndex = getCurrentReplicantIndex(speaker.replies);
		StatisticsService.logRepresentativeReplied(speaker.replies[currentReplicantIndex], organisation);
		updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, currentReplicantIndex, speakerQueue);
	}

	res.send(200, speakerQueue.list);
	return next();
}

module.exports.removeSpeaker = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	var speakerRank = req.params.speakerRank;
	var speaker = speakerQueue.get(speakerRank)

	if (!speaker) {
		res.send(404);
		return next();
	}
	
	if (speaker.speaking) {
		updateQueueWithNextSpeakerBasedOnSpeaker(speaker, speakerRank, speakerQueue);
	} else {
		speakerQueue.removeAt(speakerRank);
	}
	res.send(200, speakerQueue.list);
	return next();
}

module.exports.deleteReply = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	var speakerRank = req.params.speakerRank;
	var replicantRank = req.params.replyRank;
	var speaker = speakerQueue.get(speakerRank)

	if (!speaker) {
		res.send(404);
		return next;
	}

	var replicant = speaker.replies[replicantRank];

	if (!replicant) {
		res.send(404);
		return next;
	}
	
	if (replicant.speaking) {
		updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, replicantRank, speakerQueue);
	} 
	
	speaker.replies.splice(replicantRank,1);
	res.send(200, speakerQueue.list);
	return next();
}



