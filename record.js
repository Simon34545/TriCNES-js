"use strict";

let opfsRoot;

let frames = 0;
let audiodump;
let audiohandle;

let dumphandle;
let dumpstream;

async function downloadFile(fileHandle, fileName) {
	const file = await fileHandle.getFile();
	const blobUrl = URL.createObjectURL(file);
	
	const a = document.createElement('a');
	a.href = blobUrl;
	a.download = fileName;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	
	URL.revokeObjectURL(blobUrl);
}

function str(s) {
	return new Uint8Array(s.split('').map(c => c.charCodeAt(0)));
}

function u32(n) {
	return new Uint32Array([n]);
}

function u16(n) {
	return new Uint16Array([n]);
}

function oct(n, l, p, z) {
	return str(n.toString(8).padStart(l - p - z, '0') + ('').padStart(p, ' ') + ('').padStart(z, '\x00'));
}

async function save() {
	const stream = await audiohandle.createWritable();
	
	// https://en.wikipedia.org/wiki/WAV#:~:text=%5B23%5D-,WAV%20file%20header,-%5Bedit%5D
	
	let header = [];
	
	await stream.write(str("RIFF")); // RIFF
	await stream.write(u32(44 + audiodump.length * 4)); // 4 (file header) + 4 bytes * num samples
	await stream.write(str("WAVE")); // WAVE
	
	await stream.write(str("fmt ")); // fmt␣
	await stream.write(u32(16)); // block length (16 bytes)
	await stream.write(u16(3)); // audio format: 3 (IEEE 754 Float)
	await stream.write(u16(1)); // number of channels: 1 (mono)
	await stream.write(u32(44100)); // sample rate: 44100 (hz)
	await stream.write(u32(44100 * 4)); // bytes per second (rate * sample width)
	await stream.write(u16(4)); // sample width (channels * bit depth / 8)
	await stream.write(u16(32)); // bit depth
	
	await stream.write(str("data")); // data
	await stream.write(u32(audiodump.length * 4)); // data length
	
	await stream.write(new Float32Array(audiodump));
	
	await stream.close();
	
	//await downloadFile(audiohandle, "nesaudio.wav");
	
	while (pendingFiles > 0) {
		await new Promise(res => setTimeout(res, 10));
	}
	
	await appendFile(dumpstream, new Blob([await (await audiohandle.getFile()).arrayBuffer()], { type: 'audio/wav' }), "audio.wav");
	
	await dumpstream.write(new Uint8Array(1024)); // 1024 null bytes mark the end of a tar archive
	
	await dumpstream.close();
	await downloadFile(dumphandle, "nesvideo.tar");
}

async function toBlob(canvas) {
	return new Promise(res => {
		canvas.toBlob(res, 'image/png');
	});
}

function write(out, data) {
	data = new Uint8Array(data.buffer);
	
	for (let i = 0; i < data.length; i++) {
		out.push(data[i]);
	}
}

async function appendFile(stream, data, name) {
	// https://en.wikipedia.org/wiki/Tar_(computing)#:~:text=length%20with%20zeros.-,Header,-%5Bedit%5D
	const header = [];
	
	write(header, str(name)); // fila name (100 bytes)
	let npadding = 100 - name.length;
	if (npadding) write(header, new Uint8Array(npadding));
	
	write(header, oct(0o666, 8, 1, 1)) // file mode (octal, 8 bytes)
	write(header, oct(0, 8, 1, 1)) // owner id (octal, 8 bytes)
	write(header, oct(0, 8, 1, 1)) // group id (octal, 8 bytes
	
	write(header, oct(data.size, 12, 1, 0)) // file size (octal, 12 bytes)
	write(header, oct(Math.floor(Date.now() / 1000), 12, 1, 0)) // file mod time (octal, 12 bytes)
	
	write(header, str('        ')); // checksum
	
	write(header, str('0')) // file type (0 = regular)
	write(header, new Uint8Array(100)); // linked file name (none)
	
	write(header, new Uint8Array(255)); // header padding
	// calculate checksum
	
	let sum = 0;
	for (let i = 0; i < 512; i++) {
		sum += header[i];
	}
	
	const checksum = oct(sum, 6, 0, 0);
	
	header[148] = checksum[0];
	header[149] = checksum[1];
	header[150] = checksum[2];
	header[151] = checksum[3];
	header[152] = checksum[4];
	header[153] = checksum[5];
	header[154] = 0x00;
	header[155] = 0x20;
	
	await stream.write(new Uint8Array(header));
	await stream.write(data); // file should be padded to a multiple of 512 bytes
	let padding = Math.ceil(data.size / 512) * 512 - data.size;
	if (padding) await stream.write(new Uint8Array(padding));
}

async function appendImage(canvas, name) {
	pendingFiles++;
	await appendFile(dumpstream, await toBlob(canvas), name);
	pendingFiles--;
}

async function dumpframe() {
	await appendImage(cvs, `sc_${frames.toString().padStart(6, '0')}.png`);
	if (cvsnt.style.display != 'none') await appendImage(cvsnt, `nt_${frames.toString().padStart(6, '0')}.png`);
}

function recordFrameCallback() {
	if (!recordingStarted) {
		console.log("start!")
		recordingStarted = true;
		return;
	}
	
	dumpframe();
	
	console.log("frame!", frames);
	
	if (++frames == 600) {
		recordingStarted = false;
		frameCallback = () => {};
	}
}

function recordAudioCallback() {
	for (let i = 0; i < 128; i++) {
		audiodump.push(buf[i]);
	}
	
	if (frames == 600) {
		recording = false;
		audioCallback =  () => {};
		
		save();
	}
}

async function record() {
	opfsRoot = await navigator.storage.getDirectory();
	await opfsRoot.remove({ recursive: true });
	
	audiohandle = await opfsRoot.getFileHandle("audio.wav", {
		create: true
	});
	
	dumphandle = await opfsRoot.getFileHandle("dump.tar", {
		create: true
	});
	
	dumpstream = await dumphandle.createWritable();
	
	audiodump = [];
	
	frames = 0;
	recording = true;
	recordingStarted = false;
	
	frameCallback = recordFrameCallback;
	audioCallback = recordAudioCallback;
}