"use strict";

let emu = new Emulator();
emu.Cart = AccuracyCoin;

const speeds = [0.01, 0.03, 0.06, 0.12, 0.25, 0.50, 0.75, 1.00, 1.50, 2.00, 3.00, 4.00, 8.00, 16.00, 32.00, 64.00];
let speedIdx = 7;
let speed = options.speed;

let vsync = options.vsync;
let screenMode = 1;

const cvs = document.getElementById('screen');
const ctx = cvs.getContext('2d');

const cvsnt = document.getElementById('nametables');
const ctxnt = cvsnt.getContext('2d');

const img0 = ctx.createImageData(256, 240);
const img1 = ctx.createImageData(256*8, 240);
const img2 = ctx.createImageData(341, 262);
const img3 = ctx.createImageData(341*8, 262);

const NametableBitmap = ctx.createImageData(512, 480);

let recording = false;
let recordingStarted = false;
let frameCallback = () => {};

function updateMode() {
	emu.PPU_ShowScreenBoarders = document.getElementById('borders').checked;
	emu.PPU_DecodeSignal = document.getElementById('ntsc').checked;
	
	cvs.width = emu.PPU_ShowScreenBoarders ? (emu.PPU_DecodeSignal ? 341*8 : 341) : (emu.PPU_DecodeSignal ? 256*8 : 256);
	cvs.height = emu.PPU_ShowScreenBoarders ? 262 : 240;
	
	const w = emu.PPU_DecodeSignal ? (cvs.width / 8) : cvs.width;
	
	switch(screenMode) {
		case 4:
		screenMode = 0;
		case 0: // 1x scale
		cvs.style.width = `${w * 1}px`;
		cvs.style.height = `${cvs.height * 1}px`;
		break;
		case 1: // 2x scale
		cvs.style.width = `${w * 2}px`;
		cvs.style.height = `${cvs.height * 2}px`;
		break;
		case 2: // 4x scale
		cvs.style.width = `${w * 4}px`;
		cvs.style.height = `${cvs.height * 4}px`;
		break;
		case 3: // pixel perfect 8:7
		cvs.style.width = `${w * 8}px`;
		cvs.style.height = `${cvs.height * 7}px`;
		break;
	}
}

if (!window.showOpenFilePicker) window.showOpenFilePicker = () => {
	return new Promise((res, rej) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.style.display = 'none';

		input.addEventListener('change', (event) => {
			const files = Array.from(event.target.files);
			if (files.length == 1) {
				res([{name: event.target.files[0].name, getFile: async () => {return event.target.files[0]}}]);
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
							"application/zip": [".bk2"]
						},
					},
				],
				excludeAcceptAllOption: true,
				multiple: false,
			});
			
			const fileData = await fileHandle.getFile();
			const ext = fileHandle.name.split('.').slice(-1)[0].toLowerCase();
			
			switch(ext) {
				case 'fm2':
					loadFM2(fileData);
					break;
				case 'bk2':
					loadBK2(fileData);
					break;
				default:
					alert("Unsupported TAS!");
					break;
			}
		})();
		break;
		case 'KeyR':
		emu.Reset();
		break;
		case 'KeyS':
		updateMode(++screenMode);
		break;
		
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
	
	if (!isVBlank && (recording || vsync)) return;
	
	updateMode();
	
	const img = emu.PPU_ShowScreenBoarders ? (emu.PPU_DecodeSignal ? img3 : img2) : (emu.PPU_DecodeSignal ? img1 : img0);
	const screen = emu.PPU_ShowScreenBoarders ? (emu.PPU_DecodeSignal ? emu.BoarderedNTSCScreen : emu.BoarderedScreen) : (emu.PPU_DecodeSignal ? emu.NTSCScreen : emu.Screen);
	
	for (let i = 0; i < img.data.length; i++) {
		img.data[i] = screen[i];
	}
	
	ctx.putImageData(img, 0, 0);
	
	let str = '';
	
	for (let i = 0; i < 8; i++) str += (emu.ControllerPort1 & (0x80 >> i)) ? buttons[i] : '.';
	document.getElementById('c1').innerText = str;
	
	str = '';
	
	for (let i = 0; i < 8; i++) str += (emu.ControllerPort2 & (0x80 >> i)) ? buttons[i] : '.';
	document.getElementById('c2').innerText = str;
	
	cvsnt.style.display = document.getElementById('ntviewer').checked ? 'inline' : 'none';
	if (document.getElementById('ntviewer').checked) RenderNametable(document.getElementById('bg0').checked, document.getElementById('sborder').checked, document.getElementById('soverlay').checked);
	
	frameCallback();
}

