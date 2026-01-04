var SpeakerQueue = require("./models/speakerqueue");
var RepresentativesResource = require("./representatives-resource");
var StatisticsService = require('./statistics-resource');
var validationMiddleware = require('./middleware/validation');
var auditMiddleware = require('./middleware/audit');

var speakerQueues = {};
var lastActivity = {}; // Track last activity timestamp for each organization
var INACTIVITY_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getSpeakerQueue(organisation) {
	// Validate organization first
	var orgValidation = validationMiddleware.validateOrganization(organisation);
	if (!orgValidation.valid) {
		return null;
	}

	var validatedOrg = orgValidation.sanitized;

	// Check if speaker list should be reset due to inactivity
	if (speakerQueues[validatedOrg] && lastActivity[validatedOrg]) {
		var timeSinceLastActivity = Date.now() - lastActivity[validatedOrg];
		if (timeSinceLastActivity > INACTIVITY_THRESHOLD) {
			// Reset speaker list after 24 hours of inactivity
			speakerQueues[validatedOrg] = new SpeakerQueue();
			delete lastActivity[validatedOrg];
		}
	}

	if (!speakerQueues[validatedOrg]) {
		speakerQueues[validatedOrg] = new SpeakerQueue();
	}

	// Update last activity timestamp
	lastActivity[validatedOrg] = Date.now();

	return speakerQueues[validatedOrg];
}

module.exports.getList = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var speakerQueue = getSpeakerQueue(organisation);
	
	if (!speakerQueue) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	res.status(200).json(speakerQueue.list);
	return next();
}

module.exports.addSpeaker = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var speakerQueue = getSpeakerQueue(organisation);
	
	if (!speakerQueue) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var speakerValidation = validationMiddleware.validateSpeakerNumber(req.body.speakerNumber);
	if (!speakerValidation.valid) {
		res.status(400).json({ error: speakerValidation.error });
		return next();
	}
	
	var addSpeakerToListIfSpeaker = function(speaker) {
		if (speaker) {
			if (speakerQueue.list.length === 0) {
				speaker.speaking = true;
			}
			speakerQueue.add(speaker);
			auditMiddleware.logAction('ADD_SPEAKER', organisation, {
				speakerNumber: speakerValidation.sanitized
			});
			res.status(200).json(speakerQueue.list);
			return next();
		}
		res.status(404).json({ error: 'Representative not found' });
		return next();
	}

	RepresentativesResource.getSpeakerFromDB(
		organisation, 
		speakerValidation.sanitized,
		addSpeakerToListIfSpeaker);	
}

module.exports.addReply = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var speakerQueue = getSpeakerQueue(organisation);
	
	if (!speakerQueue) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var replicantValidation = validationMiddleware.validateSpeakerNumber(req.body.replicantNumber);
	if (!replicantValidation.valid) {
		res.status(400).json({ error: replicantValidation.error });
		return next();
	}

	var speakerIndex = 0;
	
	// Validate speaker index exists
	if (speakerQueue.size() === 0) {
		res.status(400).json({ error: 'No speakers in queue' });
		return next();
	}

	RepresentativesResource.getSpeakerFromDB(organisation, replicantValidation.sanitized, function(replicant) {
		if (!replicant) {
			res.status(404).json({ error: 'Representative not found' });
			return next();
		}

		var speaker = speakerQueue.get(speakerIndex);
		if (!speaker) {
			res.status(404).json({ error: 'Speaker not found at index' });
			return next();
		}

		if (!speaker.replies) {
			speaker.replies = [];
		}

		speaker.replies.push(replicant);
		auditMiddleware.logAction('ADD_REPLY', organisation, {
			speakerIndex: speakerIndex,
			replicantNumber: replicantValidation.sanitized
		});
		res.status(200).json(speakerQueue.list);
		return next();
	});
};

