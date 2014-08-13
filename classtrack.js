if (true) { // variable declaration
	var xmlCurrentStudent;
  var studentHash;
	var studentRow;
	var studentColumn;

	var opaqueXmlMobileGuesses;
	var xmlMobileGuesses;
  var xmlCurrentTest;

	var testFinished = 1;
	var testId = 5; // TODO un-hardcore this
	var numberOfQuestions;
	var numberOfChoices = 1;

	var dynaDivBig;
	var dynaDiv;
	var backgroundImage;
	var previousWidth;
	var previousHeight;
	
	var currentOpenQuestion;
	var shrunkQuestionHeight;
	var expandedQuestionTop;

	var choiceInputsArray = new Array(new Array(), new Array());
}

function init() { // TODO does it load xml files twice on start-up? //
	screenWidth = $("#rootDiv").innerWidth(); // jquery magic
	screenHeight = $("#rootDiv").innerHeight();
	previousWidth = screenWidth;
	previousHeight = screenHeight;

	ChangeCss(".questionandguess", "width", (screenWidth-300) + "px");

	if (true) { // read student row and column from URL //
		if (window.location.href.split("?")[1] == undefined) {
			document.getElementById("summaryDiv").innerHTML = "No student number given. Cannot load."; // was "Loading..."		
			return;
		}
		studentHash = window.location.href.split("?")[1].split("=")[1]; // read student id from query string
		if ($.isNumeric(window.location.href.split("?")[1].split("=")[1]) == false) {
			document.getElementById("summaryDiv").innerHTML = "Bad student number given. Cannot load."; // was "Loading..."		
			return;
		}
		studentHash = Math.round(Math.sqrt((Math.floor(studentHash/100) + (studentHash%100)*100 - 1234)/4))-5; // unhash student ID, 0-indexed
		studentRow = (studentHash%7+1);
		studentColumn = (Math.floor(studentHash/7)+1);
	}

	if (true) { // // Background gradient // //
		var canvas = document.getElementById('rootCanvas');
		var context = canvas.getContext('2d');
		context.rect(0, 0, canvas.width, canvas.height);

		var grd = context.createRadialGradient(238, 150, 0, 238, 150, 300);

//		grd.addColorStop(0,   'rgba(140, 11,  191, 0.5)');   // purple
//		grd.addColorStop(0.3, 'rgba(242, 139, 5,   0.5)');   // orange
//		grd.addColorStop(0.6, 'rgba(33,  66,  99,  0.25)');  // dark blue
//		grd.addColorStop(1,   'rgba(0,   0,   0,   0.25)');  // black

// grey
//		grd.addColorStop(0, 'rgba(200,200,200, 0.15)');
//		grd.addColorStop(1, 'rgba(50,50,50, 0.15)');

// subtle blue
		grd.addColorStop(0,   'rgba(134, 203, 236, 0.5)');	// light blue
		grd.addColorStop(0.7, 'rgba(79, 136, 166, 0.05)');	// dark blue
		grd.addColorStop(1,   'rgba(0, 0, 0, 0.05)');	// dark blue


		context.fillStyle = grd;
		context.fill();
	}

	// Fill xmlCurrentTest and set numberOfQuestions and numberOfChoices //
	AjaxTestCall();

	// Fills xmlCurrentStudent //
	setInterval(function(){LoadServerGuesses();},300);

	setInterval(function(){LoadMobileGuesses();},300);

	// Modifies xmlCurrentStudent //
	// TallyData(); // called in Load functions now

	CreateLayout();

	PopulateLayout();

	window.scrollTo(0,0);

	setInterval(CheckBrowserSize, 500);

} // init function


