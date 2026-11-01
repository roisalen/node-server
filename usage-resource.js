var mongojs = require('mongojs');
var connection_string = process.env.MONGOLAB_URI || '127.0.0.1:27017/roisalen';
var db = mongojs(connection_string, ['statistics', 'organisations']);
var SpeakerListResource = require('./speaker-list-resource');

function adminConfigured() {
	var s = process.env.ROISALEN_ADMIN_SECRET;
	return s && String(s).length >= 8;
}

function enrichOrgNames(rows, nameByShort) {
	return rows.map(function (row) {
		var key = row.organisation;
		return Object.assign({}, row, {
			organisationName: nameByShort[key] || key
		});
	});
}

module.exports.getSummary = function (req, res, next) {
	if (!adminConfigured()) {
		res.status(503).json({
			error: 'Usage dashboard not configured',
			hint: 'Set ROISALEN_ADMIN_SECRET (min 8 characters) on the server'
		});
		return next();
	}
	if (req.header('X-Admin-Secret') !== process.env.ROISALEN_ADMIN_SECRET) {
		res.status(401).json({ error: 'Unauthorized' });
		return next();
	}

	var activeRaw = SpeakerListResource.getQueuesSnapshot();

	var thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	thirtyDaysAgo.setHours(0, 0, 0, 0);

	db.statistics.aggregate([
		{
			$match: {
				organisation: { $exists: true, $ne: '' },
				fullDate: { $gte: thirtyDaysAgo }
			}
		},
		{
			$group: {
				_id: '$organisation',
				eventCount: { $sum: 1 },
				lastActivity: { $max: '$fullDate' },
				firstActivityInPeriod: { $min: '$fullDate' }
			}
		},
		{ $sort: { lastActivity: -1 } }
	], function (err, recentAgg) {
		if (err) {
			console.log('Usage summary aggregate error:', err);
			res.status(500).json({ error: 'Failed to load usage statistics' });
			return next(err);
		}

		db.organisations.find({}, function (err2, orgs) {
			if (err2) {
				console.log('Usage summary organisations error:', err2);
				res.status(500).json({ error: 'Failed to load organisations' });
				return next(err2);
			}

			var nameByShort = {};
			(orgs || []).forEach(function (o) {
				var key = o.shortName || o._id;
				if (key) {
					nameByShort[String(key)] = o.name || String(key);
				}
			});

			var recentMeetings = (recentAgg || []).map(function (g) {
				return {
					organisation: g._id,
					eventCount: g.eventCount,
					lastActivity: g.lastActivity,
					firstActivityInPeriod: g.firstActivityInPeriod
				};
			});

			res.status(200).json({
				generatedAt: new Date().toISOString(),
				activeMeetings: enrichOrgNames(activeRaw, nameByShort),
				recentMeetingsLast30Days: enrichOrgNames(recentMeetings, nameByShort)
			});
			return next();
		});
	});
};
