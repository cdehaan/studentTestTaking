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
	LoadServerGuesses();

	LoadMobileGuesses();
	
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
	console.log(" ~~~ ~~~ Just after load ~~~ ~~~");
	console.log(xmlMobileGuesses.documentElement);
	console.log(" ~~~ ~~~ ~~~ ~~~ ~~~ ~~~ ~~~ ~~~");
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


function CreateLayoutOLD() {

	for (i = 0; i<numberOfQuestions; i++) { // for each question

		if (true) { // // Make each answer bar background image // //
			backgroundImage = document.createElement("img");
			backgroundImage.id        = "answerImage"+(i+1);
			backgroundImage.className = "backgroundImage";
			backgroundImage.src       = "images/glass.png";
		}

		if (true) { // // Make each answer bar div // //
			dynaDivBig = document.createElement("div");
			dynaDivBig.className      = "answerBar";
			dynaDivBig.id             = "answerBar"+(i+1);
			dynaDivBig.style.top      = (Math.round(screenHeight/(numberOfQuestions+2))*i + 10) + "px";
			dynaDivBig.style.overflow = "hidden";
			rootDiv.appendChild(dynaDivBig);
			dynaDivBig.appendChild(backgroundImage);
		}

		if (true) { // // Make each answer inset div // //
			dynaDiv = document.createElement("div");
			dynaDiv.className      = "answerInset button gray";
			dynaDiv.id             = "answerInset"+(i+1);
			dynaDiv.name           = i;
			dynaDiv.style.top      = (Math.round(screenHeight/(numberOfQuestions+2))*i + 15) + "px";
			dynaDiv.style.height   = (Math.round(screenHeight/(numberOfQuestions+2)) - 25) + "px";
			dynaDiv.style.width    = (Math.round(screenHeight/(numberOfQuestions+2)) - 20)*2 + "px";
			dynaDiv.style.fontSize = $(dynaDiv).innerHeight()-10 + "px"
			dynaDiv.innerHTML      = "-";
			dynaDiv.addEventListener('touchstart', onTouchdynaDivStart, false);
			dynaDiv.addEventListener('touchmove',  onTouchdynaDivMove,  false);
			dynaDiv.addEventListener('touchend',   onTouchdynaDivEnd,   false);
			rootDiv.appendChild(dynaDiv);
		}
		
	} // for each question
	
	if (true) { // // Make the big div with one question and options // //
		document.getElementById("expandButtonDiv").style.height = (Math.round(screenHeight/(numberOfQuestions+2)) - 25) + "px";
		document.getElementById("expandButtonDiv").style.width  = (Math.round(screenHeight/(numberOfQuestions+2)) - 20)*2 + "px";
		document.getElementById("expandButtonDiv").style.fontSize = $(dynaDiv).innerHeight()-10 + "px"
		document.getElementById("expandButtonDiv").innerHTML = "-";
	}
	
	if (true) { // // Make the X image // //
		backgroundImage = document.createElement("img");
		backgroundImage.id             = "Ximg";
		backgroundImage.src            = "images/Ximg.png";
		backgroundImage.style.position = "absolute";
		backgroundImage.style.top      = "15px";
		backgroundImage.style.right    = "35px";
		backgroundImage.style.height   = "64px";
		backgroundImage.style.width    = "64px";
		backgroundImage.style.opacity  = "0";
		backgroundImage.style.zIndex   = "30";
		backgroundImage.addEventListener('touchstart', onTouchXimgStart, false);
		backgroundImage.addEventListener('touchend',   onTouchXimgEnd,   false);
		rootDiv.appendChild(backgroundImage);
	}
	
	for (var j = 0; j<numberOfChoices; j++) { // // for each choice, add a div we can choose it from // //
		dynaDiv = document.createElement("div");
		dynaDiv.id               = "choiceDiv" + j;
		dynaDiv.name             = j;
		dynaDiv.className        = "choiceDiv";
		dynaDiv.style.visibility = "hidden";
		dynaDiv.style.position   = "absolute";
		dynaDiv.style.fontSize   = Math.round(screenHeight/(numberOfChoices*3)) + "px";
		dynaDiv.style.top        = (Math.round(screenHeight/(numberOfChoices+2))*(j+1) + 10) + "px";
		dynaDiv.style.right      = "35px";
		dynaDiv.style.left       = "35px";
		dynaDiv.style.height     = (Math.round(screenHeight/(numberOfChoices+2))-40) + "px";
		dynaDiv.style.width      = (screenWidth-100) + "px";
		dynaDiv.style.zIndex     = "25";
		dynaDiv.addEventListener('touchstart', onTouchchoiceDivStart, false);
		dynaDiv.addEventListener('touchend',   onTouchchoiceDivEnd,   false);
		rootDiv.appendChild(dynaDiv);
	}

	document.getElementById("summaryDiv").innerHTML = "Answered: "; // was "Loading..."
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
		dynaInput.id              = "questionInput"+(i+1);
		dynaDivField.appendChild(dynaInput);

		dynaInput = document.createElement("i");
		dynaInput.innerText       = "Q";
		dynaDivField.appendChild(dynaInput);

		dynaDivField = document.createElement("div");
		dynaDivField.className    = "field";
		dynaDivField.id           = "answerField"+(i+1);
		dynaDivBig.appendChild(dynaDivField);

		dynaInput = document.createElement("input");
		dynaInput.type            = "text";
		dynaInput.id              = "answerInput"+(i+1);
		dynaDivField.appendChild(dynaInput);

		dynaInput = document.createElement("i");
		dynaInput.innerText       = "A";
		dynaDivField.appendChild(dynaInput);

		dynaDivField = document.createElement("div");
		dynaDivField.className    = "field";
		dynaDivField.id           = "reasonField"+(i+1);
		dynaDivBig.appendChild(dynaDivField);

		dynaInput = document.createElement("input");
		dynaInput.type            = "text";
		dynaInput.id              = "reasonInput"+(i+1);
		dynaDivField.appendChild(dynaInput);

		dynaInput = document.createElement("i");
		dynaInput.innerText       = " ";
		dynaDivField.appendChild(dynaInput);

		dynaDivSubmit = document.createElement("div");
		dynaDivSubmit.className   = "submit";
		dynaDivSubmit.id          = "submitDiv"+(i+1);
		dynaDivBig.appendChild(dynaDivSubmit);

		dynaButton = document.createElement("button");
		dynaButton.id             = "submitButton"+(i+1);
		dynaButton.name           = i.toString();
		dynaButton.onclick        = function () {expandChoicesArea(this);}; // "this" is the button
		dynaDivSubmit.appendChild(dynaButton);


	} // for each question
	
	if (true) { // // Make the big div with one question and options // //
		document.getElementById("expandButtonDiv").style.height = (Math.round(screenHeight/(numberOfQuestions+2)) - 25) + "px";
		document.getElementById("expandButtonDiv").style.width  = (Math.round(screenHeight/(numberOfQuestions+2)) - 20)*2 + "px";
		document.getElementById("expandButtonDiv").style.fontSize = $(dynaDiv).innerHeight()-10 + "px"
		document.getElementById("expandButtonDiv").innerHTML = "-";
	}
	
	if (true) { // // Make the X image // // TODO pull this into a class
		xButton = document.createElement("button");
		xButton.id             = "Ximg";
		xButton.src            = "images/Ximg.png";
		xButton.style.position = "absolute";
		xButton.style.top      = "15px";
		xButton.style.right    = "35px";
		xButton.style.height   = "64px";
		xButton.style.width    = "64px";
		xButton.style.opacity  = "0";
		xButton.style.zIndex   = "30";
		xButton.style.backgroundImage = "url('images/Ximg.png')";
		xButton.style.backgroundSize  = "100%";
		xButton.onclick        = function () {onTouchXimgEnd();};
//		xButton.addEventListener('touchstart', onTouchXimgStart, false);
//		xButton.addEventListener('touchend',   onTouchXimgEnd,   false);
		rootDiv.appendChild(xButton);
	}
	
	for (var j = 0; j<numberOfChoices; j++) { // // for each choice, add a div we can choose it from // //
		dynaDiv = document.createElement("div");
		dynaDiv.id               = "choiceDiv" + j;
		dynaDiv.name             = j;
		dynaDiv.className        = "choiceDiv";
		dynaDiv.style.visibility = "hidden";
		dynaDiv.style.position   = "absolute";
		dynaDiv.style.fontSize   = Math.round(screenHeight/(numberOfChoices*3)) + "px";
		dynaDiv.style.top        = (Math.round(screenHeight/(numberOfChoices+2))*(j+1) + 10) + "px";
		dynaDiv.style.right      = "35px";
		dynaDiv.style.left       = "35px";
		dynaDiv.style.height     = (Math.round(screenHeight/(numberOfChoices+2))-40) + "px";
		dynaDiv.style.width      = (screenWidth-100) + "px";
		dynaDiv.style.zIndex     = "25";
		dynaDiv.addEventListener('touchstart', onTouchchoiceDivStart, false);
		dynaDiv.addEventListener('touchend',   onTouchchoiceDivEnd,   false);
		rootDiv.appendChild(dynaDiv);
	}

	document.getElementById("summaryDiv").innerHTML = "Answered: "; // was "Loading..."
}

