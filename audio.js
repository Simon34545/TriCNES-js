const audioContext = new AudioContext({latencyHint: 50/1000, sampleRate: 44100/4});

let worklet;
let soundReady = false;
let workletReady = false;

const sab = new SharedArrayBuffer(129 * Float64Array.BYTES_PER_ELEMENT);
const buf = new Float64Array(sab);

async function setupSound() {
	await audioContext.audioWorklet.addModule('./worklet.js');
	
	worklet = new AudioWorkletNode(audioContext, 'nes-worklet', {numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1]});
	
	worklet.port.postMessage({
      sab: sab
  });
	
	worklet.port.onmessage = function(e) {
		const t0 = performance.now();
		for (let i = 0; i < 128; i++) {
			for (let j = 0; j < 1948; j++) {
				_EmulatorCore();
			}
			
			let pulse_out = ((sweep1Target < 0x800 && timer1Period > 7 && length1Counter && (sequencer1Sequence & (0x80 >> sequencer1Position))) ? (env1Constant ? env1Volume : env1Decay) : 0) + ((sweep2Target < 0x800 && timer2Period > 7 && length2Counter && (sequencer2Sequence & (0x80 >> sequencer2Position))) ? (env2Constant ? env2Volume : env2Decay) : 0);
			let tnd_out = sequencer3Sequence[sequencer3Position] / 8227 + ((length4Counter && (shiftRegister & 1)) ? (env3Constant ? env3Volume : env3Decay) : 0) / 12241 + APU_DMC_Output / 22638;
			
			if (pulse_out) pulse_out = 95.88 / ((8128 / pulse_out) + 100);
			if (tnd_out) tnd_out = 159.88 / ((1 / tnd_out) + 100);
			
			buf[i] = pulse_out + tnd_out;
		}
		const t1 = performance.now();
		
		const t = Math.floor((t1 - t0) * 10) / 10;
		
		document.getElementById('ms').innerText = t.toString();
		
		buf[128] = 1;
	}
	
	worklet.connect(audioContext.destination);
	workletReady = true;
};

let contextStarted = false;

let autoResume = setInterval(function() {
	audioContext.resume();
	
	let soundReadyT = audioContext.state != "suspended";
	if (soundReadyT == true && !contextStarted) {
		contextStarted = true;
		setupSound();
	}
	
	if (workletReady) {
		soundReady = true;
		window.onbeforeunload = function() { buf[128] = 2; audioContext.close(); }
		clearInterval(autoResume);
	}
}, 1);