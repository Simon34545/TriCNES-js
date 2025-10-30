"use strict";

let emu = new Emulator();
emu.Cart = AccuracyCoin;

const speeds = [0.01, 0.03, 0.06, 0.12, 0.25, 0.50, 0.75, 1.00, 1.50, 2.00, 3.00, 4.00, 8.00, 16.00, 32.00, 64.00];
let speedIdx = 7;
let speed = 1;

let vsync = false;
let screenMode = 3;

const cvs = document.getElementById('screen');
const ctx = cvs.getContext('2d');
const img = ctx.createImageData(256, 240);
const img2 = ctx.createImageData(256*8, 240);

if (!window.showOpenFilePicker) window.showOpenFilePicker = () => {
	return new Promise((res, rej) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.style.display = 'none';

		input.addEventListener('change', (event) => {
			const files = Array.from(event.target.files);
			if (files.length == 1) {
				res([{getFile: async () => {return event.target.files[0]}}]);
			}
		});

		document.body.appendChild(input);
		input.click();
		document.body.removeChild(input);
	});
};

document.addEventListener('keydown', function(e) {
	switch(e.code) {
		case 'Minus':
		speedIdx--;
		speedIdx = Math.max(0, Math.min(speeds.length - 1, speedIdx));
		speed = speeds[speedIdx];
		break;
		case 'Equal':
		speedIdx++;
		speedIdx = Math.max(0, Math.min(speeds.length - 1, speedIdx));
		speed = speeds[speedIdx];
		break;
		case 'KeyL':
		(async () => {
			const [fileHandle] = await window.showOpenFilePicker({
				types: [
					{
						description: "NES ROMs",
						accept: {
							"application/octet-stream": [".nes"],
						},
					},
				],
				excludeAcceptAllOption: true,
				multiple: false,
			});
			
			const fileData = await fileHandle.getFile();
			const reader = new FileReader();
			
			reader.onload = () => {
				emu.Cart = new Cartridge(new Uint8Array(reader.result));
			};
			
			reader.readAsArrayBuffer(fileData);
		})();
		break;
		case 'KeyT':
		(async () => {
			const [fileHandle] = await window.showOpenFilePicker({
				types: [
					{
						description: "TAS files",
						accept: {
							"text/plain": [".fm2"],
						},
					},
				],
				excludeAcceptAllOption: true,
				multiple: false,
			});
			
			const fileData = await fileHandle.getFile();
			const reader = new FileReader();
			
			reader.onload = () => {
				let e = new Emulator();
				e.SyncFM2 = true;
				e.PPU_Scanline = 239;
				e.PPU_Dot = 312;
				e.TAS_InputSequenceIndex = -1;
				e.Cart = emu.Cart;
				const inputs = [];
				const map = {
						"A": 0x80,
						"B": 0x40,
						"S": 0x20,
						"T": 0x10,
						"U": 0x08,
						"D": 0x04,
						"L": 0x02,
						"R": 0x01,
						".": 0x00
				}
				for (const l of reader.result.split('\n')) {
					if (l[0] != '|') continue;
					inputs.push(l.split('|').map((v, i) => {
						if (!v.length) return 0;
						if (i == 2) {
								return v.split('').map(c => map[c]).reduce((a, b) => a + b)
						} else if (i == 3) {
								return v.split('').map(c => map[c] << 8).reduce((a, b) => a + b)
						} else  { return 0}
					}).reduce((a, b) => a + b));
				}
				e.TAS_InputLog = new Uint16Array(inputs);
				e.TAS_ReadingTAS = true;
				emu = e;
			};
			
			reader.readAsText(fileData);
		})();
		break;
		case 'KeyV':
		vsync = !vsync;
		break;
		case 'KeyR':
		emu.Reset();
		break;
		case 'KeyN':
		emu.PPU_DecodeSignal = !emu.PPU_DecodeSignal;
		break;
		case 'KeyS':
		switch(++screenMode) {
			case 6:
			screenMode = 0;
			case 0: // 1x scale
			cvs.style.width = '256px';
			cvs.style.height = '240px';
			break;
			case 1: // 1x scale 4:3
			cvs.style.width = '320px';
			cvs.style.height = '240px';
			break;
			case 2: // 2x scale
			cvs.style.width = '512px';
			cvs.style.height = '480px';
			break;
			case 3: // 2x scale 4:3
			cvs.style.width = '640px';
			cvs.style.height = '480px';
			break;
			case 4: // 4x scale
			cvs.style.width = '1024px';
			cvs.style.height = '960px';
			break;
			case 5: // 4x scale 4:3
			cvs.style.width = '1280px';
			cvs.style.height = '960px';
			break;
		}
		break
		
		case 'KeyX':
		emu.ControllerPort1 |= 0x80;
		break;
		case 'KeyZ':
		emu.ControllerPort1 |= 0x40;
		break;
		case 'ShiftRight':
		emu.ControllerPort1 |= 0x20;
		break;
		case 'Enter':
		emu.ControllerPort1 |= 0x10;
		break;
		case 'ArrowUp':
		emu.ControllerPort1 |= 0x08;
		break;
		case 'ArrowDown':
		emu.ControllerPort1 |= 0x04;
		break;
		case 'ArrowLeft':
		emu.ControllerPort1 |= 0x02;
		break;
		case 'ArrowRight':
		emu.ControllerPort1 |= 0x01;
		break;
	}
})

document.addEventListener('keyup', function(e) {
	switch(e.code) {
		case 'KeyX':
		emu.ControllerPort1 &= ~0x80;
		break;
		case 'KeyZ':
		emu.ControllerPort1 &= ~0x40;
		break;
		case 'ShiftRight':
		emu.ControllerPort1 &= ~0x20;
		break;
		case 'Enter':
		emu.ControllerPort1 &= ~0x10;
		break;
		case 'ArrowUp':
		emu.ControllerPort1 &= ~0x08;
		break;
		case 'ArrowDown':
		emu.ControllerPort1 &= ~0x04;
		break;
		case 'ArrowLeft':
		emu.ControllerPort1 &= ~0x02;
		break;
		case 'ArrowRight':
		emu.ControllerPort1 &= ~0x01;
		break;
	}
})

const buttons = "ABsSUDLR";

function render(isVBlank) {
	//_CoreFrameAdvance();
	
	if (!isVBlank && vsync) return;
	
	if (emu.PPU_DecodeSignal) {
		cvs.width = 256*8;
		for (let i = 0; i < img2.data.length; i++) {
			img2.data[i] = emu.NTSCScreen[i];
		}
		
		ctx.putImageData(img2, 0, 0);
	} else {
		cvs.width = 256;
		for (let i = 0; i < img.data.length; i++) {
			img.data[i] = emu.Screen[i];
		}
		
		ctx.putImageData(img, 0, 0);
	}
	
	let str = '';
	
	for (let i = 0; i < 8; i++) str += (emu.ControllerPort1 & (0x80 >> i)) ? buttons[i] : '.';
	document.getElementById('c1').innerText = str;
	
	str = '';
	
	for (let i = 0; i < 8; i++) str += (emu.ControllerPort2 & (0x80 >> i)) ? buttons[i] : '.';
	document.getElementById('c2').innerText = str;
}

setInterval(render, 1);