function PopulateLayout() {
	var questionsAnsweredTally = 0;
	document.getElementById("summaryDiv").innerHTML = "Answered: ";

	thecss = document.styleSheets[0].cssRules;
if (false) {
	for (i=0;i<thecss.length;i++) { // // dynamic css sizes // //

		if (thecss[i].selectorText.toLowerCase()=='div.answerbar') { // Long bar
			if (testFinished==0) thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)/5) + "px;"; // was third height
			if (testFinished==1) thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)/5) + "px;"; // fifth height
			thecss[i].style.cssText+="padding-left:" + (Math.round(screenHeight/(numberOfQuestions+2)-6)*2) + "px;";
			thecss[i].style.cssText+="height:" + Math.round(screenHeight/(numberOfQuestions+2)-6) + "px;";
		}

		if (thecss[i].selectorText.toLowerCase()=='div.answerinset') { // Box with letter
			thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)-44) + "px;";
			thecss[i].style.cssText+="height:" + Math.round(screenHeight/(numberOfQuestions+2)-31) + "px;";
			thecss[i].style.cssText+="width:" + Math.round(screenHeight/(numberOfQuestions+2)-26) + "px;";
		}

		if (thecss[i].selectorText.toLowerCase()=='div.summarydiv') { // Summary at bottom
			thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)/2) + "px;";
			thecss[i].style.cssText+="height:" + Math.round(1.75*screenHeight/(numberOfQuestions+2)-6) + "px;";
		}

	}
}
	for (i = 0; i<numberOfQuestions; i++) { // for each question we show in the site
		if (false) { // old UI names
		dynaDivBig = document.getElementById("answerBar"+(i+1));
		dynaDiv = document.getElementById("answerInset"+(i+1));
		backgroundImage = document.getElementById("answerImage"+(i+1));
		}
		dynaQuestionInput = document.getElementById("questionInput"+(i+1));
		dynaAnswerInput   = document.getElementById("answerInput"+(i+1));
		dynaReasonInput   = document.getElementById("reasonInput"+(i+1));

    dynaQuestionInput.value = xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("text")[0].childNodes[0].nodeValue; // Pull the question text
    dynaAnswerInput.value = "-";
		if (xmlCurrentStudent) {
			for (j=0; j<xmlCurrentStudent.getElementsByTagName("guess").length; j++) {
				if ($(xmlCurrentStudent.getElementsByTagName("guess")[j]).attr("question") == (i+1) && xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes.length > 0) { // This is the guess for this question (and it has a guess in it)
					//dynaDivBig.innerHTML = dynaDivBig.innerHTML + "<br/><b>" + String.fromCharCode(64+parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)) +"</b> - "+ xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("choice")[parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)-1].childNodes[0].nodeValue; // Pull the answers picked text
					dynaAnswerInput.value = xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("choice")[parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)-1].childNodes[0].nodeValue; // Pull the answers picked text
					dynaDiv.innerHTML=(i+1) + ") " + String.fromCharCode(64+parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue));
					if (testFinished==0) { // Test under way (blue)
						questionsAnsweredTally++;
					}
					else if (parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue) == parseInt(xmlCurrentTest.getElementsByTagName("question")[i].childNodes[0].nodeValue)) { // right answer
						document.getElementById("summaryDiv").innerHTML = "Correct: "
						//dynaDivBig.style.backgroundColor="rgba(0,255,0,0.35)"
						questionsAnsweredTally++;
					} // Else: Right answer
					else { // Wrong answer
						document.getElementById("summaryDiv").innerHTML = "Correct: "
						dynaReasonInput.value = xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("reason")[parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)-1].childNodes[0].nodeValue; // Pull the answers reason for being wrong text
					}
				} // if this is the question we're on
			} // for each guess the current student made
    } // if we have data for the current student
	}
	document.getElementById("summaryDiv").innerHTML += "" + questionsAnsweredTally + " of " + numberOfQuestions + "<br/>Seat: " + studentColumn + "-" + studentRow;
	//setTimeout("PopulateLayout();",1000)
}


