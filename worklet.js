class SoundEngine extends AudioWorkletProcessor {
	sab = new Float64Array(129);
	
	constructor (...args) {
    super(...args);
		let self = this;
		
		this.port.onmessage = (e) => {
			this.sab = new Float64Array(e.data.sab);
    }
	}
	
	process(_, outputs) {
		for (const output of outputs) {
			for (const channelData of output) {
				for (let i = 0; i < channelData.length; i += 1) {
					channelData[i] = this.sab[i];
				}
			}
		}
		
		this.port.postMessage({});
		while (this.sab[128] < 1) {};
		if (this.sab[128] < 2) this.sab[128] = 0;
		
		return true;
	}
}

console.log(sampleRate)
	
registerProcessor('nes-worklet', SoundEngine);