function AjaxTestCall() {
	var xmlTests;
	var xmlResponseData;
	var xmlhttpData2=new XMLHttpRequest();
	xmlhttpData2.onreadystatechange=function() {
		if (xmlhttpData2.readyState==4 && xmlhttpData2.status==200) {
			xmlResponseData = xmlhttpData2.responseXML;
			xmlTests = xmlResponseData.getElementsByTagName("test");
		}
	}
	xmlhttpData2.open("GET","data/tests.xml",false);
	xmlhttpData2.send();

	for (i=0; i<xmlTests.length; i++) { // for each test in the xml
		if (testId == xmlTests[i].getAttribute("id")) { // if this is the one we're using now
			xmlCurrentTest = xmlTests[i]; // make it the current test
		}
	} // j for look for each answer set
	numberOfQuestions = xmlCurrentTest.getElementsByTagName("question").length;

	for (i=0; i<numberOfQuestions; i++) { // for each question in the current test
		numberOfChoices = Math.max(numberOfChoices, xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("choice").length);
	}
}

function LoadMobileGuesses() {
	var d=new Date();
	var now=d.toISOString();
	var parser=new DOMParser();
	var mobileGuessesFileName = "data/mobileC" + studentColumn + "R" + studentRow + ".xml";
	if (fileExists(mobileGuessesFileName)) {
		xmlhttpData=new XMLHttpRequest();
		xmlhttpData.onreadystatechange=function() {
			if (xmlhttpData.readyState==4) {
				if (xmlhttpData.status==200) {
					xmlMobileGuesses = xmlhttpData.responseXML; // must be text, or colons in the date will drop elements
//					xmlMobileGuesses = xmlMobileGuesses.replace(/:/g,"C")
//					xmlMobileGuesses = parser.parseFromString(xmlMobileGuesses.toString(),"text/xml");
//	console.log(" ~~~ ~~~ Just after load ~~~ ~~~");
//	console.log(xmlMobileGuesses.documentElement);
//	console.log(" ~~~ ~~~ ~~~ ~~~ ~~~ ~~~ ~~~ ~~~");
					TallyData();
				}
				else { // This should never happen with the fileExists check //
					console.log('This should never happen with the fileExists check');
					xmlMobileGuesses = parser.parseFromString('<guesses><student column=	"' + studentColumn + '" row="' + studentRow + '" time="' + now + '" /></guesses>',"text/xml");
					TallyData();
				}
			}
		}
		xmlhttpData.open("GET",mobileGuessesFileName + "?forceRefresh="+now,false);
		xmlhttpData.setRequestHeader("Cache-Control", "max-age=0");
		xmlhttpData.send();
	}

	else {
		console.log('Could not load mobile guesses file');
		var parser=new DOMParser();
		xmlMobileGuesses = parser.parseFromString('<guesses><student column=	"' + studentColumn + '" row="' + studentRow + '" time="' + now + '" /></guesses>',"text/xml");
		TallyData();
	}

	PopulateLayout();
//	console.log(xmlMobileGuesses.documentElement);
}

function LoadServerGuesses() {
	var d=new Date();
	var now=d.toISOString();
	var xmlResponseData;
	var xmlStudents;
	var xmlhttpData=new XMLHttpRequest();
	xmlhttpData.onreadystatechange=function() {
	  if (xmlhttpData.readyState==4 && xmlhttpData.status==200) {
			xmlResponseData = xmlhttpData.responseXML;
									//console.log(xmlhttpData.responseXML);
			xmlStudents = xmlResponseData.getElementsByTagName("student");
      for (var i=0; i<xmlStudents.length; i++) {
        if (xmlStudents[i].getAttribute("row") == studentRow && xmlStudents[i].getAttribute("column") == studentColumn) {
          xmlCurrentStudent = xmlStudents[i];
									//console.log(xmlCurrentStudent);
					TallyData();
        }
      }
		}
		else { // TODO raise warning, server data not loaded
			TallyData();
		}
	}
	xmlhttpData.open("GET","data/guesses.xml?forceRefresh="+now,false);
	xmlhttpData.setRequestHeader("Cache-Control", "max-age=0");
	//xmlhttpData.header(“Pragma: no-cache”);
	//xmlhttpData.header(“cache-Control: no-cache, must-revalidate”);
	//xmlhttpData.header(“Expires: Mon, 12 Jul 2010 03:00:00 GMT”);
	xmlhttpData.send();
}

