var mongojs = require("mongojs");
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['statistics']);
var SubjectResource = require('./subject-resource');

function logRepresentativeSpoke(representative, organisation) {
	var logEntry = representative;
	delete logEntry._id;
	logEntry.speakingType = "main";
	logEntry.organisation = organisation;
	saveLogEntry(logEntry);
}

function saveLogEntry(logEntry) {
	var today = new Date();
	logEntry.fullDate = today;
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
	delete logEntry._id;
	logEntry.speakingType = "reply";
	logEntry.organisation = organisation;
	saveLogEntry(logEntry);
}

function getRankedListByField(req, res, next) {
	var fromDate, toDate;
	if(req.params.fromDate) {
		var dateParams = req.params.fromDate.split('-');
		fromDate = new Date(dateParams[2], dateParams[1], dateParams[0]);
	} else {
		//Setting default to be logentries for today
		fromDate = new Date();
		fromDate.setHours(0,0,0,0);
	}

	if (req.params.toDate) {
		var dateParams = req.params.toDate.split('-');
		toDate = new Date(dateParams[2], dateParams[1], dateParams[0]);
	} else {
		toDate = new Date();
	}

	db.statistics.aggregate([
	{
		$match: {
			organisation : req.header('X-organisation'),
			fullDate: {$gte: fromDate, $lte: toDate}
		}
	},
	{ 
		$group: { 
			_id : "$" + req.params.field,
			mainEntries: { 
				$sum: { 
					$cond : 
						[{$eq : ["$speakingType", "main"]}, 1, 0]
				}
			},
			replies: { 
				$sum: { 
					$cond : 
						[{$eq : ["$speakingType", "reply"]}, 1, 0]
				}
			},

			speakers:  { $addToSet : "$name"},
			subjects: { $addToSet : "$subject"},
			dates: { $addToSet : "$date"},
			groups: { $addToSet: "$group"},
			organisations: { $addToSet: "$organisation" },
			sexes: { $addToSet: "$sex"}
		}
	},		
	{ $sort: {mainEntries: -1, replies: -1}}
	], function(err, groupsRanked) {
		if( err ) {
			console.log("Statistics: Could not get aggregate of " + req.params.field + " , error: " + err);
			res.status(500).send();
			return next(err);
		} else {
			res.status(200).send(groupsRanked);
			return next()
		} 
	});
}


module.exports.logRepresentativeSpoke = logRepresentativeSpoke;
module.exports.logRepresentativeReplied = logRepresentativeReplied;
module.exports.getRankedListByField = getRankedListByField;