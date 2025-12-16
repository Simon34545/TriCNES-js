"use strict";

function loadFM2(data) {
	return new Promise(res => {
		const reader = new FileReader();
		
		reader.onload = () => {
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
			
			res(new Uint16Array(inputs));
		};
		
		reader.readAsText(data);
	});
}

function loadBK2(data) {
	return new Promise(res => {
		const reader = new FileReader();
		
		reader.onload = async () => {
			const zip = await (new JSZip().loadAsync(reader.result));
			const log = zip.files["Input Log.txt"];
			
			if (log) {
				const txt = await log.async("text");
				
				const inputs = [];
				
				const map = {
						"A": 0x80,
						"B": 0x40,
						"s": 0x20,
						"S": 0x10,
						"U": 0x08,
						"D": 0x04,
						"L": 0x02,
						"R": 0x01,
						".": 0x00
				}
				
				for (const l of txt.split('\n')) {
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
				
				res(new Uint16Array(inputs));
			}
		};
		
		reader.readAsArrayBuffer(data);
	});
}

let TASLog;
let TASFmt;

async function loadTAS() {
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
			TASLog = await loadFM2(fileData);
			break;
		case 'bk2':
		case 'tasproj':
			TASLog = await loadBK2(fileData);
			break;
		default:
			alert("Unsupported TAS!");
			return;
	}
	
	document.getElementById('ppuclock').selectedIndex = 0;
	document.getElementById('cpuclock').selectedIndex = 0;
	document.getElementById('fceux').checked = false;
	
	switch(ext) {
		case 'fm2':
			document.getElementById('fceux').checked = true;
			document.getElementById('cpuclock').selectedIndex = 0;
			break;
		case 'bk2':
		case 'tasproj':
		document.getElementById('cpuclock').selectedIndex = 8;
			break;
		default:
			alert("Unsupported TAS!");
			return;
	}
	
	TASFmt = ext;
}

function startTAS() {
	if (TASLog) {
		const e = Power(emu);
		
		e.TAS_ReadingTAS = true;
		e.TAS_InputLog = TASLog;
		// todo: subframe inputs
		e.PPUClock = document.getElementById('ppuclock').selectedIndex;
		e.CPUClock = document.getElementById('cpuclock').selectedIndex;
		e.TAS_InputSequenceIndex = 0;
		
		switch(TASFmt) {
			case 'fm2':
				if (document.getElementById('fceux').checked) {
					e.PPU_Scanline = 239;
					e.PPU_Dot = 312;
					e.SyncFM2 = true;
					e.TAS_InputSequenceIndex--;
				} else {
					e.TAS_InputSequenceIndex++
					e.PPU_Dot = 0;
				}
				for (let i = 0; i < 0x800; i++) {
					e.RAM[i] = ((i & 7) > 4) ? 0xFF : 0x00;
				}
				break;
			case 'bk2':
			case 'tasproj':
				for (let i = 0; i < 0x800; i++) {
					e.RAM[i] = ((i & 7) > 4) ? 0xFF : 0x00;
				}
				break;
			default:
				break
		}
		
		TASLog = null;
		emu = e;
	} else {
		emu = Power(emu);
	}
}