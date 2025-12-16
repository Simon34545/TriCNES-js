"use strict";

const audioContext = new AudioContext({latencyHint: 50/1000, sampleRate: 44100});

let clocksToRun = 0;

let worklet;
let soundReady = false;
let workletReady = false;

const sab = new SharedArrayBuffer(129 * Float64Array.BYTES_PER_ELEMENT);
const buf = new Float64Array(sab);

let filter = options.filter;
let lp_outprev = 0;
let hp1outprev = 0;
let hp2outprev = 0;
let hp1_inprev = 0;
let hp2_inprev = 0;

function lp(lpin) { // low pass filter
	return (lpin - lp_outprev) * 0.815686;
}

function hp1(hpin) { // high pass filter
	return hp1outprev * 0.996039 + hpin - hp1_inprev;
}

function hp2(hpin) { // high pass filter
	return hp2outprev * 0.999835 + hpin - hp2_inprev;
}

let pendingFiles = 0; // when recording;

let audioCallback = () => {};

async function setupSound() {
	await audioContext.audioWorklet.addModule('./worklet.js');
	
	worklet = new AudioWorkletNode(audioContext, 'nes-worklet', {numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1]});
	
	worklet.port.postMessage({
      sab: sab
  });
	
	worklet.port.onmessage = function(e) {
		const t0 = performance.now();
		clocksToRun += (21477272 * speed) / 44100;
		const clocks = Math.floor(clocksToRun);
		clocksToRun -= clocks;
		
		if (pendingFiles > 0) {
			for (let i = 0; i < 128; i++) {
				buf[i] = 0;
			}
			
			buf[128] = 1;
			return
		}
		
		for (let i = 0; i < 128; i++) {
			for (let j = 0; j < clocks; j++) {
				emu._EmulatorCore();
				
				if ((vsync || recording) && emu.FrameAdvance_ReachedVBlank) {
					emu.FrameAdvance_ReachedVBlank = false;
					render(true);
				}
			}
			
			if (recording && !recordingStarted) {
				buf[i] = -1;
				continue;
			}
			
			let pulse_out = ((emu.sweep1Target < 0x800 && emu.timer1Period > 7 && emu.length1Counter && (emu.sequencer1Sequence & (0x80 >> emu.sequencer1Position))) ? (emu.env1Constant ? emu.env1Volume : emu.env1Decay) : 0) + ((emu.sweep2Target < 0x800 && emu.timer2Period > 7 && emu.length2Counter && (emu.sequencer2Sequence & (0x80 >> emu.sequencer2Position))) ? (emu.env2Constant ? emu.env2Volume : emu.env2Decay) : 0);
			let tnd_out = Emulator.sequencer3Sequence[emu.sequencer3Position] / 8227 + ((emu.length4Counter && (emu.shiftRegister & 1)) ? (emu.env3Constant ? emu.env3Volume : emu.env3Decay) : 0) / 12241 + emu.APU_DMC_Output / 22638;
			
			if (pulse_out) pulse_out = 95.88 / ((8128 / pulse_out) + 100);
			if (tnd_out) tnd_out = 159.88 / ((1 / tnd_out) + 100);
			
			if (filter) {				
				let out = pulse_out + tnd_out;
				
				let lpout = lp(out);
				lp_outprev = lpout;
				
				let hp1out = hp1(lpout);
				hp1outprev = hp1out;
				hp1_inprev = lpout;
				
				let hp2out = hp2(hp1out);
				hp2outprev = hp2out;
				hp2_inprev = hp1out;
				
				buf[i] = hp2out;
			} else {
				buf[i] = pulse_out + tnd_out;
			}
		}
		
		audioCallback();
		
		const t1 = performance.now();
		
		const t = Math.floor((t1 - t0) * 10) / 10;
		
		if (!recording) document.getElementById('ms').innerText = `${speed * 100}% - ${t}`;
		
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