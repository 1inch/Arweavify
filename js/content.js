chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
	if (msg.text === 'report_back') {
		document.innerHTML = msg.source;
		sendResponse(document.innerHTML);	
    }
    if (msg.text === 'verified') {
    	console.log("Page sources verified");
    }
    if (msg.text === 'failed_verify' || msg.text === 'failed_hash') {
    	console.log(msg.text);
    	alert("This page doesn't verifed");
    }
});