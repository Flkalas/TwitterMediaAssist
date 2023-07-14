function restoreOptions() {
	browser.storage.sync.get({
		spcificPathName: false,
		readableName: false,
		isConvertGIF: true,
		isSaveMP4: true,
		isVideoSaveAsMP4: true,
		isVideoSaveAsTS: true,
		hideViewCount: false,
	}).then(onGot, onError)
}

function onGot(items) {
	document.getElementById('specific').checked = items.spcificPathName
	document.getElementById('readable').checked = items.readableName
	document.getElementById('gifasgif').checked = items.isConvertGIF
	document.getElementById('gifasmp4').checked = items.isSaveMP4
	document.getElementById('view_count').checked = items.hideViewCount
}

function onError(error) {
	console.log(`Error: ${error}`)
}

function setItem() {
	var status = document.getElementById('status')
	status.textContent = 'Options saved.'
	setTimeout(function () {
		status.textContent = ""
	}, 750)
}

function saveOptions() {
	var specific = document.getElementById('specific').checked
	var readable = document.getElementById('readable').checked
	var convertGIF = document.getElementById('gifasgif').checked
	var saveMP4 = document.getElementById('gifasmp4').checked
	var hideViewCount = document.getElementById('view_count').checked

	browser.storage.sync.set({
		spcificPathName: specific,
		readableName: readable,
		isConvertGIF: convertGIF,
		isSaveMP4: saveMP4,
		hideViewCount: hideViewCount,
	}).then(setItem, onError)
}

document.getElementById('specific').addEventListener("change", saveOptions)
document.getElementById('readable').addEventListener("change", saveOptions)
document.getElementById('gifasgif').addEventListener("change", saveOptions)
document.getElementById('gifasmp4').addEventListener("change", saveOptions)
document.getElementById('view_count').addEventListener("change", saveOptions)
document.addEventListener('DOMContentLoaded', restoreOptions)