function TallyData() {
	// // Remove duplicate guesses that are older // //
	
//	console.log(xmlMobileGuesses.getElementsByTagName("guess")[0])
	var mobileQuestion;
	var mobileTime;
	var serverQuestion;
	var serverTime;
	if (xmlMobileGuesses) var xmlMobileGuessesToTrim = xmlMobileGuesses.cloneNode(true);


	if (true) {
		if(xmlCurrentStudent) {
				if(xmlMobileGuesses) {
					for (mobileLoop = (xmlMobileGuesses.getElementsByTagName("guess").length-1); mobileLoop >= 0 ; mobileLoop--) { // mobileLoop is a mobile guess
						mobileQuestion = xmlMobileGuesses.getElementsByTagName("guess")[mobileLoop].getAttribute("question");
						mobileTime = xmlMobileGuesses.getElementsByTagName("guess")[mobileLoop].getAttribute("time");
						for (serverLoop = (xmlCurrentStudent.getElementsByTagName("guess").length-1); serverLoop >= 0 ; serverLoop--) { // serverLoop is a server-stored guess
							serverQuestion = xmlCurrentStudent.getElementsByTagName("guess")[serverLoop].getAttribute("question");
							serverTime = xmlCurrentStudent.getElementsByTagName("guess")[serverLoop].getAttribute("time");
							if (mobileQuestion == serverQuestion) {
								if (Date.parse(mobileTime) > Date.parse(serverTime)) {
									xmlCurrentStudent.removeChild(xmlCurrentStudent.getElementsByTagName("guess")[serverLoop]);
								}
								else {
									xmlMobileGuessesToTrim.documentElement.getElementsByTagName("student")[0].removeChild(xmlMobileGuessesToTrim.getElementsByTagName("guess")[mobileLoop]);
								}
							} // if the mobile and server question match
						} // for each guess in xmlCurrentStudent
					}

					var mobileElementsToMove = xmlMobileGuessesToTrim.getElementsByTagName("guess").length;
					for (var i=0; i < mobileElementsToMove; i++) { // i is a mobile guess
						xmlCurrentStudent.appendChild(xmlMobileGuessesToTrim.getElementsByTagName("guess")[i].cloneNode(true));
					}
				} // if xmlMobileGuesses exists
				else { // only have server data
					// xmlCurrentStudent is already set correctly
				}
			} // if xmlCurrentStudent exists
			else xmlCurrentStudent = xmlMobileGuessesToTrim; // no server info, so nothing to trim, use mobile only
	} // if true

if (false) {	
	var tempMobileGuess = null;
	var tempServerGuess = null;
	var xmlCloneBucket = parser.parseFromString('<guesses><student column=	"' + studentColumn + '" row="' + studentRow + '" time="' + now + '" /></guesses>',"text/xml");
	for (questionNumberLooper = 1; questionNumberLooper <= numberOfQuestions; questionNumberLooper++) {
		tempMobileGuess = null;
		tempServerGuess = null;
		for (mobileGuessesLooper = (xmlMobileGuesses.getElementsByTagName("guess").length); mobileGuessesLooper > 0; mobileGuessesLooper--) {
			mobileQuestion = xmlMobileGuesses.getElementsByTagName("guess")[mobileLoop].getAttribute("question");
			mobileTime = xmlMobileGuesses.getElementsByTagName("guess")[mobileLoop].getAttribute("time");
			for (serverGuessesLooper = xmlCurrentStudent.getElementsByTagName("guess").length; serverGuessesLooper > 0; serverGuessesLooper--) {
				serverQuestion = xmlCurrentStudent.getElementsByTagName("guess")[serverLoop].getAttribute("question");
				serverTime = xmlCurrentStudent.getElementsByTagName("guess")[serverLoop].getAttribute("time");
			}
		}
	}
}
//	xmlCurrentStudent
//	console.log(xmlMobileGuesses.documentElement);
}


