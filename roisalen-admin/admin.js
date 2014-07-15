
function readFileToArray(files) {
	console.log("in file to array");
	var reader = new FileReader();
	reader.readAsText(files[0]);
	reader.onload = function(event) {
		var csvText = event.target.result;
		postSpeakersFromArray(csvText.csvToArray(), getSpeakers);
	};
	reader.onerror = errorHandler;


}

function errorHandler(evt) {
    if(evt.target.error.name == "NotReadableError") {
        alert("Canno't read file !");
    }
  }

function postSpeakersFromArray(csvAsArray, done) {
	console.log(csvAsArray)
	csvAsArray.forEach(postSpeakerFromArray);
	done();
}

function postSpeakerFromArray(entry) {
		var speaker = {};
		speaker.number = entry[0];
		speaker.name = entry[1];
		speaker.group = entry[2];
		speaker.sex = entry[3];
		$.post("http://127.0.0.1:8080/speakers",JSON.stringify(speaker));
}

function getSpeakers() {
	$.get("http://127.0.0.1:8080/speakers", parseAndShowSpeakers);
}

function parseAndShowSpeakers(data) {
	data.forEach(generateTableRowFromSpeaker);
}

function generateTableRowFromSpeaker(speaker) {
	var tableRow = "<tr>";
	tableRow += "<td>"+speaker.number+"</td>";
	tableRow += "<td>"+speaker.name+"</td>";
	tableRow += "<td>"+speaker.group+"</td>";
	tableRow += "<td>"+speaker.sex+"</td>";
	tableRow += "</tr">

	$("#representatives tr:last").after(tableRow);
}

function postSpeakerFromForm() {
	var number,name, group, sex;
	number = $("#number").val();
	name = $("#name").val();
	group = $("#group").val();
	sex = $("#sex").val();
	postSpeakerFromArray([number, name, group, sex]);
	getSpeakers();
};


getSpeakers();