function PopulateLayoutOLD() {
	var questionsAnsweredTally = 0;
	document.getElementById("summaryDiv").innerHTML = "Answered: ";

	thecss = document.styleSheets[0].cssRules;
	for (i=0;i<thecss.length;i++) { // // dynamic css sizes // //

		if (thecss[i].selectorText.toLowerCase()=='div.answerbar') { // Long bar
			if (testFinished==0) thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)/5) + "px;"; // was third height
			if (testFinished==1) thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)/5) + "px;"; // fifth height
			thecss[i].style.cssText+="padding-left:" + (Math.round(screenHeight/(numberOfQuestions+2)-6)*2) + "px;";
			thecss[i].style.cssText+="height:" + Math.round(screenHeight/(numberOfQuestions+2)-6) + "px;";
		}

		if (thecss[i].selectorText.toLowerCase()=='div.answerinset') { // Box with letter
			thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)-44) + "px;";
			thecss[i].style.cssText+="height:" + Math.round(screenHeight/(numberOfQuestions+2)-31) + "px;";
			thecss[i].style.cssText+="width:" + Math.round(screenHeight/(numberOfQuestions+2)-26) + "px;";
		}

		if (thecss[i].selectorText.toLowerCase()=='div.summarydiv') { // Summary at bottom
			thecss[i].style.cssText+="font-size:" + Math.round(screenHeight/(numberOfQuestions+2)/2) + "px;";
			thecss[i].style.cssText+="height:" + Math.round(1.75*screenHeight/(numberOfQuestions+2)-6) + "px;";
		}

	}

	for (i = 0; i<numberOfQuestions; i++) { // for each question we show in the site
		dynaDivBig = document.getElementById("answerBar"+(i+1));
		dynaDiv = document.getElementById("answerInset"+(i+1));
		backgroundImage = document.getElementById("answerImage"+(i+1));

    dynaDivBig.innerHTML = xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("text")[0].childNodes[0].nodeValue; // Pull the question text
    //backgroundImage.src="images/glass.png";
    //alert($(xmlCurrentStudent).attr("row")); // works
    dynaDiv.innerHTML="-";
		if (xmlCurrentStudent) {
			for (j=0; j<xmlCurrentStudent.getElementsByTagName("guess").length; j++) {
				if ($(xmlCurrentStudent.getElementsByTagName("guess")[j]).attr("question") == (i+1) && xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes.length > 0) { // This is the guess for this question (and it has a guess in it)
					dynaDivBig.innerHTML = dynaDivBig.innerHTML + "<br/><b>" + String.fromCharCode(64+parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)) +"</b> - "+ xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("choice")[parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)-1].childNodes[0].nodeValue; // Pull the answers picked text
					dynaDiv.innerHTML=(i+1) + ") " + String.fromCharCode(64+parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue));
					if (testFinished==0) { // Test under way (blue)
						//backgroundImage.src="images/blue.png";
						dynaDivBig.style.backgroundColor="rgba(0,0,255,0.35)"
						questionsAnsweredTally++;
					}
					else if (parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue) == parseInt(xmlCurrentTest.getElementsByTagName("question")[i].childNodes[0].nodeValue)) { // right answer
						document.getElementById("summaryDiv").innerHTML = "Correct: "
						//backgroundImage.src="images/green.png";
						dynaDivBig.style.backgroundColor="rgba(0,255,0,0.35)"
						questionsAnsweredTally++;
					} // Else: Right answer
					else { // Wrong answer
						document.getElementById("summaryDiv").innerHTML = "Correct: "
						//backgroundImage.src="images/red.png";
						dynaDivBig.style.backgroundColor="rgba(255,0,0,0.35)"
						dynaDivBig.innerHTML = dynaDivBig.innerHTML + "<br/><b>Why</b>: " + xmlCurrentTest.getElementsByTagName("question")[i].getElementsByTagName("reason")[parseInt(xmlCurrentStudent.getElementsByTagName("guess")[j].childNodes[0].nodeValue)-1].childNodes[0].nodeValue; // Pull the answers reason for being wrong text
					}
				} // if this is the question we're on
			} // for each guess the current student made
    } // if we have data for the current student
	}
	document.getElementById("summaryDiv").innerHTML += "" + questionsAnsweredTally + " of " + numberOfQuestions + "<br/>Seat: " + studentColumn + "-" + studentRow;
	//setTimeout("PopulateLayout();",1000)
}