function CreateLayout() {

	var dynaDivBig;
	var dynaDivField;
	var dynaInput;
	var dynaDivSubmit;
	var dynaButton;

	for (i = 0; i<numberOfQuestions; i++) { // for each question, make the beautiful white box

		// The top parent div //
		dynaDivBig = document.createElement("div");
		dynaDivBig.className      = "questionAndGuess";
		dynaDivBig.id             = "questionAndGuess"+(i+1);
		document.body.appendChild(dynaDivBig);

		dynaDivField = document.createElement("div");
		dynaDivField.className    = "field";
		dynaDivField.id           = "questionField"+(i+1);
		dynaDivBig.appendChild(dynaDivField);

		dynaInput = document.createElement("input");
		dynaInput.type            = "text";
		dynaInput.name            = i.toString();
		dynaInput.onfocus         = function () {this.blur();};
		dynaInput.onclick         = function () {expandChoicesArea(this);};
		dynaInput.id              = "questionInput"+(i+1);
		dynaDivField.appendChild(dynaInput);

		dynaInput = document.createElement("i");
		dynaInput.innerText       = "Question";
		dynaInput.name            = i.toString();
		dynaInput.onfocus         = function () {this.blur();};
		dynaInput.onclick         = function () {expandChoicesArea(this);};
		dynaDivField.appendChild(dynaInput);

		dynaDivField = document.createElement("div");
		dynaDivField.className    = "field";
		dynaDivField.id           = "answerField"+(i+1);
		dynaDivBig.appendChild(dynaDivField);

		dynaInput = document.createElement("input");
		dynaInput.type            = "text";
		dynaInput.name            = i.toString();
		dynaInput.onfocus         = function () {this.blur();}; 
		dynaInput.onclick         = function () {expandChoicesArea(this);};
		dynaInput.id              = "answerInput"+(i+1);
		dynaDivField.appendChild(dynaInput);

		dynaInput = document.createElement("i");
		dynaInput.innerText       = "Answer";
		dynaInput.name            = i.toString();
		dynaInput.onfocus         = function () {this.blur();}; 
		dynaInput.onclick         = function () {expandChoicesArea(this);};
		dynaInput.id              = "answerSmallBox"+(i+1);
		dynaDivField.appendChild(dynaInput);

		dynaDivField = document.createElement("div");
		dynaDivField.className    = "field";
		dynaDivField.id           = "reasonField"+(i+1);
		dynaDivBig.appendChild(dynaDivField);

		dynaInput = document.createElement("input");
		dynaInput.type            = "text";
		dynaInput.id              = "reasonInput"+(i+1);
		dynaInput.name            = i.toString();
		dynaInput.onfocus         = function () {this.blur();};
		dynaInput.onclick         = function () {expandChoicesArea(this);};
		dynaDivField.appendChild(dynaInput);

		dynaInput = document.createElement("i");
		dynaInput.id              = "reasonSmallBox"+(i+1);
		dynaInput.innerText       = "Reason";
		dynaInput.name            = i.toString();
		dynaInput.onfocus         = function () {this.blur();};
		dynaInput.onclick         = function () {expandChoicesArea(this);};
		dynaDivField.appendChild(dynaInput);

		dynaDivField = document.createElement("div");
		dynaDivField.className    = "field";
		dynaDivField.id           = "choicesField"+(i+1);
		dynaDivBig.appendChild(dynaDivField);

		dynaDivSubmit = document.createElement("div");
		dynaDivSubmit.className   = "submit";
		dynaDivSubmit.id          = "submitDiv"+(i+1);
		dynaDivBig.appendChild(dynaDivSubmit);

		dynaButton = document.createElement("button");
		dynaButton.id             = "submitButton"+(i+1);
		dynaButton.name           = i.toString();
		dynaButton.onclick        = function () {expandChoicesArea(this);}; // "this" is the button
		dynaDivSubmit.appendChild(dynaButton);

		dynaButton = document.createElement("button");
		dynaButton.id             = "closeButton"+(i+1);
		dynaButton.name           = i.toString();
		dynaButton.style.background = 	"linear-gradient(#f2cfeb, #f2A2BC)";
		dynaButton.style.visibility = "hidden";
		dynaButton.style.top      = "-64px";
		dynaButton.onclick        = function () {ShrinkChoicesArea(this);}; // "this" is the button
		dynaDivSubmit.appendChild(dynaButton);


	} // for each question

	for (var j = 0; j<numberOfChoices; j++) { // // for each choice, add an input we can choose it from // //

		dynaInput = document.createElement("input");
		dynaInput.type            = "text";
		dynaInput.name            = j;
		dynaInput.value           = "Spot " + j;
		dynaInput.style.opacity   = "0";
		dynaInput.onfocus         = function () {this.blur();};
		dynaInput.onclick         = function () {recordSelection(this);};
		choiceInputsArray[0][j]   = dynaInput;

		dynaInput = document.createElement("i");
		dynaInput.innerText       = "Reason";
		dynaInput.name            = j;
		dynaInput.style.opacity   = "0";
		choiceInputsArray[1][j]   = dynaInput;

	}

	document.getElementById("summaryDiv").innerHTML = "Answered: "; // was "Loading..."
}

