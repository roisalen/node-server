

var _speakersList = {};



function SpeakerRepository() {
	this.add = add;
	this.getSpeakers = getSpeakers;
	this.size = size;
	this.storeSpeakers = storeSpeakers;
    this.getSpeakerByNum = getSpeakerByNum;
    this.removeSpeakerByNum = removeSpeakerByNum;



	function getSpeakers() {
		if (size() === 0) {
			_speakersList = JSON.parse(localStorage.getItem('speakers'));
		}
		return $.extend({},_speakersList);
	}

	function add(speaker) {
		_speakersList[speaker.number] = speaker;
		storeSpeakers();
	}	 

	function storeSpeakers() {
		localStorage.setItem('speakers', JSON.stringify(_speakersList));
		console.log("speakers stored");
	}
	
	function size() { 
		return Object.keys(_speakersList).length;
	}

    function getSpeakerByNum(number) {
        try {
            return _speakersList[ number ];
        } finally {
            console.log("Error: Tried to get speaker number " + number + ", but it does not exist.");
            return null;
        }
    }

    function removeSpeakerByNum(number) {
        if(!(delete _speakersList[ number ])) {
        	console.log("Error: Tried to remove speaker number " + number +", but it does not exist.");
        }
    }

}
