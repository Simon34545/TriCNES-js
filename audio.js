"use strict";

const options = {};
window.location.search.substring(1).split('&').forEach(v => options[v.split('=')[0]] = v.substring(v.indexOf('=') + 1));
options.rate = parseInt(options.rate);
options.speed = parseFloat(options.speed);

vsync = !!options.vsync;
speed = isNaN(options.speed) ? 1 : options.speed;

const rate = isNaN(options.rate) ? 44100 : options.rate;
const audioContext = new AudioContext({latencyHint: 50/1000, sampleRate: rate});

let clocksToRun = 0;

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
		clocksToRun += (21477272 * speed) / rate;
		const clocks = Math.floor(clocksToRun);
		clocksToRun -= clocks;
		for (let i = 0; i < 128; i++) {
			for (let j = 0; j < clocks; j++) {
				emu._EmulatorCore();
				
				if (vsync && emu.FrameAdvance_ReachedVBlank) {
					emu.FrameAdvance_ReachedVBlank = false;
					render(true);
				}
			}
			
			let pulse_out = ((emu.sweep1Target < 0x800 && emu.timer1Period > 7 && emu.length1Counter && (emu.sequencer1Sequence & (0x80 >> emu.sequencer1Position))) ? (emu.env1Constant ? emu.env1Volume : emu.env1Decay) : 0) + ((emu.sweep2Target < 0x800 && emu.timer2Period > 7 && emu.length2Counter && (emu.sequencer2Sequence & (0x80 >> emu.sequencer2Position))) ? (emu.env2Constant ? emu.env2Volume : emu.env2Decay) : 0);
			let tnd_out = Emulator.sequencer3Sequence[emu.sequencer3Position] / 8227 + ((emu.length4Counter && (emu.shiftRegister & 1)) ? (emu.env3Constant ? emu.env3Volume : emu.env3Decay) : 0) / 12241 + emu.APU_DMC_Output / 22638;
			
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