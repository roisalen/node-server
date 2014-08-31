var restify = require('restify');

var SpeakerListResource = require('./speaker-list-resource');
var SubjectResource = require('./subject-resource');
var RepresentativesResource = require('./representatives-resource')

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

var PATH = "/speakers";

//Representatives endpoints
server.get({path: "/speakers", version: "0.0.1"}, RepresentativesResource.getAll);
server.get({path: "/speakers/:speakerId", version: "0.0.1"}, RepresentativesResource.get);
server.del({path: "/speakers/:speakerId", version: "0.0.1"}, RepresentativesResource.delete);
server.del({path: "/speakersDeleteAll/IMSURE", version: "0.0.1"}, RepresentativesResource.deleteAll);
server.post({path: "/speakers", version: "0.0.1"}, RepresentativesResource.add);

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