function PopulateLayout() {
	var questionsAnsweredTally = 0;
	document.getElementById("summaryDiv").innerHTML = "Answered: ";

	thecss = document.styleSheets[0].cssRules;

	for (i = 0; i<numberOfQuestions; i++) { // for each question we show in the site
		dynaQuestionInput = document.getElementById("questionInput"+(i+1));
		dynaAnswerInput   = document.getElementById("answerInput"+(i+1));
		dynaReasonInput   = document.getElementById("reasonInput"+(i+1));

    dynaQuestionInput.value = xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("text")[0].childNodes[0].nodeValue; // Pull the question text
    dynaAnswerInput.value = "-";
		if (xmlCurrentStudent) {
			for (j=0; j<xmlCurrentStudent.getElementsByTagName("guess").length; j++) {
				if ($(xmlCurrentStudent.getElementsByTagName("guess")[j]).attr("question") == (i+1) && xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes.length > 0) { // This is the guess for this question (and it has a guess in it)
					dynaAnswerInput.value = String.fromCharCode(64+parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)) + " - "+ xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("choice")[parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)-1].childNodes[0].nodeValue; // Pull the answers picked text
					if (testFinished==0) { // Test under way (blue)
						dynaReasonInput.value = "";
						questionsAnsweredTally++;
					}
					else if (parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue) == parseInt(xmlCurrentTest.getElementsByTagName("question")[i].childNodes[0].nodeValue)) { // right answer
						document.getElementById("summaryDiv").innerHTML = "Correct: "
						dynaReasonInput.style.color="#5B5";
						dynaReasonInput.value = " * Correct *";
						questionsAnsweredTally++;
					} // Else: Right answer
					
					else { // Wrong answer
						document.getElementById("summaryDiv").innerHTML = "Correct: "
						dynaReasonInput.style.color="#777";
						dynaReasonInput.value = xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("reason")[parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)-1].childNodes[0].nodeValue; // Pull the answers reason for being wrong text
					}
				} // if this is the question we're on
			} // for each guess the current student made
    } // if we have data for the current student
	}
	document.getElementById("summaryDiv").innerHTML += "" + questionsAnsweredTally + " of " + numberOfQuestions + "<br/>Seat: " + studentColumn + "-" + studentRow;
	//setTimeout("PopulateLayout();",300)
}