module.exports.moveSpeaker = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var speakerQueue = getSpeakerQueue(organisation);
	
	if (!speakerQueue) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var oldPlaceValidation = validationMiddleware.validateIndex(req.params.oldPlace, speakerQueue.size());
	if (!oldPlaceValidation.valid) {
		res.status(400).json({ error: oldPlaceValidation.error });
		return next();
	}

	var newPlaceValidation = validationMiddleware.validateIndex(req.body.newPlace, speakerQueue.size());
	if (!newPlaceValidation.valid) {
		res.status(400).json({ error: newPlaceValidation.error });
		return next();
	}

	var oldPlace = oldPlaceValidation.sanitized;
	var newPlace = newPlaceValidation.sanitized;
	var speaker = speakerQueue.get(oldPlace);

	if (!speaker) {
		res.status(404).json({ error: 'Speaker not found at index' });
		return next();
	}

	if (oldPlace == 0 && speakerQueue.size() > 1) {
		speaker.speaking = false;
		var nextSpeaker = speakerQueue.get(1);
		if (nextSpeaker) {
			nextSpeaker.speaking = true;
		}
	} else if (newPlace == 0) {
		speaker.speaking = true;
		var currentFirst = speakerQueue.get(0);
		if (currentFirst) {
			if (currentFirst.speaking) {
				currentFirst.speaking = false;
			} else if (currentFirst.replies && currentFirst.replies.length > 0) {
				var currentReplicantIndex = getCurrentReplicantIndex(currentFirst.replies);
				if (currentReplicantIndex > -1 && currentFirst.replies[currentReplicantIndex]) {
					currentFirst.replies[currentReplicantIndex].speaking = false;
				}
			}
		}
	}

	speakerQueue.removeAt(oldPlace);
	speakerQueue.add(speaker, newPlace);

	auditMiddleware.logAction('MOVE_SPEAKER', organisation, {
		oldPlace: oldPlace,
		newPlace: newPlace
	});
	res.status(200).json(speakerQueue.list);
	return next();
};

function updateQueueWithNextSpeakerBasedOnSpeaker(currentSpeaker, speakerRank, speakerQueue) 
{
	currentSpeaker.speaking = false;
	if (currentSpeaker.replies && currentSpeaker.replies.length > 0) {
		if (currentSpeaker.replies[0]) {
			currentSpeaker.replies[0].speaking = true;
		}
	} else if (speakerRank + 1 < speakerQueue.size()) {
		var nextSpeaker = speakerQueue.get(parseInt(speakerRank) + 1);
		if (nextSpeaker) {
			nextSpeaker.speaking = true;
		}
		speakerQueue.removeAt(speakerRank);
	} else {
		speakerQueue.removeAt(speakerRank);
	}
}

function updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, replicantRank, speakerQueue) {
	if (!speaker.replies || speaker.replies.length === 0) {
		return;
	}

	if (parseInt(replicantRank) + 1 === speaker.replies.length) {
		if (speakerRank + 1 < speakerQueue.size()) {
			var nextSpeaker = speakerQueue.get(parseInt(speakerRank) + 1);
			if (nextSpeaker) {
				nextSpeaker.speaking = true;
			}
		}
		speakerQueue.removeAt(speakerRank);
	} else {
		if (speaker.replies[replicantRank]) {
			speaker.replies[replicantRank].speaking = false;
		}
		var nextReplicant = speaker.replies[parseInt(replicantRank) + 1];
		if (nextReplicant) {
			nextReplicant.speaking = true;
		}
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
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var speakerQueue = getSpeakerQueue(organisation);
	
	if (!speakerQueue) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var speakerRankValidation = validationMiddleware.validateIndex(req.params.speakerRank, speakerQueue.size());
	if (!speakerRankValidation.valid) {
		res.status(400).json({ error: speakerRankValidation.error });
		return next();
	}

	var speakerRank = speakerRankValidation.sanitized;
	var speaker = speakerQueue.get(speakerRank);

	if (!speaker) {
		res.status(404).json({ error: 'Speaker not found at index' });
		return next();
	}

	if (speaker.speaking) {
		StatisticsService.logRepresentativeSpoke(speaker, organisation);
		updateQueueWithNextSpeakerBasedOnSpeaker(speaker, speakerRank, speakerQueue);
		auditMiddleware.logAction('NEXT_SPEAKER', organisation, { speakerRank: speakerRank });
	} else if (speaker.replies && speaker.replies.length > 0) {
		var currentReplicantIndex = getCurrentReplicantIndex(speaker.replies);
		if (currentReplicantIndex > -1 && speaker.replies[currentReplicantIndex]) {
			StatisticsService.logRepresentativeReplied(speaker.replies[currentReplicantIndex], organisation);
			updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, currentReplicantIndex, speakerQueue);
			auditMiddleware.logAction('NEXT_REPLY', organisation, { speakerRank: speakerRank });
		} else {
			res.status(400).json({ error: 'No active reply found' });
			return next();
		}
	} else {
		res.status(400).json({ error: 'Speaker has no replies' });
		return next();
	}

	res.status(200).json(speakerQueue.list);
	return next();
}

