var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['statistics']);
var SubjectResource = require('./subject-resource');

function logRepresentativeSpoke(representative, organisation) {
	var logEntry = representative;
	logEntry.speakingType = "main";
	logEntry.organisation = organisation;
	saveLogEntry(logEntry);
}

function saveLogEntry(logEntry) {
	var today = new Date();
	logEntry._id = today.getTime();
	logEntry.date = today.getDate() + "." + today.getMonth() + "." + today.getFullYear();
	logEntry.time = today.getHours() + "." + today.getMinutes();
	logEntry.subject = SubjectResource.getSubject(logEntry.organisation);
	db.statistics.save(logEntry, function(err, saved) {
  		if( err || !saved ) console.log("Statistics: LogEntry not saved");
  		else console.log("Statistics: LogEntry saved");
  	});
}

function logRepresentativeReplied(representative, organisation) {
	var logEntry = representative;
	logEntry.speakingType = "reply";
	logEntry.organisation = organisation;
	saveLogEntry(logEntry);
}

function getRankedListOfSpeakers(req, res, next) {

	db.statistics.aggregate([
		{ $group: { 
			_id : "$sex",
			count: { $sum: 1}
			}
		},
		{ $sort: {count: -1}}
	], function(err, speakersRanked) {
		if( err ) {
			console.log("Statistics: Could not get aggregate of speakers, error: ");
			res.send(500);
			return next(err);
		} else {
			res.send(200, speakersRanked);
			return next()
		} 
	});
}



module.exports.logRepresentativeSpoke = logRepresentativeSpoke;
module.exports.logRepresentativeReplied = logRepresentativeReplied;
module.exports.getRankedListOfSpeakers = getRankedListOfSpeakers;