function expandChoicesArea(dynaElement) {
	event.preventDefault();
	currentOpenQuestion = parseInt(dynaElement.name); // 0 indexed
	var stylesheet = document.styleSheets[0].cssRules;
	var expandRule;

	for (disableButtonsLooper = 0; disableButtonsLooper < numberOfQuestions; disableButtonsLooper++) {
		document.getElementById("submitButton" + (currentOpenQuestion+1)).disabled = true;
	}
	document.getElementById("closeButton" + (currentOpenQuestion+1)).style.visibility = "visible";

	// Setup initial and ending values //
	for (ruleLooper = 0; ruleLooper < stylesheet.length; ruleLooper++) {
		if (stylesheet[ruleLooper].name == "expandQuestionBoxClass") {
			expandRule = stylesheet[ruleLooper];
			var expandRule_From = expandRule.cssRules[0].style;
			var expandRule_To = expandRule.cssRules[1].style;
			
			expandRule_From.setProperty('height', $("#questionAndGuess" + (currentOpenQuestion+1)).innerHeight() + 'px');
			expandRule_To.setProperty('height', (136+46*numberOfChoices) + 'px'); // 0-136, 1-182, 2-228, 3-274, 4-320 (46)
			expandRule_From.setProperty('top', '0px'); 
			expandRule_To.setProperty('top', (20 - $("#questionAndGuess" + (currentOpenQuestion+1)).offset().top) + 'px');
			shrunkQuestionHeight = $("#questionAndGuess" + (currentOpenQuestion+1)).innerHeight();
			expandedQuestionTop = (20 - $("#questionAndGuess" + (currentOpenQuestion+1)).offset().top);
		}
	}
	for (var eachChoiceLooper = 0; eachChoiceLooper < numberOfChoices; eachChoiceLooper++) {
		document.getElementById("choicesField" + (currentOpenQuestion+1)).appendChild(choiceInputsArray[0][eachChoiceLooper]);
		//document.getElementById("choicesField" + (currentOpenQuestion+1)).appendChild(choiceInputsArray[1][eachChoiceLooper]);
	}

	// Start the animations //
	for (var hideQuestionsLooper = 0; hideQuestionsLooper < numberOfQuestions; hideQuestionsLooper++) {
		if (hideQuestionsLooper != currentOpenQuestion) {
			document.getElementById("questionAndGuess" + (hideQuestionsLooper+1)).classList.add('hideAnimation');
			document.getElementById("questionAndGuess" + (hideQuestionsLooper+1)).classList.remove('showAnimation');
		}
		else {
			document.getElementById("answerInput" + (hideQuestionsLooper+1)).classList.add('hideAnimation');
			document.getElementById("answerInput" + (hideQuestionsLooper+1)).classList.remove('showAnimation');
			document.getElementById("answerSmallBox" + (hideQuestionsLooper+1)).classList.add('hideAnimation');
			document.getElementById("answerSmallBox" + (hideQuestionsLooper+1)).classList.remove('showAnimation');
			document.getElementById("reasonInput" + (hideQuestionsLooper+1)).classList.add('hideAnimation');
			document.getElementById("reasonInput" + (hideQuestionsLooper+1)).classList.remove('showAnimation');
			document.getElementById("reasonSmallBox" + (hideQuestionsLooper+1)).classList.add('hideAnimation');
			document.getElementById("reasonSmallBox" + (hideQuestionsLooper+1)).classList.remove('showAnimation');

			for (var showChoicesLooper = 0; showChoicesLooper < numberOfChoices; showChoicesLooper++) {
				choiceInputsArray[0][showChoicesLooper].value = String.fromCharCode(64+parseInt(showChoicesLooper+1)) + " - " + xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("choice")[showChoicesLooper].childNodes[0].nodeValue;
			}
			setTimeout(function() {
				document.getElementById("questionAndGuess" + (currentOpenQuestion+1)).classList.add('expandQuestionBox');
				document.getElementById("questionAndGuess" + (currentOpenQuestion+1)).classList.remove('shrinkQuestionBox');
			}, 500);
			setTimeout(function() {
				for (var showChoicesLooper = 0; showChoicesLooper < numberOfChoices; showChoicesLooper++) {
					choiceInputsArray[0][showChoicesLooper].classList.add('showAnimation');
					choiceInputsArray[1][showChoicesLooper].classList.add('showAnimation');
				}
			}, 1000);
		} // don't hide the current question
	} // for each question
}

