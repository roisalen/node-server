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
	res.status(200).send(speakerQueue.list);
	return next();
}

module.exports.addSpeaker = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	
	var addSpeakerToListIfSpeaker = function(speaker) {
			if (speaker) {
				if (speakerQueue.list.length === 0) {
					speaker.speaking = true;
				}
				speakerQueue.add(speaker);
				res.status(200).send(speakerQueue.list);
				return next();
			}
			res.status(500).send();
			return next();
	}

	RepresentativesResource.getSpeakerFromDB(
		req.header('X-organisation'), 
		parseInt(req.body.speakerNumber),
		addSpeakerToListIfSpeaker);	
}

module.exports.addReply = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	var replicantId = parseInt(req.body.replicantNumber);
	var speakerIndex = 0 

	RepresentativesResource.getSpeakerFromDB(req.header('X-organisation'), replicantId, function(replicant) {
		if (replicant && speakerQueue.get(speakerIndex)) {
			var speaker = speakerQueue.get(speakerIndex);
            if (!speaker.replies) {
                res.status(500).send();
                return next();
            }
			speaker.replies.push(replicant);
			res.status(200).send(speakerQueue.list);
			return next();
		}
		res.status(500).send();
		return next();
	});
};

module.exports.moveSpeaker = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));

	var oldPlace = parseInt(req.params.oldPlace);
	var newPlace = parseInt(req.body.newPlace);

	if (oldPlace > speakerQueue.size() || newPlace > speakerQueue.size() ||
		oldPlace < 0 || newPlace < 0) {
		res.status(500);
		return next();
	}
	var speaker = speakerQueue.get(oldPlace);

	if (oldPlace == 0) {
		speaker.speaking = false;
		speakerQueue.get(1).speaking = true;
	} else if (newPlace == 0) {
		speaker.speaking = true;
		var currentFirst = speakerQueue.get(0);
		if (currentFirst.speaking) {
			currentFirst.speaking = false;
		} else {
			var currentReplicantIndex = getCurrentReplicantIndex(currentFirst.replies);
			if (currentReplicantIndex > -1) {
				currentFirst.replies[currentReplicantIndex].speaking = false;
			}
		}
	}

	speakerQueue.removeAt(oldPlace);
	speakerQueue.add(speaker, newPlace);

	res.status(200).send(speakerQueue.list);
	return next();
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

function updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, replicantRank, speakerQueue) {
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

	if (!speaker) {
		res.status(500);
		return next();
	}

	if (speaker.speaking) {
		StatisticsService.logRepresentativeSpoke(speaker, organisation);
		updateQueueWithNextSpeakerBasedOnSpeaker(speaker, speakerRank, speakerQueue);
	} else {
		var currentReplicantIndex = getCurrentReplicantIndex(speaker.replies);
		StatisticsService.logRepresentativeReplied(speaker.replies[currentReplicantIndex], organisation);
		updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, currentReplicantIndex, speakerQueue);
	}

	res.status(200).send(speakerQueue.list);
	return next();
}

module.exports.removeSpeaker = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	var speakerRank = req.params.speakerRank;

	if (speakerRank < 0 || speakerRank >= speakerQueue.size())
	{
		res.status(404).send();
		return next();
	}
	var speaker = speakerQueue.get(speakerRank)
	
	removeSpeaker(speakerRank, speaker, speakerQueue);
	
	res.status(200).send(speakerQueue.list);
	return next();
}

function removeSpeaker(speakerRank, speaker, speakerQueue) {
	if (speakerRank == 0 && speakerQueue.size() > 1) {
		speakerQueue.get(1).speaking = true;
	} 
	
	speakerQueue.removeAt(speakerRank);
}

module.exports.deleteReply = function(req, res, next) {
	var speakerQueue = getSpeakerQueue(req.header('X-organisation'));
	var speakerRank = req.params.speakerRank;
	var replicantRank = req.params.replyRank;
	var speaker = speakerQueue.get(speakerRank)

	if (!speaker) {
		res.status(404).send();
		return next;
	}

	var replicant = speaker.replies[replicantRank];

	if (!replicant) {
		res.status(404).send();
		return next;
	}
	
	if (replicant.speaking) {
		updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, replicantRank, speakerQueue);
	} 
	
	speaker.replies.splice(replicantRank,1);
	res.status(200).send(speakerQueue.list);
	return next();
}