function RenderNametable(ForceBackdropOnIndex0, DrawScreenBoundary, OverlayScreen) {
	let tx = 0;
	let ty = 0;
	let x = 0;
	let y = 0;
	let px = 0;
	let py = 0;
	
	let PatternTile = 0;
	let pal = 0;
	
	while (ty < 2) {
		while (tx < 2) {
			while (y < 30) {
				while (x < 32) {
					let PatternTile = emu.FetchPPU(0x2000 + 0x400 * tx + 0x800 * ty + x + y * 32);
					let pal = emu.FetchPPU(0x2000 + 0x400 * (tx + 1) + 0x800 * ty - 0x40 + Math.floor(x / 4) + Math.floor(y / 4) * 8);
					
					if ((x & 3) >= 2) {
						pal = pal >> 2;
					}
					
					if ((y & 3) >= 2) {
						pal = pal >> 4;
					}
					
					pal = pal & 3;
					
					while (py < 8) {
						while (px < 8) {
							let k = ((emu.FetchPPU((py + PatternTile * 16 + (!emu.PPU_PatternSelect_Background ? 0 : 0x1000))) >> (7 - px)) & 1) + 2 * ((emu.FetchPPU((py + 8 + PatternTile * 16 + (!emu.PPU_PatternSelect_Background ? 0 : 0x1000))) >> (7 - px)) & 1);
							
							if (k == 0 && ForceBackdropOnIndex0) {
								k = emu.FetchPPU(0x3F00);
							} else {
								k = emu.FetchPPU(0x3F00 + k + pal * 4);
							}
							
							let ix = tx * 0x100 + x * 8 + px;
							let iy = ty * 0xF0 + y * 8 + py;
							let i = (iy * 512 + ix) * 4;
							let c = (k & 0x3F) * 3;
							
							NametableBitmap.data[i + 0] = Emulator.NESPal[c + 0];
							NametableBitmap.data[i + 1] = Emulator.NESPal[c + 1];
							NametableBitmap.data[i + 2] = Emulator.NESPal[c + 2];
							NametableBitmap.data[i + 3] = 255;
							px++;
						}
						px = 0;
						py++;
					}
					py = 0;
					x++;
				}
				x = 0;
				y++;
			}
			y = 0;
			tx++;
		}
		tx = 0;
		ty++;
	}
	
	if (DrawScreenBoundary) {
		let X = ((emu.PPU_TempVRAMAddress & 0b11111) << 3) | emu.PPU_FineXScroll | ((emu.PPU_TempVRAMAddress & 0b10000000000) >> 2);
		let Y = ((emu.PPU_TempVRAMAddress & 0b1111100000) >> 2) | ((emu.PPU_TempVRAMAddress & 0b111000000000000) >> 12) | ((emu.PPU_TempVRAMAddress & 0b100000000000) >> 4);
		let i = 0;
		
		while (i <= 257) {
			let ix1 = (X + 511 + i) & 511;
			let ix2 = (X + 511 + i) & 511;
			let iy1 = (Y + 479) % 480;
			let iy2 = (Y + 240) % 480;
			let i1 = (iy1 * 512 + ix1) * 4;
			let i2 = (iy2 * 512 + ix2) * 4;
			
			NametableBitmap.data[i1 + 0] = 255;
			NametableBitmap.data[i1 + 1] = 255;
			NametableBitmap.data[i1 + 2] = 255;
			NametableBitmap.data[i1 + 3] = 255;
			NametableBitmap.data[i2 + 0] = 255;
			NametableBitmap.data[i2 + 1] = 255;
			NametableBitmap.data[i2 + 2] = 255;
			NametableBitmap.data[i2 + 3] = 255;
			
			i++;
		}
		
		i = 0;
		
		while (i <= 241) {
			let ix1 = (X + 511) & 511;
			let ix2 = (X + 256) & 511;
			let iy1 = (Y + 479 + i) % 480;
			let iy2 = (Y + 479 + i) % 480;
			let i1 = (iy1 * 512 + ix1) * 4;
			let i2 = (iy2 * 512 + ix2) * 4;
			
			NametableBitmap.data[i1 + 0] = 255;
			NametableBitmap.data[i1 + 1] = 255;
			NametableBitmap.data[i1 + 2] = 255;
			NametableBitmap.data[i1 + 3] = 255;
			NametableBitmap.data[i2 + 0] = 255;
			NametableBitmap.data[i2 + 1] = 255;
			NametableBitmap.data[i2 + 2] = 255;
			NametableBitmap.data[i2 + 3] = 255;
			
			i++;
		}
	}
	
	if (OverlayScreen) {
		let X = ((emu.PPU_TempVRAMAddress & 0b11111) << 3) | emu.PPU_FineXScroll | ((emu.PPU_TempVRAMAddress & 0b10000000000) >> 2);
		let Y = ((emu.PPU_TempVRAMAddress & 0b1111100000) >> 2) | ((emu.PPU_TempVRAMAddress & 0b111000000000000) >> 12) | ((emu.PPU_TempVRAMAddress & 0b100000000000) >> 4);
		for (let xx = 0; xx < 256; xx++) {
			for (let yy = 0; yy < 240; yy++) {
				let ix = (X + xx) & 511;
				let iy = (Y + yy) % 480;
				let i1 = (iy * 512 + ix) * 4;
				let i2 = (yy * 256 + xx) * 4;
				
				NametableBitmap.data[i1 + 0] = emu.Screen[i2 + 0];
				NametableBitmap.data[i1 + 1] = emu.Screen[i2 + 1];
				NametableBitmap.data[i1 + 2] = emu.Screen[i2 + 2];
				NametableBitmap.data[i1 + 3] = emu.Screen[i2 + 3];
			}
		}
	}
	
	ctxnt.putImageData(NametableBitmap, 0, 0);
}

setInterval(render, 1);