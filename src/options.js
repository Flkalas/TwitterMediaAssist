function restoreOptions() {
	browser.storage.sync.get({
		spcificPathName: false,
		isConvertGIF: true,
		isSaveMP4: true,
		isVideoSaveAsMP4: true,
		isVideoSaveAsTS: true
	}).then(onGot, onError);
}

function onGot(items) {
	document.getElementById('specific').checked = items.spcificPathName;
	document.getElementById('gifasgif').checked = items.isConvertGIF;
	document.getElementById('gifasmp4').checked = items.isSaveMP4;
	document.getElementById('videoasmp4').checked = items.isVideoSaveAsMP4;
	document.getElementById('videoasts').checked = items.isVideoSaveAsTS;
}

function onError(error) {
	console.log(`Error: ${error}`);
}

function setItem() {
	var status = document.getElementById('status');
	status.textContent = 'Options saved.';
	setTimeout(function () {
		status.textContent = "";
	}, 750);
}

function saveOptions() {
	var specific = document.getElementById('specific').checked;
	var convertGIF = document.getElementById('gifasgif').checked;
	var saveMP4 = document.getElementById('gifasmp4').checked;
	var saveVideoMP4 = document.getElementById('videoasmp4').checked;
	var saveVideoTS = document.getElementById('videoasts').checked;

	browser.storage.sync.set({
		spcificPathName: specific,
		isConvertGIF: convertGIF,
		isSaveMP4: saveMP4,
		isVideoSaveAsMP4: saveVideoMP4,
		isVideoSaveAsTS: saveVideoTS
	}).then(setItem, onError);
}

document.getElementById('specific').addEventListener("change", saveOptions);
document.getElementById('gifasgif').addEventListener("change", saveOptions);
document.getElementById('gifasmp4').addEventListener("change", saveOptions);
document.getElementById('videoasmp4').addEventListener("change", saveOptions);
document.getElementById('videoasts').addEventListener("change", saveOptions);
document.addEventListener('DOMContentLoaded', restoreOptions);