function ShrinkChoicesArea() {
	event.preventDefault();
	var stylesheet = document.styleSheets[0].cssRules;
	var expandRule;

	for (disableButtonsLooper = 0; disableButtonsLooper < numberOfQuestions; disableButtonsLooper++) {
		document.getElementById("submitButton" + (currentOpenQuestion+1)).disabled = false;
	}
	document.getElementById("closeButton" + (currentOpenQuestion+1)).style.visibility = "hidden";

	// Setup initial and ending values //
	for (ruleLooper = 0; ruleLooper < stylesheet.length; ruleLooper++) {
		if (stylesheet[ruleLooper].name == "shrinkQuestionBoxClass") {
			expandRule = stylesheet[ruleLooper];
			var expandRule_From = expandRule.cssRules[0].style;
			var expandRule_To = expandRule.cssRules[1].style;

			expandRule_From.setProperty('height', $("#questionAndGuess" + (currentOpenQuestion+1)).innerHeight() + 'px');
			expandRule_To.setProperty('height', '139px'); // 0-136, 1-182, 2-228, 3-274, 4-320 (46)
			expandRule_From.setProperty('top', expandedQuestionTop + 'px'); 
			expandRule_To.setProperty('top', '0px');
		}
	}

	// Start the animations //
	for (var hideQuestionsLooper = 0; hideQuestionsLooper < numberOfQuestions; hideQuestionsLooper++) {
		if (hideQuestionsLooper != currentOpenQuestion) {
			document.getElementById("questionAndGuess" + (hideQuestionsLooper+1)).classList.add('showAnimation');
			document.getElementById("questionAndGuess" + (hideQuestionsLooper+1)).classList.remove('hideAnimation');
		}
		else {
			document.getElementById("questionAndGuess" + (currentOpenQuestion+1)).classList.add('shrinkQuestionBox');
			document.getElementById("questionAndGuess" + (currentOpenQuestion+1)).classList.remove('expandQuestionBox');
			document.getElementById("answerInput" + (hideQuestionsLooper+1)).classList.add('showAnimation');
			document.getElementById("answerSmallBox" + (hideQuestionsLooper+1)).classList.add('showAnimation');
			document.getElementById("reasonInput" + (hideQuestionsLooper+1)).classList.add('showAnimation');
			document.getElementById("reasonSmallBox" + (hideQuestionsLooper+1)).classList.add('showAnimation');
			for (var showChoicesLooper = 0; showChoicesLooper < numberOfChoices; showChoicesLooper++) {
				choiceInputsArray[0][showChoicesLooper].value = String.fromCharCode(64+parseInt(showChoicesLooper+1)) + " - " + xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("choice")[showChoicesLooper].childNodes[0].nodeValue;
			}
			for (var showChoicesLooper = 0; showChoicesLooper < numberOfChoices; showChoicesLooper++) {
					choiceInputsArray[0][showChoicesLooper].classList.remove('showAnimation');
					choiceInputsArray[1][showChoicesLooper].classList.remove('showAnimation');
				choiceInputsArray[0][showChoicesLooper].style.opacity = 0; // this might not be needed, the remove does the work
				choiceInputsArray[1][showChoicesLooper].style.opacity = 0;
			}
		} // don't hide the current question
	} // for each question

	for (var eachChoiceLooper = 0; eachChoiceLooper < numberOfChoices; eachChoiceLooper++) {
		document.getElementById("choicesField" + (currentOpenQuestion+1)).removeChild(choiceInputsArray[0][eachChoiceLooper]);
	}

}

function showChoices() {
	document.getElementById("expandButtonDiv").innerHTML  = (currentOpenQuestion+1) + ") <span id='expandButtonQuestionText'>" + xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("text")[0].childNodes[0].nodeValue + "</span>";
	document.getElementById('expandButtonQuestionText').style.fontSize = Math.round(screenHeight/(numberOfChoices*3)) + "px";
	for (var i=0; i<xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("choice").length; i++) {
		document.getElementById("choiceDiv" + i).innerHTML = String.fromCharCode(64+parseInt(i+1)) + " - " + xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("choice")[i].childNodes[0].nodeValue;
		document.getElementById("choiceDiv" + i).style.opacity = 1;
		document.getElementById("choiceDiv" + i).style.visibility = "visible";
//	$(document.getElementById("choiceDiv" + i)).animate({opacity:1}, 500);
	}
}

