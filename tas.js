"use strict";

function loadFM2(data) {
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
	
	reader.readAsText(data);
}

function loadBK2(data) {
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
			
			let e = new Emulator();
			e.TAS_InputSequenceIndex = -0;
			e.Cart = emu.Cart;
			
			e.TAS_InputLog = new Uint16Array(inputs);
			e.TAS_ReadingTAS = true;
			
			emu = e;
		}
	};
	
	reader.readAsArrayBuffer(data);
}