function onTouchdynaDivStart(e) {
	e.currentTarget.className = "answerInset button grayDark";
}

function onTouchdynaDivMove(e) {
	e.currentTarget.className = "answerInset button gray";
}

function onTouchdynaDivEnd(e) {
	e.currentTarget.className = "answerInset button gray";
	currentOpenQuestion = parseInt(e.currentTarget.name);
	document.getElementById("expandButtonDiv").innerHTML  = (currentOpenQuestion+1) + ")";
	document.getElementById("expandButtonDiv").style.visibility = "visible";
	document.getElementById("expandButtonDiv").style.top  = e.currentTarget.style.top;
	document.getElementById("expandButtonDiv").style.left = e.currentTarget.style.left;
	setTimeout( function() { showChoices();}, 300);
//	$(document.getElementById("expandButtonDiv")).animate({opacity:0.95,	left:"5px", top:"5px", width:(screenWidth-30)+"px", height:(screenHeight-30)+"px"}, 500);
	$(document.getElementById("expandButtonDiv")).css("opacity", 1);
	$(document.getElementById("expandButtonDiv")).animate({left:"5px", top:"5px", width:(screenWidth-30)+"px", height:(screenHeight-30)+"px"}, 500);
//	$(document.getElementById("Ximg")).animate({opacity:0.95}, 1000);
	$(document.getElementById("Ximg")).css("opacity", 1);

}