function hideChoices() {
	for (var i=0; i<xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("choice").length; i++) {
		document.getElementById("choiceDiv" + i).innerHTML = xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("choice")[i].childNodes[0].nodeValue;
		document.getElementById("choiceDiv" + i).style.opacity = 0;
		document.getElementById("choiceDiv" + i).style.visibility = "hidden";
	}
}

function recordSelection(dynaElement) {
	var d=new Date();
	var now=d.toISOString();
	var saved = false;

	for (var i=0; i < xmlMobileGuesses.getElementsByTagName("guess").length; i++) {
		if (xmlMobileGuesses.getElementsByTagName("guess")[i].getAttribute("question") == currentOpenQuestion+1) {
			xmlMobileGuesses.getElementsByTagName("guess")[i].childNodes[0].nodeValue = (parseInt(dynaElement.name)+1);
			xmlMobileGuesses.getElementsByTagName("guess")[i].setAttribute("time",now);
			saved = true;
		}
	}
	if (!saved) {
		newel=xmlMobileGuesses.createElement("guess");
		newel.setAttribute("question",(currentOpenQuestion+1));
		newel.setAttribute("time",now);
		newel.textContent = (parseInt(dynaElement.name)+1);
		xmlMobileGuesses.getElementsByTagName("student")[0].appendChild(newel);
//		xmlMobileGuesses.documentElement
	}

	url = "asakaupload.php?key=YqmhAi7i&file=mobileC" + studentColumn + "R" + studentRow + ".xml";
	var xhr = new XMLHttpRequest();   // Create a new request
	xhr.open("POST", url, false);     // POST to the URL
	xhr.send(new XMLSerializer().serializeToString(xmlMobileGuesses));

	ShrinkChoicesArea();
	LoadMobileGuesses();
	LoadServerGuesses();
	PopulateLayout();
}

function onTouchXimgStart() {
}

function onTouchXimgEnd() {
	closeChoiceDiv();
}

function closeChoiceDiv() {
	for (var i=0; i<xmlCurrentTest.getElementsByTagName("question")[currentOpenQuestion].getElementsByTagName("choice").length; i++) {
		document.getElementById("choiceDiv" + i).innerHTML = "";
	$(document.getElementById("choiceDiv" + i)).animate({opacity:0}, 200);
		setTimeout( function() { hideChoices();}, 300);
	}
	$(document.getElementById("expandButtonDiv")).animate({opacity:"0",	left:(screenWidth/2)+"px", top:(screenHeight/2)+"px", width:"0px", height:"0px"}, 500);
	$(document.getElementById("Ximg")).animate({opacity:0}, 500);
}

function fileExists(url) {
	try {
		var http = new XMLHttpRequest();
		http.open('HEAD', url, false);
		http.send();
		return http.status!=404;
	}
	catch (exception) {
		return false;
	}
}

function CheckBrowserSize() {
	if (previousWidth != $("#rootDiv").innerWidth() || previousHeight != $("#rootDiv").innerHeight()) {
		screenWidth = $("#rootDiv").innerWidth();
		screenHeight = $("#rootDiv").innerHeight();
		previousWidth = screenWidth;
		previousHeight = screenHeight;
		console.log("Screen size change");
	}

}

function ChangeCss(className, ruleName, value) {
	var cssRuleCode = document.all ? 'rules' : 'cssRules';
	for (var ElementLooper = 0; ElementLooper < document.styleSheets[0][cssRuleCode].length; ElementLooper++) {
		//	console.log(document.styleSheets[0][cssRuleCode][ElementLooper].selectorText);
		if (document.styleSheets[0][cssRuleCode][ElementLooper].selectorText == className) {
			if(document.styleSheets[0][cssRuleCode][ElementLooper].style[ruleName]){
				document.styleSheets[0][cssRuleCode][ElementLooper].style[ruleName] = value;
				break;
			}
		}
	}	
				if (false) { // TODO make a foreach re-write
			document.styleSheets[0][cssRuleCode].forEach(function (cssRule) {
				if (cssRule.selectorText == className) style[ruleName] = value;
			});
			}
}
