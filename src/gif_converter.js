importScripts('jsgif/b64.js', 'jsgif/LZWEncoder.js', 'jsgif/NeuQuant.js', 'jsgif/GIFEncoder.js');

var encoder = new GIFEncoder();

self.addEventListener('message', function (e) {
	if (e.data.delay !== undefined) {
		//setup delay and encoder		
		encoder.setRepeat(0);
		encoder.setDelay(e.data.delay);
		encoder.setSize(e.data.w, e.data.h);
		encoder.start();
	} else if (e.data.frame !== undefined) {
		//add frames
		var data = e.data.frame.data;
		encoder.addFrame(data, true);
		//self.postMessage({message:"adding frame"});
	} else {
		//finish
		encoder.finish();
		var binary_gif = encoder.stream().getData();
		var data = encode64(binary_gif);
		self.postMessage(data);
	}
}, false);