function expandChoicesArea(dynaButton) {
	event.preventDefault();
	currentOpenQuestion = parseInt(dynaButton.name);
	for (var hideQuestionsLooper = 0; hideQuestionsLooper < numberOfQuestions; hideQuestionsLooper++) {
		if (hideQuestionsLooper != currentOpenQuestion) {
			document.getElementById("questionAndGuess" + (hideQuestionsLooper+1)).classList.add('hideAnimation');
		}
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

function onTouchchoiceDivStart() {
}

function onTouchchoiceDivEnd(e) {
	var d=new Date();
	var now=d.toISOString();
	var saved = false;

	for (var i=0; i < xmlMobileGuesses.getElementsByTagName("guess").length; i++) {
		if (xmlMobileGuesses.getElementsByTagName("guess")[i].getAttribute("question") == currentOpenQuestion+1) {
			xmlMobileGuesses.getElementsByTagName("guess")[i].childNodes[0].nodeValue = (parseInt(e.currentTarget.name)+1);
			xmlMobileGuesses.getElementsByTagName("guess")[i].setAttribute("time",now);
			saved = true;
		}
	}
	if (!saved) {
		newel=xmlMobileGuesses.createElement("guess");
		newel.setAttribute("question",(currentOpenQuestion+1));
		newel.setAttribute("time",now);
		newel.textContent = (parseInt(e.currentTarget.name)+1);
		xmlMobileGuesses.getElementsByTagName("student")[0].appendChild(newel);
//		xmlMobileGuesses.documentElement
	}

	url = "asakaupload.php?key=YqmhAi7i&file=mobileC" + studentColumn + "R" + studentRow + ".xml";
	var xhr = new XMLHttpRequest();   // Create a new request
	xhr.open("POST", url);            // POST to the URL
	xhr.send(new XMLSerializer().serializeToString(xmlMobileGuesses));
	
	closeChoiceDiv();
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