module.exports.removeSpeaker = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var speakerQueue = getSpeakerQueue(organisation);
	
	if (!speakerQueue) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var speakerRankValidation = validationMiddleware.validateIndex(req.params.speakerRank, speakerQueue.size());
	if (!speakerRankValidation.valid) {
		res.status(400).json({ error: speakerRankValidation.error });
		return next();
	}

	var speakerRank = speakerRankValidation.sanitized;
	var speaker = speakerQueue.get(speakerRank);
	
	if (!speaker) {
		res.status(404).json({ error: 'Speaker not found at index' });
		return next();
	}
	
	removeSpeaker(speakerRank, speaker, speakerQueue);
	
	auditMiddleware.logAction('REMOVE_SPEAKER', organisation, { speakerRank: speakerRank });
	res.status(200).json(speakerQueue.list);
	return next();
}

function removeSpeaker(speakerRank, speaker, speakerQueue) {
	if (speakerRank == 0 && speakerQueue.size() > 1) {
		var nextSpeaker = speakerQueue.get(1);
		if (nextSpeaker) {
			nextSpeaker.speaking = true;
		}
	} 
	
	speakerQueue.removeAt(speakerRank);
}

module.exports.deleteReply = function(req, res, next) {
	var organisation = req.validatedOrganisation || req.header('X-organisation');
	var speakerQueue = getSpeakerQueue(organisation);
	
	if (!speakerQueue) {
		res.status(400).json({ error: 'Invalid organization' });
		return next();
	}

	var speakerRankValidation = validationMiddleware.validateIndex(req.params.speakerRank, speakerQueue.size());
	if (!speakerRankValidation.valid) {
		res.status(400).json({ error: speakerRankValidation.error });
		return next();
	}

	var speakerRank = speakerRankValidation.sanitized;
	var speaker = speakerQueue.get(speakerRank);

	if (!speaker) {
		res.status(404).json({ error: 'Speaker not found at index' });
		return next();
	}

	if (!speaker.replies || speaker.replies.length === 0) {
		res.status(400).json({ error: 'Speaker has no replies' });
		return next();
	}

	var replicantRankValidation = validationMiddleware.validateIndex(req.params.replyRank, speaker.replies.length);
	if (!replicantRankValidation.valid) {
		res.status(400).json({ error: replicantRankValidation.error });
		return next();
	}

	var replicantRank = replicantRankValidation.sanitized;
	var replicant = speaker.replies[replicantRank];

	if (!replicant) {
		res.status(404).json({ error: 'Reply not found at index' });
		return next();
	}
	
	if (replicant.speaking) {
		updateQueueWithNextSpeakerBasedOnReplicant(speaker, speakerRank, replicantRank, speakerQueue);
	} 
	
	speaker.replies.splice(replicantRank, 1);
	
	auditMiddleware.logAction('DELETE_REPLY', organisation, {
		speakerRank: speakerRank,
		replicantRank: replicantRank
	});
	res.status(200).json(speakerQueue.list);
	return next();
}
