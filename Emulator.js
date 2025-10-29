"use strict";

// Coin's Contrabulous Cartswapulator!
class Cartridge
{
		// Since I made this emulator with mid-instruction cartridge swapping in mind, the cartridge class holds information about the cartridge that would persist when swapped in and out.

		//public string Name;         // For debugging
		//ROM = new Uint8Array;          // The entire .nes file

		PRGROM = new Uint8Array(0x4000);       // The entire program rom portion of the .nes file
		CHRROM = new Uint8Array(0x2000);       // The entire character rom portion of the .nes file

		MemoryMapper = 0;   // Header info: what mapper chip is this cartridge using?
		PRG_Size = 1;       // Header info: how many kb of PRG data does this cartridge have?
		CHR_Size = 1;       // Header info: how many kb of CHR data does this cartridge have?
		PRG_SizeMinus1 = 0; // PRG_Size-1; This is frequently used when grabbing data from PRG banks

		CHRRAM = new Uint8Array();       // If this cartridge has character this.RAM, this array is used.
		UsingCHRRAM = false;    // Header info: CHR this.RAM doesn't exist on all cartridges.

		PRGRAM = new Uint8Array();         // PRG this.RAM / Battery backed save this.RAM.

		constructor(ROM) // Constructor from file path
		{
				if (!ROM) {
					return;
				}
				//this.ROM = ROM; // Reads the file from the provided file path, and stores every byte into an array.

				// The ines header isn't actually part of the physical cartridge.
				// Rather, the values of the ines header are manually added to provide extra information to emulators.
				// Info such as "what mapper chip", "how many CHR banks?" and even "how should we mirror the nametables?" are part of this header.

				this.MemoryMapper = (ROM[7] & 0xF0);   // Parsing the ines header to determine what mapper chip this cartridge uses.
				this.MemoryMapper |= (ROM[6] >> 4);    // The upper nybble of byte 6, bitwise OR with the upper nybble of byte 7.

				this.PRG_Size = ROM[4];  // Parsing the ines header to determine how many kb of PRG data exists on this cartridge.
				this.CHR_Size = ROM[5];  // Parsing the ines header to determine how many kb of CHR data exists on this cartridge.

				this.PRG_SizeMinus1 = (this.PRG_Size - 1); // This value is occasionally used whenever a mapper has a fixed bank from the end of the PRG data, like address $E000 in the MMC3 chip.

				this.UsingCHRRAM = this.CHR_Size === 0; // If CHR_Size === 0, this is using CHR this.RAM


				this.PRGROM = new Uint8Array(this.PRG_Size * 0x4000); // 0x4000 bytes of PRG ROM, multiplied by byte 4 of the ines header.
				this.CHRROM = new Uint8Array(this.CHR_Size * 0x2000); // 0x2000 bytes of CHR ROM, multiplied by byte 5 of the ines header.
				this.CHRRAM = new Uint8Array(0x2000);            // CHR this.RAM always has 2 kibibytes

				this.NametableHorizontalMirroring = ((ROM[6] & 1) === 0); // The style in which the nametable is mirrored is part of the ines header.

				for (let i = 0; i < this.PRGROM.length; i++) this.PRGROM[i] = ROM[0x10 + i]; // This sets up the PRG ROM array with the values from the .nes file
				for (let i = 0; i < this.CHRROM.length; i++) this.CHRROM[i] = ROM[0x10 + this.PRGROM.length + i]; // This sets up the CHR ROM array with the values from the .nes file

				this.PRGRAM = new Uint8Array(0x2000); // PRG this.RAM probably has different lengths depending on the mapper, but this emulator doesn't yet support any mappers in which that length isnt 2 kibibytes.

				//Name = filepath; // For debugging, it's nice to see the file name sometimes.
		}

		NametableHorizontalMirroring = false;


		// Mapper stuff

		// I should probably refactor this.
		// Since each cart can only have 1 mapper, there's no need for every mapper's variables to coexist.


		// Mapper 0, NROM doesn't have any registers.

		// Mapper 1, MMC1
		Mapper_1_ShiftRegister = 0;
		Mapper_1_Control = 0x0C;    //0x8000
		Mapper_1_CHR0 = 0;              //0xA000
		Mapper_1_CHR1 = 0;              //0xC000
		Mapper_1_PRG = 0;               //0xE000
		Mapper_1_PB = false;

		// Mapper 2, UxROM
		Mapper_2_BankSelect = 0; // any write to ROM

		// Mapper 3, CNROM
		Mapper_3_CHRBank = 0; // any write to ROM

		// Mapper 4, MMC3
		Mapper_4_8000 = 0;      // The value written to $8000 (or any even address between $8000 and $9FFE)
		Mapper_4_BankA = 0;     // The PRG bank between $A000 and $BFFF
		Mapper_4_Bank8C = 0;    // The PRG bank that could either be at $8000 throuhg 9FFF, or $C000 through $DFFF
		Mapper_4_CHR_2K0 = 0;
		Mapper_4_CHR_2K8 = 0;
		Mapper_4_CHR_1K0 = 0;
		Mapper_4_CHR_1K4 = 0;
		Mapper_4_CHR_1K8 = 0;
		Mapper_4_CHR_1KC = 0;
		Mapper_4_IRQLatch = 0;
		Mapper_4_IRQCounter = 0;
		Mapper_4_EnableIRQ = false;
		Mapper_4_ReloadIRQCounter = false;
		Mapper_4_NametableMirroring = false; // MMC3 has it's own way of controlling how the namtables are mirrored.
		Mapper_4_PRGRAMProtect = 0;

		// Mapper 7, AOROM
		Mapper_7_BankSelect = 0;

		// Mapper 9, MMC2
		Mapper_9_BankSelect = 0;
		Mapper_9_CHR0_FD = 0;
		Mapper_9_CHR0_FE = 0;
		Mapper_9_CHR1_FD = 0;
		Mapper_9_CHR1_FE = 0;
		Mapper_9_NametableMirroring = false;
		Mapper_9_Latch0_FE = false;
		Mapper_9_Latch1_FE = false;

		// Mapper 69, Sunsoft FME-7
		Mapper_69_CMD = 0;
		Mapper_69_CHR_1K0 = 0;
		Mapper_69_CHR_1K1 = 0;
		Mapper_69_CHR_1K2 = 0;
		Mapper_69_CHR_1K3 = 0;
		Mapper_69_CHR_1K4 = 0;
		Mapper_69_CHR_1K5 = 0;
		Mapper_69_CHR_1K6 = 0;
		Mapper_69_CHR_1K7 = 0;
		Mapper_69_Bank_6 = 0;
		Mapper_69_Bank_6_isRAM = false;
		Mapper_69_Bank_6_isRAMEnabled = false;
		Mapper_69_Bank_8 = 0;
		Mapper_69_Bank_A = 0;
		Mapper_69_Bank_C = 0;
		Mapper_69_NametableMirroring = 0; // 0 = Vertical              1 = Horizontal            2 = One this.Screen Mirroring from $2000 ("1ScA")            3 = One this.Screen Mirroring from $2400 ("1ScB")
		Mapper_69_EnableIRQ = false;
		Mapper_69_EnableIRQCounterDecrement = false;
		Mapper_69_IRQCounter = 0; // When enabled the 16-bit IRQ counter is decremented once per CPU cycle. When the IRQ counter is decremented from $0000 to $FFFF an IRQ is generated.
}

class Emulator
{
	Cart = new Cartridge();  // The idea behind this emulator is that this value could be changed at any time if you so desire.
	PPUClock = 0;    // Counts down from 4. When it's 0, a PPU cycle occurs.
	CPUClock = 0;    // Counts down from 12. When it's 0, a CPU cycle occurs.
	APUClock = 0;    // Counts down from 12. Technically an APU cycle is 24 master clock cycles, but certain actions happen when this clock goes low and when it goes high.
	MasterClock = 0; // Counts up every master clock cycle. Resets at 24.

	APU_PutCycle = false; // The APU needs to know if this is a "get" or "put" cycle.

	OAM = new Uint8Array(0x100);         // Object Attribute Memory is 256 bytes.
	SecondaryOAM = new Uint8Array(32);   // Secondary OAM is specifically the 8 objects being rendered on the current scanline.
	SecondaryOAMSize = 0;            // This is a count of how many objects are currently in secondary OAM.
	SecondaryOAMAddress = 0;         // During sprite evaluation, the current SecondaryOAM Address is used to track what byte is set of a given dot.
	SecondaryOAMFull = false;        // If full and another object exists in the same scanline, the PPU Sprite OVerflow flag is set.
	SpriteEvaluationTick = 0;        // During sprite evaluation, there's a switch statement that determines what to do on a given dot. This determines which action to take.
	OAMScan_n = 0;                   // The name is taken from the nesdev wiki. Imagine this as the object ID in OAM.
	OAMScan_m = 0;                   // The name is taken from the nesdev wiki. Imagine this as the index into a given objects OAM bytes.
	OAMAddressOverflowedDuringSpriteEvaluation = false; // If the OAM address overflows during sprite evaluation, there's a few bugs that can occur.

	RAM = new Uint8Array(0x800);    // There are 0x800 bytes of RAM
	PPU = new Uint8Array(0x800);   // There are 0x800 bytes of VRAM
	PaletteRAM = new Uint8Array(0x20); // there are 0x20 bytes of palette RAM

	programCounter = 0;   // The PC. What address is currently being executed?
	opCode = 0; // The first CPU cycle of an instruction will read the opcode. This determines how the rest of the cycles will behave.

	totalCycles = 0; // For debugging. This is just a count of how many CPU cycles have occured since the console booted up.

	stackPointer = 0x00; // The Stack pointer is used during pushing/popping values with the stack. This determines which address will be read or written to.

	flag_Carry = false;      // The Carry flag is used in BCC and BCS instructions, and is set when the result of an operation over/underflows.
	flag_Zero = false;       // The Zero flag is used in BNE and BEQ instructions, and is set when the result of an operation is zero.
	flag_Interrupt = false;  // The Interrupt suppression flag will suppress IRQ's. 
	flag_Decimal = false;    // The NES doesn't use this flag.
	flag_B = false;          // This is set during BRK instructions
	flag_T = false;          // This flag has no purpose, though PLP instructions set it.
	flag_Overflow = false;   // The Carry flag is used in BVC and BVS instructions, and is set when the result of an operation over/underflows and the sign of the result is the same as the value before the operation.
	flag_Negative = false;   // The Zero flag is used in BPL and BMI instructions, and is set when the result of an operation is negative. (bit 7 is set)
	status = 0;             // This is a byte representation of all the flags.
	A = 0;           // The Accumulator, or "A Register"
	X = 0;           // The X Register
	Y = 0;           // The Y Register
	H = 0;           // The High byte of the target address. A couple undocumented instructions use this value.
	IgnoreH = false;         // However, with a well-timed DMA, the H register isn't actually part of the equation on some of those.
	dataBus = 0;     // The Data Bus.
	addressBus = 0;// The Address Bus. "Where are we reading/writing"
	specialBus = 0;  // The Special Bus is used in certain instructions. //TODO: What's the actual use for this bus??
	dl = 0;          // Data Latch. This holds values between CPU cycles that are used in later cycles within an instruction.


	operationCycle = 0; // This tracks what cycle of a given instruction is being emulated. Cycle 0 fetches the opcode, and all cycles after that have specific logic depending on which cycle needs emulated next.
	operationComplete = false; // When an instruction is complete, I use this to reset operationCycle.

	temporaryAddress = 0; // I use this to temporarily modify the value of the address bus for some if statements. This is mostly for checking if the low byte under/over flows.

	static NESPal = new Uint8Array([
			// each triplet of bytes represents the RGB components of a color.
			// there's 64 colors, but this is also how I implement specific values for the this.PPU's emphasis bits.
			// default palette:
			0x65, 0x65, 0x65, 0x00, 0x2A, 0x84, 0x15, 0x13, 0xA2, 0x3A, 0x01, 0x9E, 0x59, 0x00, 0x7A, 0x6A, 0x00, 0x3E, 0x68, 0x08, 0x00, 0x53, 0x1D, 0x00, 0x32, 0x34, 0x00, 0x0D, 0x46, 0x00, 0x00, 0x4F, 0x00, 0x00, 0x4C, 0x09, 0x00, 0x3F, 0x4B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xAE, 0xAE, 0xAE, 0x17, 0x5F, 0xD6, 0x43, 0x41, 0xFF, 0x75, 0x29, 0xFA, 0x9E, 0x1D, 0xCA, 0xB4, 0x20, 0x7B, 0xB1, 0x33, 0x22, 0x96, 0x4E, 0x00, 0x6A, 0x6C, 0x00, 0x39, 0x84, 0x00, 0x0F, 0x90, 0x00, 0x00, 0x8D, 0x33, 0x00, 0x7B, 0x8C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xFE, 0xFF, 0xFF, 0x66, 0xAF, 0xFF, 0x93, 0x90, 0xFF, 0xC5, 0x78, 0xFF, 0xEE, 0x6C, 0xFF, 0xFF, 0x6F, 0xCA, 0xFF, 0x82, 0x71, 0xE6, 0x9E, 0x25, 0xBA, 0xBC, 0x00, 0x88, 0xD5, 0x01, 0x5E, 0xE1, 0x32, 0x47, 0xDD, 0x82, 0x4A, 0xCB, 0xDC, 0x4E, 0x4E, 0x4E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xFE, 0xFF, 0xFF, 0xC0, 0xDE, 0xFF, 0xD2, 0xD1, 0xFF, 0xE7, 0xC7, 0xFF, 0xF8, 0xC2, 0xFF, 0xFF, 0xC3, 0xE9, 0xFF, 0xCB, 0xC4, 0xF5, 0xD7, 0xA5, 0xE2, 0xE3, 0x94, 0xCE, 0xED, 0x96, 0xBC, 0xF2, 0xAA, 0xB3, 0xF1, 0xCB, 0xB4, 0xE9, 0xF0, 0xB6, 0xB6, 0xB6, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// emphasize red:
			0x66, 0x42, 0x3E, 0x00, 0x0D, 0x58, 0x15, 0x00, 0x75, 0x38, 0x00, 0x75, 0x56, 0x00, 0x58, 0x67, 0x00, 0x27, 0x68, 0x00, 0x00, 0x53, 0x0D, 0x00, 0x34, 0x1E, 0x00, 0x10, 0x2B, 0x00, 0x00, 0x30, 0x00, 0x00, 0x2B, 0x00, 0x00, 0x1C, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xAF, 0x7E, 0x78, 0x19, 0x37, 0x9A, 0x43, 0x20, 0xC1, 0x72, 0x0F, 0xC1, 0x9A, 0x08, 0x9A, 0xB1, 0x0F, 0x59, 0xB2, 0x22, 0x0F, 0x96, 0x37, 0x00, 0x6C, 0x4D, 0x00, 0x3D, 0x5F, 0x00, 0x16, 0x65, 0x00, 0x00, 0x5F, 0x0C, 0x00, 0x4B, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xFF, 0xC0, 0xB8, 0x68, 0x78, 0xDB, 0x93, 0x61, 0xFF, 0xC2, 0x4F, 0xFF, 0xEA, 0x49, 0xDB, 0xFF, 0x4F, 0x99, 0xFF, 0x63, 0x4E, 0xE7, 0x78, 0x08, 0xBC, 0x8F, 0x00, 0x8D, 0xA0, 0x00, 0x65, 0xA7, 0x08, 0x4D, 0xA0, 0x4A, 0x4C, 0x8D, 0x95, 0x4F, 0x2F, 0x2B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xFF, 0xC0, 0xB8, 0xC1, 0xA2, 0xC6, 0xD3, 0x99, 0xD6, 0xE7, 0x92, 0xD6, 0xF7, 0x8F, 0xC6, 0xFF, 0x92, 0xAB, 0xFF, 0x9A, 0x8C, 0xF6, 0xA2, 0x6F, 0xE4, 0xAC, 0x5F, 0xD1, 0xB3, 0x5F, 0xC0, 0xB6, 0x6F, 0xB7, 0xB3, 0x8B, 0xB6, 0xAB, 0xA9, 0xB7, 0x85, 0x7E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// emphasize green:
			0x39, 0x5D, 0x2C, 0x00, 0x24, 0x52, 0x00, 0x0D, 0x6A, 0x14, 0x00, 0x64, 0x2D, 0x00, 0x41, 0x3E, 0x00, 0x10, 0x3F, 0x03, 0x00, 0x30, 0x18, 0x00, 0x16, 0x2F, 0x00, 0x00, 0x42, 0x00, 0x00, 0x4C, 0x00, 0x00, 0x47, 0x00, 0x00, 0x39, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x71, 0xA3, 0x60, 0x00, 0x56, 0x91, 0x19, 0x39, 0xB1, 0x40, 0x20, 0xA9, 0x61, 0x12, 0x7B, 0x78, 0x18, 0x3A, 0x79, 0x2C, 0x00, 0x65, 0x48, 0x00, 0x42, 0x66, 0x00, 0x1B, 0x7E, 0x00, 0x00, 0x8D, 0x00, 0x00, 0x86, 0x0A, 0x00, 0x72, 0x54, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xAE, 0xF0, 0x99, 0x32, 0xA3, 0xCB, 0x56, 0x84, 0xEB, 0x7E, 0x6B, 0xE3, 0x9E, 0x5D, 0xB5, 0xB6, 0x64, 0x72, 0xB7, 0x77, 0x28, 0xA3, 0x94, 0x00, 0x7F, 0xB2, 0x00, 0x57, 0xCB, 0x00, 0x37, 0xD9, 0x00, 0x1F, 0xD3, 0x42, 0x1E, 0xBF, 0x8D, 0x27, 0x47, 0x1C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xAE, 0xF0, 0x99, 0x7B, 0xD0, 0xAD, 0x8A, 0xC3, 0xBA, 0x9A, 0xB9, 0xB7, 0xA8, 0xB3, 0xA4, 0xB1, 0xB6, 0x89, 0xB2, 0xBE, 0x6A, 0xAA, 0xCA, 0x50, 0x9B, 0xD6, 0x43, 0x8B, 0xE1, 0x46, 0x7D, 0xE6, 0x5A, 0x74, 0xE4, 0x75, 0x73, 0xDC, 0x94, 0x77, 0xAA, 0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// emphasize red + green:
			0x3F, 0x3F, 0x25, 0x00, 0x0B, 0x46, 0x00, 0x00, 0x5D, 0x18, 0x00, 0x5A, 0x2F, 0x00, 0x3F, 0x40, 0x00, 0x0E, 0x41, 0x00, 0x00, 0x32, 0x0A, 0x00, 0x19, 0x1A, 0x00, 0x00, 0x28, 0x00, 0x00, 0x2F, 0x00, 0x00, 0x2A, 0x00, 0x00, 0x1B, 0x1C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x79, 0x7A, 0x55, 0x00, 0x35, 0x81, 0x20, 0x1F, 0x9F, 0x45, 0x0D, 0x9C, 0x64, 0x04, 0x78, 0x7B, 0x0A, 0x36, 0x7C, 0x1E, 0x00, 0x68, 0x32, 0x00, 0x47, 0x49, 0x00, 0x22, 0x5B, 0x00, 0x03, 0x64, 0x00, 0x00, 0x5D, 0x00, 0x00, 0x4A, 0x4A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xBA, 0xBB, 0x8B, 0x3E, 0x75, 0xB7, 0x60, 0x5E, 0xD6, 0x85, 0x4C, 0xD2, 0xA4, 0x43, 0xAE, 0xBB, 0x4A, 0x6C, 0xBD, 0x5D, 0x21, 0xA8, 0x72, 0x00, 0x87, 0x89, 0x00, 0x61, 0x9B, 0x00, 0x42, 0xA4, 0x00, 0x2B, 0x9D, 0x34, 0x2A, 0x8A, 0x7F, 0x2C, 0x2D, 0x15, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xBA, 0xBB, 0x8B, 0x87, 0x9E, 0x9D, 0x95, 0x95, 0xAA, 0xA4, 0x8D, 0xA8, 0xB1, 0x89, 0x99, 0xBB, 0x8C, 0x7E, 0xBB, 0x94, 0x5F, 0xB3, 0x9D, 0x48, 0xA5, 0xA6, 0x3B, 0x96, 0xAE, 0x3D, 0x89, 0xB1, 0x4C, 0x7F, 0xAF, 0x67, 0x7F, 0xA6, 0x86, 0x80, 0x80, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// emphasize blue:
			0x47, 0x47, 0x7C, 0x00, 0x1A, 0x8C, 0x0B, 0x0A, 0xA9, 0x29, 0x00, 0xA3, 0x41, 0x00, 0x81, 0x4D, 0x00, 0x4A, 0x49, 0x00, 0x0D, 0x34, 0x04, 0x00, 0x14, 0x15, 0x00, 0x00, 0x28, 0x00, 0x00, 0x33, 0x00, 0x00, 0x33, 0x1B, 0x00, 0x2A, 0x58, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x0A,
			0x85, 0x84, 0xCD, 0x0B, 0x49, 0xE2, 0x35, 0x33, 0xFF, 0x5D, 0x1A, 0xFF, 0x7D, 0x0C, 0xD4, 0x8D, 0x0B, 0x8B, 0x86, 0x17, 0x3A, 0x6B, 0x2C, 0x00, 0x41, 0x42, 0x00, 0x19, 0x5B, 0x00, 0x00, 0x69, 0x04, 0x00, 0x6A, 0x4C, 0x00, 0x5E, 0x9E, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x0A,
			0xC9, 0xC8, 0xFF, 0x4E, 0x8C, 0xFF, 0x78, 0x76, 0xFF, 0xA0, 0x5C, 0xFF, 0xC1, 0x4E, 0xFF, 0xD1, 0x4D, 0xE4, 0xCB, 0x5A, 0x92, 0xAF, 0x6E, 0x4C, 0x84, 0x85, 0x25, 0x5C, 0x9E, 0x2D, 0x3B, 0xAD, 0x5B, 0x2B, 0xAD, 0xA5, 0x32, 0xA1, 0xF7, 0x34, 0x33, 0x62, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x0A,
			0xC9, 0xC8, 0xFF, 0x96, 0xAF, 0xFF, 0xA8, 0xA6, 0xFF, 0xB8, 0x9B, 0xFF, 0xC6, 0x96, 0xFF, 0xCC, 0x95, 0xFF, 0xCA, 0x9A, 0xEA, 0xBE, 0xA3, 0xCD, 0xAC, 0xAC, 0xBD, 0x9C, 0xB7, 0xC0, 0x8F, 0xBD, 0xD3, 0x88, 0xBD, 0xF2, 0x8B, 0xB8, 0xFF, 0x8B, 0x8A, 0xD6, 0x00, 0x00, 0x0A, 0x00, 0x00, 0x0A,
			// emphasize red + blue:
			0x46, 0x34, 0x4C, 0x00, 0x08, 0x5C, 0x0B, 0x00, 0x7A, 0x26, 0x00, 0x77, 0x3D, 0x00, 0x5C, 0x4A, 0x00, 0x30, 0x48, 0x00, 0x00, 0x34, 0x00, 0x00, 0x14, 0x0F, 0x00, 0x00, 0x1D, 0x00, 0x00, 0x24, 0x00, 0x00, 0x22, 0x00, 0x00, 0x18, 0x29, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x84, 0x6B, 0x8C, 0x0A, 0x30, 0xA1, 0x34, 0x19, 0xC8, 0x59, 0x07, 0xC5, 0x78, 0x00, 0xA1, 0x88, 0x01, 0x66, 0x86, 0x0E, 0x23, 0x6B, 0x23, 0x00, 0x40, 0x39, 0x00, 0x1C, 0x4C, 0x00, 0x00, 0x54, 0x00, 0x00, 0x52, 0x1A, 0x00, 0x44, 0x5C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xC7, 0xA7, 0xD2, 0x4C, 0x6B, 0xE8, 0x77, 0x54, 0xFF, 0x9C, 0x42, 0xFF, 0xBB, 0x39, 0xE7, 0xCC, 0x3C, 0xAB, 0xCA, 0x49, 0x68, 0xAE, 0x5E, 0x23, 0x83, 0x75, 0x00, 0x5E, 0x87, 0x00, 0x3F, 0x90, 0x23, 0x2E, 0x8E, 0x5F, 0x30, 0x80, 0xA2, 0x33, 0x23, 0x38, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xC7, 0xA7, 0xD2, 0x94, 0x8E, 0xDB, 0xA6, 0x85, 0xEB, 0xB5, 0x7D, 0xEA, 0xC2, 0x7A, 0xDB, 0xC9, 0x7B, 0xC2, 0xC8, 0x80, 0xA7, 0xBD, 0x89, 0x8A, 0xAB, 0x92, 0x7A, 0x9C, 0x9A, 0x7B, 0x8F, 0x9D, 0x8A, 0x88, 0x9C, 0xA3, 0x89, 0x97, 0xBE, 0x8A, 0x70, 0x93, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// emphasize green + blue:
			0x30, 0x41, 0x44, 0x00, 0x15, 0x5A, 0x00, 0x04, 0x71, 0x11, 0x00, 0x6B, 0x2A, 0x00, 0x49, 0x36, 0x00, 0x1C, 0x35, 0x00, 0x00, 0x25, 0x03, 0x00, 0x0C, 0x13, 0x00, 0x00, 0x26, 0x00, 0x00, 0x31, 0x00, 0x00, 0x2F, 0x00, 0x00, 0x25, 0x31, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x64, 0x7D, 0x80, 0x00, 0x42, 0x9E, 0x15, 0x2C, 0xBC, 0x3C, 0x13, 0xB4, 0x5C, 0x05, 0x86, 0x6D, 0x07, 0x4B, 0x6B, 0x15, 0x09, 0x57, 0x29, 0x00, 0x36, 0x40, 0x00, 0x0E, 0x59, 0x00, 0x00, 0x67, 0x00, 0x00, 0x64, 0x24, 0x00, 0x57, 0x66, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x9E, 0xBE, 0xC3, 0x2D, 0x83, 0xE1, 0x4E, 0x6C, 0xFF, 0x76, 0x53, 0xF8, 0x97, 0x45, 0xC9, 0xA7, 0x47, 0x8D, 0xA5, 0x55, 0x4A, 0x91, 0x6A, 0x12, 0x6F, 0x81, 0x00, 0x47, 0x9A, 0x00, 0x27, 0xA8, 0x2A, 0x16, 0xA5, 0x66, 0x18, 0x98, 0xA9, 0x1F, 0x2E, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x9E, 0xBE, 0xC3, 0x6F, 0xA6, 0xCF, 0x7D, 0x9C, 0xDC, 0x8E, 0x92, 0xD8, 0x9B, 0x8C, 0xC5, 0xA2, 0x8D, 0xAD, 0xA1, 0x93, 0x91, 0x99, 0x9C, 0x7A, 0x8B, 0xA5, 0x6D, 0x7A, 0xAF, 0x70, 0x6D, 0xB5, 0x84, 0x66, 0xB4, 0x9C, 0x67, 0xAE, 0xB8, 0x6A, 0x83, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// emphasize red + green + blue:
			0x34, 0x34, 0x34, 0x00, 0x08, 0x4B, 0x00, 0x00, 0x61, 0x14, 0x00, 0x5F, 0x2B, 0x00, 0x44, 0x38, 0x00, 0x17, 0x36, 0x00, 0x00, 0x27, 0x00, 0x00, 0x0E, 0x0F, 0x00, 0x00, 0x1D, 0x00, 0x00, 0x24, 0x00, 0x00, 0x22, 0x00, 0x00, 0x17, 0x21, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x6A, 0x6A, 0x6A, 0x00, 0x30, 0x88, 0x1B, 0x19, 0xA7, 0x40, 0x07, 0xA3, 0x5F, 0x00, 0x7F, 0x6F, 0x01, 0x44, 0x6D, 0x0E, 0x02, 0x59, 0x23, 0x00, 0x38, 0x39, 0x00, 0x13, 0x4B, 0x00, 0x00, 0x54, 0x00, 0x00, 0x52, 0x0F, 0x00, 0x44, 0x51, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xA6, 0xA6, 0xA6, 0x35, 0x6B, 0xC5, 0x56, 0x54, 0xE3, 0x7B, 0x42, 0xE0, 0x9B, 0x39, 0xBB, 0xAB, 0x3C, 0x80, 0xA9, 0x49, 0x3D, 0x95, 0x5E, 0x04, 0x73, 0x75, 0x00, 0x4E, 0x87, 0x00, 0x2F, 0x90, 0x0E, 0x1E, 0x8E, 0x4A, 0x20, 0x80, 0x8D, 0x23, 0x23, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xA6, 0xA6, 0xA6, 0x78, 0x8E, 0xB3, 0x85, 0x85, 0xC0, 0x95, 0x7D, 0xBE, 0xA2, 0x79, 0xAF, 0xA8, 0x7A, 0x96, 0xA8, 0x80, 0x7B, 0x9F, 0x89, 0x64, 0x91, 0x92, 0x57, 0x82, 0x9A, 0x59, 0x75, 0x9D, 0x68, 0x6E, 0x9C, 0x80, 0x6F, 0x97, 0x9C, 0x70, 0x70, 0x70, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
	]);
			
	chosenColor = 0; // During screen rendering, this value is the index into the color array.
	Screen = new Uint8Array(256 * 240 * 4);
	NTSCScreen = new Uint8Array(256*8 * 240 * 4);

	//Debugging
	Logging = false;    // If set, the tracelogger will record all instructions ran.
	DebugLog = ""; // This is where the tracelogger is recording.

	PPU_RESET = false;

	// when pressing the reset button, this function runs
	Reset()
	{
			// The this.A, this.X, and this.Y registers are unchanged through reset.
			// most flags go unchanged as well, but the I flag is set to 1
			this.flag_Interrupt = true;
			// Triangle phase gets reset, though I'm not yet emulating audio.
			this.APU_DMC_Output &= 1;
			// All the bits of $4015 are cleared
			this.APU_Status_DMCInterrupt = false;
			this.APU_Status_FrameInterrupt = false;
			this.APU_Status_DelayedDMC = false;
			this.APU_Status_DMC = false;
			this.APU_Status_Noise = false;
			this.APU_Status_Triangle = false;
			this.APU_Status_Pulse2 = false;
			this.APU_Status_Pulse1 = false;
			this.APU_DMC_BytesRemaining = 0;
			this.APU_LengthCounter_Noise = 0;
			this.APU_LengthCounter_Triangle = 0;
			this.APU_LengthCounter_Pulse2 = 0;
			this.APU_LengthCounter_Pulse1 = 0;
			this.APU_Framecounter = 0; // reset the frame counter

			// this.PPU registers
			this.PPU_Update2000Delay = 0;
			this.PPU_Ctrl = 0; // this value is only used for debugging.
			this.PPUControl_NMIEnabled = false;
			this.PPUControlIncrementMode32 = false;
			this.PPU_Spritex16 = false;
			this.PPU_PatternSelect_Sprites = false;
			this.PPU_PatternSelect_Background = false;
			this.PPU_TempVRAMAddress = 0;

			this.PPU_Update2001Delay = 0;
			this.PPU_Mask_Greyscale = false;
			this.PPU_Mask_EmphasizeRed = false;
			this.PPU_Mask_EmphasizeGreen = false;
			this.PPU_Mask_EmphasizeBlue = false;
			this.PPU_Mask_8PxShowBackground = false;
			this.PPU_Mask_8PxShowSprites = false;
			this.PPU_Mask_ShowBackground = false;
			this.PPU_Mask_ShowSprites = false;

			this.PPU_Update2005Delay = 0;
			this.PPU_FineXScroll = 0;

			//$2006 is unchanged

			this.PPU_Data_StateMachine = 9;
			this.PPU_VRAMAddressBuffer = 0;
			this.PPU_OddFrame = false;

			this.PPU_Dot = 0;
			this.PPU_Scanline = 0;

			this.DoDMCDMA = false;
			this.DoOAMDMA = false;
			this.operationCycle = 0;
			this.operationComplete = false;
			this.DoReset = true;
			this.PPU_RESET = true;
			// in theory, the CPU/this.PPU clock would be given random values. Let's just assume no changes.
	}

	CPU_Read = false; // DMC DMA Has some specific behavior depending on if the CPU is currently reading or writing. DMA Halting fails / DMA $2007 bug.


	// The BRK instruction is re-used in the IRQ, NMI, and RESET logic. These bools are used both to start the instruction, and also to make sure the correct logic is used.
	DoBRK = false; // Set if the opcode is 00
	DoNMI = false; // Set if a Non Maskable Interrupt is occuring
	DoIRQ = false; // Set if an Interrupt REquest is occuring

	DoReset = false;  // Set when resetting the console, or power on.
	DoOAMDMA = false; // If set, the Object Acctribute Memory's Direct Memory Access will occur.
	FirstCycleOfOAMDMA = false; // The first cycle caa behave differently.
	DoDMCDMA = false; // If set, the Delta Modulation Channel's Direct Memory Access will occur.
	DMCDMADelay = 0; // There's actually a slight delay between the audio chip preparing the DMA, and the CPU actually running it.
	CannotRunDMCDMARightNow = 0;

	SuppressInterrupt = false; // If the IRQ happens on the wrong cycle of a DMA, it gets suppressed, and never runs.
	InterruptHijackedByIRQ = false; // If a BRK or NMI occurs, and an IRQ happens in the middle of it, it's possible for the instruction to be "hijacked" and move the PC to the wrong address.
	InterruptHijackedByNMI = false; // If a BRK or IRQ occurs, and an NMI happens in the middle of it, it's possible for the instruction to be "hijacked" and move the PC to the wrong address.

	DMAPage = 0;    // When running an OAM DMA, this is used to determine which "page" to read bytes from. Typically, this is page 2 (address $200 through $2FF)
	DMAAddress = 0; // While this DMA runs, this value is incremented until it overflows.

	FrameAdvance_ReachedVBlank = false; // For debugging. If frame advancing, this is set when VBlank occurs.

	APU_ControllerPortsStrobing = false; // Set to true/false depending on the value written to $4016. When true, the buttons pressed are recorded in the shift registers.
	APU_ControllerPortsStrobed = false;  // This bool prevents strobing from rushing through the TAS input log.
																					 // This gets set to false if the controllers are unstrobed, or if the controller ports are read.

	ControllerPort1 = 0;            // The buttons currently pressed on controller 1. These are in the "A, B, Select, Start, Up, Down, Left, Right" order.
	ControllerPort2 = 0;            // The buttons currently pressed on controller 2. These are in the "A, B, Select, Start, Up, Down, Left, Right" order.
	ControllerShiftRegister1 = 0;   // Controllers are read 1 bit at a time. First the A Button is read, then B, and so on.
	ControllerShiftRegister2 = 0;   // Whenever the shift register is read, all the bits are shifted to the left, and a '1' replaces bit 0.
	Controller1ShiftCounter = 0;    // Subsequent CPU cycles reading from $2006 do not update the shift register.
	Controller2ShiftCounter = 0;    // Subsequent CPU cycles reading from $2007 do not update the shift register.



	// The PPU state machine:
	// In summary, the steps that are taken when writing to 2007 do not happen in a single ppu cycle.
	PPU_Data_StateMachine = 0x7;                   // The value of the state machine indicates what step should be taken on any given ppu cycle.
	PPU_Data_SateMachine_Read = false;                      // If this is a read instruction, the state machine behaves differently
	PPU_Data_SateMachine_Read_Delayed = false;              // If the read cycle happens immediately before a write cycle, there's also different behavior.
	PPU_Data_StateMachine_PerformMysteryWrite = false;      // This is only set during a read-modify-write instruction to $2007, if the current CPU/PPU alignment would result in "the mystery write" occuring.
	PPU_Data_StateMachine_InputValue = 0;               // This is the value that was written to $2007 while interrupting the state machine.
	PPU_Data_StateMachine_UpdateVRAMAddressEarly = false;   // During read-modify-write instructions to $2007, certain CPU/PPU alignments will update the VRAM address earlier than expected.
	PPU_Data_StateMachine_UpdateVRAMBufferLate = false;     // During read-modify-write instructions to $2007, certain CPU/PPU alignments will update the VRAM buffer later than expected.
	PPU_Data_StateMachine_NormalWriteBehavior = false;      // If this write instruction is not interrupting the state machine.
	PPU_Data_StateMachine_InterruptedReadToWrite = false;   // If a write happens on cycle 3 of the state machine.

	MMC3_M2Filter = 0;  // The MMC3 chip only clocks the IRQ timer if A12 has been low for at *least* 3 falling edges of M2.
	ResetM2Filter = false;  // Due to how I implemented the M2 filter, I need to reset it to zero at a specific moment, or else I can miss an IRQ clock.

	_CoreFrameAdvance()
	{
			// If we're running this emulator 1 frame at a time, this waits until VBlank and then returns.
			this.FrameAdvance_ReachedVBlank = false;
			while (!this.FrameAdvance_ReachedVBlank)
			{
					this._EmulatorCore();
			}
	}

	CycleCountForCycleTAS = 0; // If we're running a intercycle cart swapping TAS, we need to keep track of which cycle we're on.
	_CoreCycleAdvance()
	{
			// this runs 12 master clock cycles, or 1 CPU cycle.
			let i = 0;
			while (i < 12)
			{
					this._EmulatorCore();
					i++;
			}
			this.CycleCountForCycleTAS++;
	}

	_EmulatorCore()
	{
			// master clock
			this.MasterClock++;
			if (this.MasterClock === 24)
			{
					this.MasterClock = 0;
			}
			// counters count down to 0, run the appropriate chip's logic, and the counter is reset.
			// If multiple counters read 0 at the same time, there's an order of events.
			// The order of events:
			// CPU
			// this.PPU
			// APU



			if (this.CPUClock === 0)
			{

					this._6502(); // This is where I run the CPU
					this.totalCycles++;         // for debugging mostly
					if (this.operationComplete) // If this instruction is complete
					{
							this.operationComplete = false;
							this.operationCycle = 0;
							this.addressBus = this.programCounter;
							this.CPU_Read = true;
							this.IgnoreH = false;
					}

					this._EmulateMappers(); // currently just used to clock the sunsoft FME-7 IRQ counter.
					this.CPUClock = 12; // there is 1 CPU cycle for every 12 master clock cycles
			}
			if (this.CPUClock === 8)
			{
					this.NMILine = this.PPUControl_NMIEnabled && this.PPUStatus_VBlank_Delayed;
			}
			if (this.PPUClock === 0)
			{
					this._EmulatePPU();
					if (this.PPUBus !== 0)
					{
							this.DecayPPUDataBus();
					}
					this.PPUClock = 4; // there is 1 this.PPU cycle for every 12 master clock cycles
			}
			if (this.CPUClock === 5)
			{
					this.IRQLine = this.IRQ_LevelDetector;
					if(this.APU_Status_FrameInterrupt && !this.APU_FrameCounterInhibitIRQ)
					{
							this.IRQ_LevelDetector = true; // if the APU frame counter flag is never cleared, you will get another IRQ when the I flag is cleared.
					}
					if ((this.PPU_AddressBus & 0b0001000000000000) === 0)
					{
							if (this.MMC3_M2Filter < 3)
							{
									this.MMC3_M2Filter++;
							}
					}
					else
					{
							this.ResetM2Filter = true; // the filter gets reset in the function that clocks the MMC3 IRQ
					}
			}


			if (this.APUClock === 0)
			{
					this.APU_PutCycle = !this.APU_PutCycle;

					this._EmulateAPU();

					this.APUClock = 12; //24
					// the APU is actually clocked every 24 master clock cycles.
					// yet there's a lot of timing that happens every cpu cycle anyway??
					// If the timing needs to be exactly n and a half APU cycles, then I'll just multiply the numbers by 2 and clock this twice as fast.
			}

			// Decrement the clocks.
			this.PPUClock--;
			this.CPUClock--;
			this.APUClock--;
	}

	_EmulateMappers()
	{
			if (this.Cart.MemoryMapper === 69)
			{
					// The sunsoft FME-7 mapper chip has an IRQ counter that ticks down once per CPU cycle.
					if (this.Cart.Mapper_69_EnableIRQCounterDecrement)
					{
							let temp = this.Cart.Mapper_69_IRQCounter;
							this.Cart.Mapper_69_IRQCounter--;
							if (this.Cart.Mapper_69_EnableIRQ && temp < this.Cart.Mapper_69_IRQCounter)
							{
									this.IRQ_LevelDetector = true;
							}
					}
			}
	}

	// Audio Processing Unit Variables //

	// APU Status is at address $4015
	APU_Status_DMCInterrupt = false;  // Bit 7 of $4015
	APU_Status_FrameInterrupt = false;// Bit 6 of $4015
	APU_Status_DMC = false;           // Bit 5 of $4015
	APU_Status_DelayedDMC = false;    // Bit 5 of $4015, but with a slight delay.
	APU_Status_Noise = false;         // Bit 3 of $4015
	APU_Status_Triangle = false;      // Bit 2 of $4015
	APU_Status_Pulse2 = false;        // Bit 1 of $4015
	APU_Status_Pulse1 = false;        // Bit 0 of $4015

	Clearing_APU_FrameInterrupt = false;


	APU_DelayedDMC4015 = 0;         // When writing to $4015, there's a 3 or 4 cycle delay between the APU actually changing this value.
	APU_ImplicitAbortDMC4015 = false;   // An edge case of the DMC DMA, where regardless of the buffer being empty, there will be a 1-cycle DMA that gets aborted 2 cycles after the load DMA ends
	APU_SetImplicitAbortDMC4015 = false;// This is used to make that happen.

	APU_Register = new Uint8Array(0x18); // Instead of making a series of variables, I made an array here for some reason.

	APU_FrameCounterMode = false;       // Bit 7 of $4017 : Determines if the APU frame counter is using the 4 step or 5 step modes.
	APU_FrameCounterInhibitIRQ = false; // Bit 6 of $4017 : If set, prevents the APU from creating IRQ's

	APU_FrameCounterReset = 0xFF; // When resetting the APU Frame counter by writing to address $4017, there's a 3 (or 4) CPU cycle delay. (3 if it's an even cpu cycle, 4 if odd.)
	APU_Framecounter = 0;       // Increments every APU cycle. Since there are events that happen at half-step intervals, I actually increment this every CPU cycle and multiplied all intervals by 2.
	APU_QuarterFrameClock = false;// This is clocked approximately 4 times a frame, depending on the frame counter mode.
	APU_HalfFrameClock = false;   // This is clocked approximately twice a frame, depending on the frame counter mode.

	APU_Envelope_StartFlag = false;
	APU_Envelope_DividerClock = false;
	APU_Envelope_DecayLevel = 0;

	APU_LengthCounter_Pulse1 = 0;   // The length counter for the APU's Pulse 1 channel.
	APU_LengthCounter_Pulse2 = 0;   // The length counter for the APU's Pulse 2 channel.
	APU_LengthCounter_Triangle = 0; // The length counter for the APU's Triangle channel.
	APU_LengthCounter_Noise = 0;    // The length counter for the APU's Noise channel.

	// When a length counter's reloaded value is set by writing to $4003, $4007, $400B, or $400F, this LookUp Table is used to determine the length based on the value written.
	static APU_LengthCounterLUT = new Uint8Array([ 10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14, 12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30 ]);

	APU_LengthCounter_HaltPulse1 = false;   // set if Bit 5 of $4000 is 1
	APU_LengthCounter_HaltPulse2 = false;   // set if Bit 5 of $4004 is 1
	APU_LengthCounter_HaltTriangle = false; // set if Bit 7 of $4008 is 1
	APU_LengthCounter_HaltNoise = false;    // set if Bit 5 of $400C is 1

	APU_LengthCounter_ReloadPulse1 = false;  // When writing to $4003 (if the pulse 1 channel is enabled) this is set to true. The value is reloaded in the next APU cycle.
	APU_LengthCounter_ReloadPulse2 = false;  // When writing to $4007 (if the pulse 2 channel is enabled) this is set to true. The value is reloaded in the next APU cycle.
	APU_LengthCounter_ReloadTriangle = false;// When writing to $400B (if the triangle channel is enabled) this is set to true. The value is reloaded in the next APU cycle.
	APU_LengthCounter_ReloadNoise = false;   // When writing to $400F (if the noise channel is enabled) this is set to true. The value is reloaded in the next APU cycle.

	APU_LengthCounter_ReloadValuePulse1 = 0;  // When the pulse 1 channel is reloaded, the length counter will be set to this value. Modified by writing to $4003.
	APU_LengthCounter_ReloadValuePulse2 = 0;  // When the pulse 2 channel is reloaded, the length counter will be set to this value. Modified by writing to $4007.
	APU_LengthCounter_ReloadValueTriangle = 0;// When the triangle channel is reloaded, the length counter will be set to this value. Modified by writing to $400B.
	APU_LengthCounter_ReloadValueNoise = 0;   // When the noise channel is reloaded, the length counter will be set to this value. Modified by writing to $400F.

	APU_ChannelTimer_Pulse1 = 0;  // Decrements every "get" cycle.
	APU_ChannelTimer_Pulse2 = 0;  // Decrements every "get" cycle.
	APU_ChannelTimer_Triangle = 0;// Decrements every CPU cycle.
	APU_ChannelTimer_Noise = 0;   // Decrements every "get" cycle.
	APU_ChannelTimer_DMC = 0;     // Decrements every CPU cycle.


	// $4010
	APU_DMC_EnableIRQ = false;  // Will the DMC create IRQ's? Set by writing to address $4010
	APU_DMC_Loop = false;       // Will DPCM samples loop?
	APU_DMC_Rate = 428;       // The default sample rate is the slowest.
	// LookUp Table for how many CPU cycles are between each bit of the DPCM sample being played. (8 bits per byte, so to calculate how many cycles there are between each DMA, multiply these numbers by 8)
	static APU_DMCRateLUT = new Uint16Array([ 428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54 ]);

	// $4011 (and DPCM stuff)
	APU_DMC_Output = 0; // Directly writing here (Address $4011) will set the DMC output. This is how you play PCM audio.

	// $4012
	APU_DMC_SampleAddress = 0xC000;   // Where the DPCM sample is being read from.

	// $4013
	APU_DMC_SampleLength = 0;  // How many bytes are being played in this DPCM smaple? (multiplied by 64, and add 1)

	APU_DMC_BytesRemaining = 0; // How many bytes are left in the sample. When a sample starts or loops, this is set to APU_DMC_SampleLength.
	APU_DMC_Buffer = 0;  // The value that goes into the shift register.
	APU_DMC_AddressCounter = 0xC000; // What byte is fetched in the next DMA for DPCM audio? When a sample starts or loops, this is set to APU_DMC_SampleAddress.
	APU_DMC_Shifter = 0; // The 8 bits of the sample that were fetched from the DMA.
	APU_DMC_ShifterBitsRemaining = 8; // This tracks how many bits are left before needing to run another DMA
	DPCM_Up = false;    // If the next bit of the DPCM sample is a 1, the output goes up. Otherwise it goes down.

	APU_Silent = true;  // If the APU is not making any noise, this is set.

	// extra stuff
	static sequenceLookup = new Uint8Array([
	0b00000001,
	0b00000011,
	0b00001111,
	0b11111100
	]);

	static sequencer3Sequence = new Uint8Array([
	15, 14, 13, 12, 11, 10,  9,  8,  7,  6,  5,  4,  3,  2,  1,  0,
	 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15
	]);

	static periodLookup = new Uint8Array([4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068]);

	env1Volume = 0;
	env1Decay = 0;
	env1Divider = 0;
	env1Start = false;
	env1Loop = false;
	env1Constant = false;
	env2Volume = 0;
	env2Decay = 0;
	env2Divider = 0;
	env2Start = false;
	env2Loop = false;
	env2Constant = false;
	env3Volume = 0;
	env3Decay = 0;
	env3Divider = 0;
	env3Start = false;
	env3Loop = false;
	env3Constant = false;

	sweep1Period = 0;
	sweep1Shift = 0;
	sweep1Target = 0;
	sweep1Divider = 0;
	sweep1Enabled = false;
	sweep1Reload = false;
	sweep1Negate = false;
	sweep2Period = 0;
	sweep2Shift = 0;
	sweep2Target = 0;
	sweep2Divider = 0;
	sweep2Enabled = false;
	sweep2Reload = false;
	sweep2Negate = false;

	sequencer1Sequence = 0;
	sequencer2Sequence = 0;

	sequencer1Position = 0;
	sequencer2Position = 0;
	sequencer3Position = 0;
	length1Enabled = false;
	length2Enabled = false;
	length3Enabled = false;
	length4Enabled = false;
	length1Halt = false;
	length2Halt = false;
	length3Halt = false;
	length4Halt = false;
	length1Counter = 0;
	length2Counter = 0;
	length3Counter = 0;
	length4Counter = 0;
	timer1Period = 0;
	timer2Period = 0;
	timer3Period = 0;
	timer4Period = 0;
	timer1Counter = 0;
	timer2Counter = 0;
	timer3Counter = 0;
	timer4Counter = 0;


	linearCounter = 0;
	linearCounterReloadValue = 0;
	linearCounterReload = false;
	linearCounterControl = false;

	shiftBit = 1;
	shiftRegister = 0;

	_EmulateAPU()
	{
			// This runs every 12 master clock cycles, though has different logic for even/odd CPU cycles.

			if (this.Controller1ShiftCounter > 0)
			{
					this.Controller1ShiftCounter--;
					if (this.Controller1ShiftCounter === 0)
					{
							this.ControllerShiftRegister1 <<= 1;
							this.ControllerShiftRegister1 |= 1;
					}
			}
			if (this.Controller2ShiftCounter > 0)
			{
					this.Controller2ShiftCounter--;
					if (this.Controller2ShiftCounter === 0)
					{
							this.ControllerShiftRegister2 <<= 1;
							this.ControllerShiftRegister2 |= 1;
					}
			}

			if (this.APU_PutCycle)
			{

					// controller reading is handled here in the APU chip.

					// If a 1 was written to $4016, we are strobing the controller.
					if (this.APU_ControllerPortsStrobing)
					{
							if (!this.APU_ControllerPortsStrobed)
							{
									this.APU_ControllerPortsStrobed = true;
									// this will be reset to false if:
									// 1.) the controllers are un-strobed. Ready for the next strobe.
									// 2.) the controller ports are read, while still strobed. This allows data to be streamed in through the this.A button.


									if (this.TAS_ReadingTAS) // This is specifically how I load inputs from a TAS, and has nothing to do with actual NES behavior.
									{
											if (this.TAS_InputSequenceIndex < TAS_InputLog.length)
											{
													this.ControllerPort1 = (TAS_InputLog[this.TAS_InputSequenceIndex] & 0xFF);
													this.ControllerPort2 = ((TAS_InputLog[this.TAS_InputSequenceIndex] & 0xFF00) >> 8);
											}
											else // if the TAS has ended, only provide 0 as the inputs.
											{
													this.ControllerPort1 = 0;
													this.ControllerPort2 = 0;
											}
											if (this.ClockFiltering)
											{
													this.TAS_InputSequenceIndex++; // Instead of using 1 input per frame, this just advances to the next input
											}

									}
									// this sets up the shift registers with the value of the controller ports.
									// If not set by the TAS, these are probably set outside this script in the script for the form.
									this.ControllerShiftRegister1 = this.ControllerPort1;
									this.ControllerShiftRegister2 = this.ControllerPort2;
							}
					}
					else
					{
							this.APU_ControllerPortsStrobed = false;
					}

					// clock timers
					this.APU_ChannelTimer_Pulse1--; // every APU GET cycle.
					this.APU_ChannelTimer_Pulse2--;
					this.APU_ChannelTimer_Noise--;


					//this happens whether a sample is playing or not
					this.APU_ChannelTimer_DMC--;
					this.APU_ChannelTimer_DMC--; // the table is in CPU cycles, but the count is in APU cycles
					if (this.APU_ChannelTimer_DMC === 0)
					{
							this.APU_ChannelTimer_DMC = this.APU_DMC_Rate;
							this.DPCM_Up = (this.APU_DMC_Shifter & 1) === 1;
							if (this.DPCM_Up)
							{
									if (this.APU_DMC_Output <= 125) // this is 7 bit, and cannot go above 127
									{
											this.APU_DMC_Output += 2;
									}
							}
							else
							{
									if (this.APU_DMC_Output >= 2) // this is 7 bit, and cannot go below 0
									{
											this.APU_DMC_Output -= 2;
									}
							}
							this.APU_DMC_Shifter >>= 1; // shift the bits in the shift register
							this.APU_DMC_ShifterBitsRemaining--; // and decrement the "bits remaining" counter.
							if (this.APU_DMC_ShifterBitsRemaining === 0) // If there are no bits left,
							{
									this.APU_DMC_ShifterBitsRemaining = 8; // it's time for a DMC DMA!

									if (this.APU_DMC_BytesRemaining > 0 || this.APU_SetImplicitAbortDMC4015)
									{
											if (!this.DoDMCDMA && this.CannotRunDMCDMARightNow !== 2)
											{
													// if playing a sample:
													this.DoDMCDMA = true;
													this.DMCDMA_Halt = true;
											}
											if (this.APU_SetImplicitAbortDMC4015)
											{
													this.APU_ImplicitAbortDMC4015 = true; // check for weird DMA abort behavior
													this.APU_SetImplicitAbortDMC4015 = false;
											}
											this.APU_DMC_Shifter = this.APU_DMC_Buffer; // and set up the shifter with the new values.
											this.APU_Silent = false; // The APU is not silent.
											
									}
									else
									{
											this.APU_Silent = true;
									}
							}                   
					}
					if (this.CannotRunDMCDMARightNow > 0)
					{
							this.CannotRunDMCDMARightNow -= 2;
					}
			}
			else
			{
					if (this.Clearing_APU_FrameInterrupt)
					{
							this.Clearing_APU_FrameInterrupt = false;
							this.APU_Status_FrameInterrupt = false;
							this.IRQ_LevelDetector = false;
					}
					// DMC load from 4015
					if (this.DMCDMADelay > 0)
					{
							this.DMCDMADelay--; // there's a small delay beetween the write occuring and the DMA beginning
							if (this.DMCDMADelay === 0 && !this.DoDMCDMA) // if the DMA is already happening because of the timer
							{
									this.DoDMCDMA = true;
									this.DMCDMA_Halt = true;
									this.APU_DMC_Shifter = this.APU_DMC_Buffer;
									this.APU_Silent = false;
							}
					}

			}
			if (this.APU_DelayedDMC4015 > 0)
			{
					this.APU_DelayedDMC4015--;
					if (this.APU_DelayedDMC4015 === 0)
					{
							this.APU_Status_DMC = this.APU_Status_DelayedDMC;
							if (!this.APU_Status_DMC)
							{
									this.APU_DMC_BytesRemaining = 0;
							}
					}
			}


			this.APU_ChannelTimer_Triangle--; // every CPU cycle.


			// clock sequencer
			if ((this.APU_FrameCounterReset & 0x80) === 0)
			{
					this.APU_FrameCounterReset--;
					if ((this.APU_FrameCounterReset & 0x80) !== 0)
					{
							this.APU_Framecounter = 0;
					}
			}

			this.APU_Framecounter++;

			// We're clocking the APU twice as fast in order to get the frame counter timing to allow the 'half APU cycle' timing.
			// these numbers are just multiplied by 2.

			if (this.APU_FrameCounterMode)
			{
					// 5 step
					switch (this.APU_Framecounter)
					{
							default: break;
							case 7457:
									this.APU_QuarterFrameClock = true;
									break;
							case 14913:
									this.APU_QuarterFrameClock = true;
									this.APU_HalfFrameClock = true;
									break;
							case 22371:
									this.APU_QuarterFrameClock = true;
									break;
							case 29829:
									break;
							case 37281:
									this.APU_QuarterFrameClock = true;
									this.APU_HalfFrameClock = true;
									break;
							case 37282:
									this.APU_Framecounter = 0;
									break;
					}
			}
			else
			{
					// 4 step
					switch (this.APU_Framecounter)
					{
							default: break;
							case 7457:
									this.APU_QuarterFrameClock = true;
									break;
							case 14913:
									this.APU_QuarterFrameClock = true;
									this.APU_HalfFrameClock = true;
									break;
							case 22371:
									this.APU_QuarterFrameClock = true;
									break;
							case 29828:
									this.APU_Status_FrameInterrupt = true;
									break;
							case 29829:
									this.APU_QuarterFrameClock = true;
									this.APU_Status_FrameInterrupt = true;
									this.IRQ_LevelDetector |= !this.APU_FrameCounterInhibitIRQ;
									this.APU_HalfFrameClock = true;
									
									break;
							case 29830:
									this.APU_Status_FrameInterrupt = !this.APU_FrameCounterInhibitIRQ;
									this.IRQ_LevelDetector |= !this.APU_FrameCounterInhibitIRQ;

									this.APU_Framecounter = 0;

									break;
					}

			}





			// perform quarter frame / half frame stuff

			if (this.APU_QuarterFrameClock)
			{
					this.APU_QuarterFrameClock = false;
					if (this.APU_Envelope_StartFlag)
					{
							this.APU_Envelope_StartFlag = false;
							this.APU_Envelope_DecayLevel = 15;

					}
					else
					{
							this.APU_Envelope_DividerClock = true;


					}
					
					// extra stuff
				
					if (this.env1Start) {
						this.env1Start = false;
						this.env1Decay = 0xF;
						this.env1Divider = this.env1Volume;
					} else {
						if (this.env1Divider) {
							this.env1Divider--;
						} else {
							this.env1Divider = this.env1Volume;
							
							if (this.env1Decay) {
								this.env1Decay--;
							} else if (this.env1Loop) {
								this.env1Decay = 0xF;
							}
						}
					}
					
					if (this.env2Start) {
						this.env2Start = false;
						this.env2Decay = 0xF;
						this.env2Divider = this.env2Volume;
					} else {
						if (this.env2Divider) {
							this.env2Divider--;
						} else {
							this.env2Divider = this.env2Volume;
							
							if (this.env2Decay) {
								this.env2Decay--;
							} else if (this.env2Loop) {
								this.env2Decay = 0xF;
							}
						}
					}
					
					if (this.env3Start) {
						this.env3Start = false;
						this.env3Decay = 0xF;
						this.env3Divider = this.env3Volume;
					} else {
						if (this.env3Divider) {
							this.env3Divider--;
						} else {
							this.env3Divider = this.env3Volume;
							
							if (this.env3Decay) {
								this.env3Decay--;
							} else if (this.env3Loop) {
								this.env3Decay = 0xF;
							}
						}
					}
					
					if (this.linearCounterReload) {
						this.linearCounter = this.linearCounterReloadValue
					} else if (this.linearCounter) {
						this.linearCounter--;
					}
					
					if (!this.linearCounterControl) this.linearCounterReload = false;
			}

			if (this.APU_HalfFrameClock)
			{
					if (this.APU_LengthCounter_ReloadPulse1 && this.APU_LengthCounter_Pulse1 === 0) { this.APU_LengthCounter_Pulse1 = this.APU_LengthCounter_ReloadValuePulse1; } else { this.APU_LengthCounter_ReloadPulse1 = false; }
					if (this.APU_LengthCounter_ReloadPulse2 && this.APU_LengthCounter_Pulse2 === 0) { this.APU_LengthCounter_Pulse2 = this.APU_LengthCounter_ReloadValuePulse2; } else { this.APU_LengthCounter_ReloadPulse2 = false; }
					if (this.APU_LengthCounter_ReloadTriangle && this.APU_LengthCounter_Triangle === 0) { this.APU_LengthCounter_Triangle = this.APU_LengthCounter_ReloadValueTriangle; } else { this.APU_LengthCounter_ReloadTriangle = false; }
					if (this.APU_LengthCounter_ReloadNoise && this.APU_LengthCounter_Noise === 0) { this.APU_LengthCounter_Noise = this.APU_LengthCounter_ReloadValueNoise; } else { this.APU_LengthCounter_ReloadNoise = false; }
					this.APU_HalfFrameClock = false;
					// length counters and sweep
					if (!this.APU_Status_Pulse1) { this.APU_LengthCounter_Pulse1 = 0; }
					if (!this.APU_Status_Pulse2) { this.APU_LengthCounter_Pulse2 = 0; }
					if (!this.APU_Status_Triangle) { this.APU_LengthCounter_Triangle = 0; }
					if (!this.APU_Status_Noise) { this.APU_LengthCounter_Noise = 0; }

					if (this.APU_LengthCounter_Pulse1 !== 0 && !this.APU_LengthCounter_HaltPulse1 && !this.APU_LengthCounter_ReloadPulse1)
					{
							this.APU_LengthCounter_Pulse1--;
					}
					if (this.APU_LengthCounter_Pulse2 !== 0 && !this.APU_LengthCounter_HaltPulse2 && !this.APU_LengthCounter_ReloadPulse2)
					{
							this.APU_LengthCounter_Pulse2--;
					}
					if (this.APU_LengthCounter_Triangle !== 0 && !this.APU_LengthCounter_HaltTriangle && !this.APU_LengthCounter_ReloadTriangle)
					{
							this.APU_LengthCounter_Triangle--;
					}
					if (this.APU_LengthCounter_Noise !== 0 && !this.APU_LengthCounter_HaltNoise && !this.APU_LengthCounter_ReloadNoise)
					{
							this.APU_LengthCounter_Noise--;
					}
					
					// extra stuff
					if (this.length1Counter && !this.length1Halt) this.length1Counter--;
					if (this.length2Counter && !this.length2Halt) this.length2Counter--;
					if (this.length3Counter && !this.length3Halt) this.length3Counter--;
					if (this.length4Counter && !this.length4Halt) this.length4Counter--;
					
					if (!this.sweep1Divider && this.sweep1Enabled && this.sweep1Shift && this.sweep1Target < 0x800 && this.timer1Period > 7) this.timer1Period = this.sweep1Target;
					if (!this.sweep1Divider || this.sweep1Reload) {
						this.sweep1Divider = this.sweep1Period;
						this.sweep1Reload = false;
					} else {
						this.sweep1Divider--;
					}
					
					if (!this.sweep2Divider && this.sweep2Enabled && this.sweep2Shift && this.sweep2Target < 0x800 && this.timer2Period > 7) this.timer2Period = this.sweep2Target;
					if (!this.sweep2Divider || this.sweep2Reload) {
						this.sweep2Divider = this.sweep2Period;
						this.sweep2Reload = false;
					} else {
						this.sweep2Divider--;
					}
			}
			else
			{
					if (this.APU_LengthCounter_ReloadPulse1) { this.APU_LengthCounter_Pulse1 = this.APU_LengthCounter_ReloadValuePulse1; }
					if (this.APU_LengthCounter_ReloadPulse2) { this.APU_LengthCounter_Pulse2 = this.APU_LengthCounter_ReloadValuePulse2; }
					if (this.APU_LengthCounter_ReloadTriangle) { this.APU_LengthCounter_Triangle = this.APU_LengthCounter_ReloadValueTriangle; }
					if (this.APU_LengthCounter_ReloadNoise) { this.APU_LengthCounter_Noise = this.APU_LengthCounter_ReloadValueNoise; }
					this.APU_LengthCounter_ReloadPulse1 = false;
					this.APU_LengthCounter_ReloadPulse2 = false;
					this.APU_LengthCounter_ReloadTriangle = false;
					this.APU_LengthCounter_ReloadNoise = false;
			}
			
			// extra stuff
			
			this.sweep1Target = Math.max(0, this.timer1Period + (this.timer1Period >> this.sweep1Shift) * (this.sweep1Negate ? -1 : 1) - this.sweep1Negate);
			this.sweep2Target = Math.max(0, this.timer2Period + (this.timer2Period >> this.sweep2Shift) * (this.sweep2Negate ? -1 : 1));
				
			if (this.timer3Counter) {
				this.timer3Counter--;
			} else {
				this.timer3Counter = this.timer3Period;
				
				if (this.length3Counter && this.linearCounter) {
					if (this.sequencer3Position) {
						this.sequencer3Position--;
					} else {
						this.sequencer3Position = 31;
					}
				}
			}
			
			if (!this.APU_PutCycle) {
				if (this.timer1Counter) {
					this.timer1Counter--;
				} else {
					this.timer1Counter = this.timer1Period;
					
					if (this.sequencer1Position) {
						this.sequencer1Position--;
					} else {
						this.sequencer1Position = 7;
					}
				}
				
				if (this.timer2Counter) {
					this.timer2Counter--;
				} else {
					this.timer2Counter = this.timer2Period;
					
					if (this.sequencer2Position) {
						this.sequencer2Position--;
					} else {
						this.sequencer2Position = 7;
					}
				}
				
				if (this.timer4Counter) {
					this.timer4Counter--;
				} else {
					this.timer4Counter = this.timer4Period;
					
					this.shiftRegister = (this.shiftRegister >> 1) | (((this.shiftRegister & 1) ^ ((this.shiftRegister >> this.shiftBit) & 1)) << 14);
				}
			}

			this.APU_LengthCounter_HaltPulse1 = ((this.APU_Register[0] & 0x20) !== 0);
			this.APU_LengthCounter_HaltPulse2 = ((this.APU_Register[4] & 0x20) !== 0);
			this.APU_LengthCounter_HaltTriangle = ((this.APU_Register[8] & 0x80) !== 0);
			this.APU_LengthCounter_HaltNoise = ((this.APU_Register[0xC] & 0x20) !== 0);



	} // and that's it for the APU cycle

	// PPU varaibles

	PPUBus = 0; // The databus of the Picture Processing Unit
	PPUBusDecay = new Int32Array(8);
	PPUBusDecayConstant = 1786830; // 20 frames. Approximately how long it takes for the PPU bus to decay on my console.
	PPUOAMAddress = 0; // The address unsed to index into Object Attribute Memory
	PPUStatus_VBlank = false; // This is set during Vblank, and cleared at the end, or if $2002 is read. This value can be read in address $2002
	PPUStatus_VBlank_Delayed = false; // when writing to $2000 to potentially start an NMI, there's a 1 ppu cycle delay on this flag
	PPUStatus_SpriteZeroHit = false; // If a sprite zero hit occurs, this is set. This value can be read in address $2002
	PPUStatus_SpriteOverflow = false; // If a scanline had more than 8 objects in range, this is set. This value can be read in address $2002

	PPU_Spritex16 = false; // Are sprites using 8x8 mode, or 8x16 mode? Set by writing to $2000

	PPU_Scanline = 0; // Which scanline is the PPU currently on
	PPU_Dot = 0; // Which dot of the scanline is the PPU currently on
	NMIDelay = 0; // When a NMI is about to occur, there's a small delay depending on the alignment with the CPU clock.

	PPU_VRegisterChangedOutOfVBlank = false;    // when changing the v register (Read write address) out of vblank, palettes can become corrupted
	PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;  // When rendering is disabled on specific dots of visible scanlines, OAM data can become corrupted
	PPU_PendingOAMCorruption = false;// The corruption doesn't take place until rendering is re-enabled.
	PPU_OAMCorruptionIndex = 0;  // The object that gets corrupted depends on when the data was corrupted
	// OAM corruption during OAM evaluation happens with the instant write to $2001 using the databus value. Other parts of sprite evaluation apparently do not.
	PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;  // When rendering is disabled on specific dots of visible scanlines, OAM data can become corrupted
	PPU_OAMCorruptionRenderingEnabledOutOfVBlank = false; // If enabling rendering outside vblank, there are alignment specific effects.
	PPU_OAMEvaluationCorruptionOddCycle = false; // If rendering is disabled during OAM evaluation, it matters if it was on an odd or even cycle.
	PPU_OAMEvaluationObjectInRange = false; // If rendering is disabled during OAM evaluation, it matters if the most recent object evaluated was in vertical range of this scanline.
	PPU_OAMEvaluationObjectInXRange = false; // If rendering is disabled during OAM evaluation, it matters if the most recent object evaluated was in vertical range of this scanline.

	PPU_PaletteCorruptionRenderingDisabledOutOfVBlank = false;  // When rendering is disabled on specific dots of visible scanlines, OAM data can become corrupted


	PPU_AttributeShiftRegisterL = 0; // 16 bit shift register for the background tile attributes low bit plane.
	PPU_AttributeShiftRegisterH = 0; // 16 bit shift register for the background tile attributes high bit plane.
	PPU_PatternShiftRegisterL = 0; // 16 bit shift register for the background tile pattern low bit plane.
	PPU_PatternShiftRegisterH = 0; // 16 bit shift register for the background tile pattern high bit plane.
	//TempPPUAddr
	PPU_FineXScroll = 0; // Set when writing to address $2005. 3 bits. This is up to a 7 pixel offset when rendering the screen.

	PPU_SpriteShiftRegisterL = new Uint8Array(8); // 8 bit shift register for a sprite's low bit plane. Secondary OAM can have up to 8 object in it.
	PPU_SpriteShiftRegisterH = new Uint8Array(8); // 8 bit shift register for a sprite's high bit plane. Secondary OAM can have up to 8 object in it.

	PPU_SpriteAttribute = new Uint8Array(8); // Secondary OAM attribute values. Secondary OAM can ahve up to 8 objects in it.
	PPU_SpritePattern = new Uint8Array(8); // Secondary OAM pattern values. Secondary OAM can have up to 8 objects in it.
	PPU_SpriteXposition = new Uint8Array(8); // Secondary OAM x positions. Secondary OAM can have up to 8 objects in it.
	PPU_SpriteYposition = new Uint8Array(8); // Secondary OAM y positions. Secondary OAM can have up to 8 objects in it.

	PPU_SpriteShifterCounter = new Uint8Array(8); // This counter tracks how long until the objects are drawn.


	PPU_NextScanlineContainsSpriteZero = false;    // If this upcoming scanline contains sprite zero
	PPU_CurrentScanlineContainsSpriteZero = false; // if the sprite evaluation for this current scanline contained sprite zero. Used for Sprite Zero Hit detection.

	PPU_SpritePatternL = 0; // Temporary value used in sprite evaluation.
	PPU_SpritePatternH = 0; // Temporary value used in sprite evaluation.

	PPU_Ctrl = 0; // Used exclusively in debugging. If "observing" address $2000, this holds a copy of the value written there.

	PPU_Mask = 0; // Used exclusively in debugging. If "observing" address $2001, this holds a copy of the value written there.
	PPU_Mask_Greyscale = false;         // Set by writing to $2001. If set, only use color 00, 10, 20, or 30 when drawing a pixel.
	PPU_Mask_8PxShowBackground = false; // Set by writing to $2001. If set, the background will be visible in the 8 left-most pixels of the screen.
	PPU_Mask_8PxShowSprites = false;    // Set by writing to $2001. If set, the sprites will be visible in the 8 left-most pixels of the screen.
	PPU_Mask_ShowBackground = false;    // Set by writing to $2001. If set, the background will be visible. Anything that requires rendering to be enabled will run, even if it doesn't involve the background.
	PPU_Mask_ShowSprites = false;       // Set by writing to $2001. If set, the sprites will be visible.  Anything that requires rendering to be enabled will run, even if it doesn't involve sprites.
	PPU_Mask_EmphasizeRed = false;      // Set by writing to $2001. Adjusts the colors on screen to be a bit more red.
	PPU_Mask_EmphasizeGreen = false;    // Set by writing to $2001. Adjusts the colors on screen to be a bit more green.
	PPU_Mask_EmphasizeBlue = false;     // Set by writing to $2001. Adjusts the colors on screen to be a bit more blue.

	PPU_Mask_ShowBackground_Delayed = false; // Sprite evaluation has a 1 ppu cycle delay on checking if rendering is enabled.
	PPU_Mask_ShowSprites_Delayed = false; // Sprite evaluation has a 1 ppu cycle delay on checking if rendering is enabled.
	PPU_Mask_ShowBackground_Instant = false; // OAM evaluation will stop immediately if writing to $2001
	PPU_Mask_ShowSprites_Instant = false; // OAM evaluation will stop immediately if writing to $2001

	PPU_LowBitPlane = 0; // Temporary value used in background shift register preperation.
	PPU_HighBitPlane = 0;// Temporary value used in background shift register preperation.
	PPU_Attribute = 0; // Temporary value used in background shift register preperation.
	PPU_NextCharacter = 0; // Temporary value used in background shift register preperation.

	PPU_CanDetectSpriteZeroHit = false; // Only 1 sprite zero hit is allowed per frame. This gets set if a sprite zero hit occurs, and cleared at the end of vblank.

	PPU_ADDR_Prev = 0; // The MMC3 chip's IRQ counter is changed whenever bit 12 of the PPU Address is changing from a 0 to a 1. This is recorded at the start of a PPU cycle, and checked at the end.

	PPU_OddFrame = false; // Every other frame is 1 ppu cycle shorter.

	DotColor = 0; // The pixel output is delayed by 2 dots.
	PrevDotColor = 0; // This is the value from last cycle.
	PrevPrevDotColor = 0; // And this is from 2 cycles ago.
	PrevPrevPrevDotColor = 0; // And this is from 2 cycles ago.
	PrevPrevPrevPrevDotColor = 0; // This is used with NTSC signal decoding.
	PaletteRAMAddress = 0;

	NMI_PinsSignal = false; // I'm using this to detect the rising edge of $2000.7 and $2002.7
	NMI_PreviousPinsSignal = false; // I'm using this to detect the rising edge of $2000.7 and $2002.7
	IRQ_LevelDetector = false; // If set, it's time to run an IRQ whenever this is detected
	NMILine = false; // Set to true if $2000.7 and $2002.7 are both set. This is cehcked during the second half od a CPU cycle.
	IRQLine = false; // Set during phi2 to true if the IRQ level detector is low.

	CopyV = false; // set by writes to $2006. If it occurs on the same dot the scroll values are naturally incremented, some bugs occur.
	SkippedPreRenderDot341 = false;

	_EmulatePPU()
	{

			// When writing to ppu registers, there's a slight delay before resulting action is taken.
			// This delay can vary depending on the CPU/this.PPU alignment.

			// For instance, after writing to $2006, this delay value will either be 4 or 5.
			this.CopyV = false;
			if (this.PPU_Update2006Delay > 0)
			{
					this.PPU_Update2006Delay--; // this counts down,
					if (this.PPU_Update2006Delay === 0) // and when it reaches zero
					{
							let temp_Prev_V = this.PPU_ReadWriteAddress;
							this.CopyV = true;
							this.PPU_ReadWriteAddress = this.PPU_TempVRAMAddress; // the this.PPU_ReadWriteAddress is updated!
							this.PPU_AddressBus = this.PPU_ReadWriteAddress; // This value is the same thing.
							if ((temp_Prev_V & 0x3FFF) >= 0x3F00 && (this.PPU_AddressBus & 0x3FFF) < 0x3F00) // Palette corruption check. Are we leaving Palette ram?
							{
									if ((this.PPU_Scanline < 240) && this.PPU_Dot <= 256) // if this dot is visible
									{
											if ((temp_Prev_V & 0xF) !== 0)  // also, Palette corruption only happens if the previous address did not end in a 0
											{
													this.PPU_VRegisterChangedOutOfVBlank = true;
											}
									}
							}
					}
			}
			// after writing to $2005, there is either a 1 or 2 cycle delay.
			if (this.PPU_Update2005Delay > 0)
			{
					this.PPU_Update2005Delay--;
					if (this.PPU_Update2005Delay === 0)
					{
							if (!this.PPUAddrLatch)
							{
									// if this is the first write to $2005
									this.PPU_FineXScroll = (this.PPU_Update2005Value & 7); // This updates the fine this.X scroll
									this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b0111111111100000) | (this.PPU_Update2005Value >> 3)); // as well as changing the 't' register.
							}
							else
							{
									// if this is the second write to $2005
									this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b0000110000011111) | (((this.PPU_Update2005Value & 0xF8) << 2) | ((this.PPU_Update2005Value & 7) << 12))); // this also writes to 't'
							}
							this.PPUAddrLatch = !this.PPUAddrLatch; // flip the latch
					}
			}
			// after writing to $2000, there's either a 1 or 2 cycle delay
			if (this.PPU_Update2000Delay > 0)
			{
					this.PPU_Update2000Delay--;
					if (this.PPU_Update2000Delay === 0)
					{
							this.PPU_Ctrl = this.PPU_Update2000Value; // this value is only used for debugging.
							this.PPUControl_NMIEnabled = (this.PPU_Update2000Value & 0x80) !== 0;
							this.PPUControlIncrementMode32 = (this.PPU_Update2000Value & 0x4) !== 0;
							this.PPU_Spritex16 = (this.PPU_Update2000Value & 0x20) !== 0;
							this.PPU_PatternSelect_Sprites = (this.PPU_Update2000Value & 0x8) !== 0;
							this.PPU_PatternSelect_Background = (this.PPU_Update2000Value & 0x10) !== 0;
							this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b0111001111111111) | ((this.PPU_Update2000Value & 0x3) << 10)); // change which nametable to render.


					}
			}

			if (this.PPU_Data_StateMachine < 9)
			{
					// This info was not determined by using visualNES or visual2c02, and is entirely "speculation" based on behavior I was able to detect on my console through read-modify-write instructions to address $2007.

					// reading/writing to address $2007 will set the state machine value to 0. Increment it every this.PPU Cycle
					// There's a handful of unexpected behavior if this state machine is currently happening when another read/write to $2007 occurs
					// in other words, if 2 consecutive CPU cycles access $2007 there's unexpected behavior.
					// that behavior is handled here.

					// NOTE: This behavior matches my console, though different revisions have shown different behaviors.

					// TODO: Something is going wrong with the timing of STA $2007, this.X (where this.X = 0). Gotta figure that out, and probably re-do this entire function. I have no idea how inaccurate this is. 

					if (this.PPU_Data_StateMachine === 1) // 1 ppu cycle after the read occurs
					{
							if (this.PPU_Data_SateMachine_Read && !this.PPU_Data_StateMachine_UpdateVRAMBufferLate) // if this is a read, and this.PPU_Data_StateMachine_UpdateVRAMBufferLate is not set: (I think this is just for alignments 2 and 3?)
							{
									if (this.PPU_ReadWriteAddress >= 0x3F00) // If the read/write address is where the Palette info is...
									{
											this.PPU_AddressBus = this.PPU_ReadWriteAddress;
											this.PPU_VRAMAddressBuffer = this.FetchPPU((this.PPU_AddressBus & 0x2FFF)); // The buffer cannot read from the palettes.
									}
									else
									{
											this.PPU_AddressBus = this.PPU_ReadWriteAddress;
											this.PPU_VRAMAddressBuffer = this.FetchPPU((this.PPU_AddressBus & 0x3FFF));
									}
							}
					}
					if (this.PPU_Data_StateMachine === 3)
					{
							// This is only relevant when the state machine is not interrupted.
							if (this.PPU_Data_StateMachine_NormalWriteBehavior)
							{
									this.PPU_Data_StateMachine_NormalWriteBehavior = false;
									if (!this.PPU_Data_SateMachine_Read || !this.PPU_Data_SateMachine_Read_Delayed)
									{
											this.PPU_AddressBus = this.PPU_ReadWriteAddress;
											this.StorePPUData(this.PPU_AddressBus, this.PPU_Data_StateMachine_InputValue);
									}
							}
							// if the state machine *is* interrupted, this runs
							else
							if (!this.PPU_Data_SateMachine_Read && this.PPU_Data_StateMachine_PerformMysteryWrite)
							{
									// the mystery write

									// Here's how the mystery write behaves:
									// Suppose we're writing a value of $ZZ to address $2007, and the this.PPU Read/Write address is at address $YYXX
									// The mystery write will store $ZZ at address $YYZZ
									// In addition to that, $XX (The low byte of the read/write address) is also written to $YYXX

									// This only occurs if there's 2 consecutive CPU cycles that access $2007

									// The mystery writes cannot write to palettes. Instead, write the modified value read from palette this.RAM to the following address.
									if (this.PPU_VRAM_MysteryAddress >= 0x3F00)
									{
											
											this.StorePPUData((this.PPU_ReadWriteAddress), this.PPU_VRAM_MysteryAddress & 0xFF);
											this.PPU_AddressBus = this.PPU_ReadWriteAddress;
											
									}
									else
									{
											// As far as I know, the this.PPU can only make 1 write per cycle... The exact timing here might be wrong, but the end result of the behavior emulated here seems to match my console.
											this.StorePPUData((this.PPU_VRAM_MysteryAddress), this.PPU_VRAM_MysteryAddress & 0xFF);
											this.StorePPUData((this.PPU_ReadWriteAddress), this.PPU_ReadWriteAddress & 0xFF);
											this.PPU_AddressBus = this.PPU_ReadWriteAddress;
									}

									// That second write can be overwritten in the next steps depending on the CPU/this.PPU alignment.
									// My current understanding is: if the mystery write happens, that other extra write happens too.
									// but again, I'm not certain on the timing. Do these actually both happen on the same cycle?
							}
							// the this.PPU Read/Write address is incremented 1 cycle after the write occurs.
					}
					if (this.PPU_Data_StateMachine === 4) // 4 ppu cycles after a read or  1 ppu cycle after a write occurs
					{
							// This is alignment-specific behavior due to a Read-Modify-Write instruction on address $2007
							if (this.PPU_Data_SateMachine_Read && this.PPU_Data_StateMachine_UpdateVRAMBufferLate)
							{
									if (this.PPU_ReadWriteAddress >= 0x3F00) // If the read/write address is where the Palette info is...
									{
											this.PPU_AddressBus = this.PPU_ReadWriteAddress;
											this.PPU_VRAMAddressBuffer = this.FetchPPU((this.PPU_AddressBus & 0x2FFF));// The buffer cannot read from the palettes.
									}
									else
									{
											this.PPU_AddressBus = this.PPU_ReadWriteAddress;
											this.PPU_VRAMAddressBuffer = this.FetchPPU((this.PPU_AddressBus & 0x3FFF));
									}
							}
							// We're getting deep into alignment specific state machine shenanigans.
							// If the state machine was interrupted with a read cycle, and the CPU/this.PPU is not in alignment 0:
							if (this.PPU_Data_StateMachine_UpdateVRAMAddressEarly)
							{
									this.PPU_Data_StateMachine_UpdateVRAMAddressEarly = false;
									// The VRAM address is updated earlier than expected.
									this.PPU_ReadWriteAddress += this.PPUControlIncrementMode32 ? 32 : 1; // add either 1 or 32 depending on PPU_CRTL
									this.PPU_ReadWriteAddress &= 0x3FFF; // and truncate to just 15 bits
									this.PPU_AddressBus = this.PPU_ReadWriteAddress;
									// Read from the new VRAM address
									if (this.PPU_Data_SateMachine_Read)
									{
											if (this.PPU_ReadWriteAddress >= 0x3F00) // If the read/write address is where the Palette info is...
											{
													this.PPU_VRAMAddressBuffer = this.FetchPPU((this.PPU_AddressBus & 0x2FFF)); // The buffer cannot read from the palettes.
											}
											else
											{
													this.PPU_VRAMAddressBuffer = this.FetchPPU((this.PPU_AddressBus & 0x3FFF));
											}
									}
									// And then the VRAM address is updated again!
							}

							// This part here happens regardless of state machine shenanigans. This is just the state machine working as intended.
							this.PPU_ReadWriteAddress += this.PPUControlIncrementMode32 ? 32 : 1; // add either 1 or 32 depending on PPU_CRTL
							this.PPU_ReadWriteAddress &= 0x3FFF;                                             // and truncate to just 15 bits
							this.PPU_AddressBus = this.PPU_ReadWriteAddress;

							// The mystery write strikes back! (Keep in mind, this is only used during state machine shenanigans. Normal writes to $2007 happen on cycle 3 of the state machine.
							// (at least that's how I'm emulating it? More research is needed for the actual cycle-by-cycle breakdown of this state machine.)
							if (!this.PPU_Data_SateMachine_Read || !this.PPU_Data_SateMachine_Read_Delayed)
							{
									if (this.PPU_Data_StateMachine_PerformMysteryWrite)
									{
											if ((this.CPUClock & 3) !== 0) // This write only occurs on phases 1, 2, and 3
											{
													// this.Store the expected value at the *recently modified* Read/Write address.
													this.StorePPUData(this.PPU_AddressBus, this.PPU_Data_StateMachine_InputValue);
											}
									}
							}
							this.PPU_Data_SateMachine_Read = this.PPU_Data_SateMachine_Read_Delayed;
							this.PPU_Data_StateMachine_PerformMysteryWrite = false;
					}
					// And that's it for the this.PPU $2007 State Machine.
					this.PPU_Data_StateMachine++;    // this stops counting up at 8.
			}
			if (this.PPU_Data_StateMachine === 8)
			{
					if (this.PPU_Data_StateMachine_InterruptedReadToWrite)
					{
							if ((this.CPUClock & 3) !== 0) // This write only occurs on phases 1, 2, and 3
							{
									this.StorePPUData(this.PPU_AddressBus, this.PPU_Data_StateMachine_InputValue);
							}
							this.PPU_Data_StateMachine_InterruptedReadToWrite = false;
							this.PPU_ReadWriteAddress += this.PPUControlIncrementMode32 ? 32 : 1; // add either 1 or 32 depending on PPU_CRTL
							this.PPU_ReadWriteAddress &= 0x3FFF; // and truncate to just 15 bits
							this.PPU_AddressBus = this.PPU_ReadWriteAddress;
							

					}
			}

			// Updating the scroll registers during screen rendering
			if ((this.PPU_Scanline < 240 || this.PPU_Scanline === 261))// if this is the pre-render line, or any line before vblank
			{
					if ((this.PPU_Mask_ShowBackground || this.PPU_Mask_ShowSprites))
					{
							if (this.PPU_Dot === 256) //The this.Y scroll is incremented on dot 256.
							{
									this.PPU_IncrementScrollY();
							}
							else if (this.PPU_Dot === 257) //The this.X scroll is reset on dot 257.
							{
									this.PPU_ResetXScroll();
							}
							if (this.PPU_Dot >= 280 && this.PPU_Dot <= 304 && this.PPU_Scanline === 261) //numbers from the nesdev wiki
							{
									this.PPU_ResetYScroll(); //The this.Y scroll is reset on every dot from 280 through 304 on the pre-render scanline.
							}
					}
			}

			// Increment the this.PPU dot
			this.PPU_Dot++;
			if (this.PPU_Dot > 340) // There are only 341 dots per scanline
			{
					this.PPU_Dot = 0;  // reset the dot back to 0
					this.PPU_Scanline++;     // and increment the scanline
					// Sprite zero hits rely on the previous scanline's sprite evaluation.

					if (this.PPU_Scanline > 261) // There are 262 scanlines in a frame.
					{
							this.PPU_Scanline = 0;   // reset to scanline 0.
					}
			}

			if (this.PPU_Scanline === 241) // If this is the first scanline of VBLank
			{
					if (this.PPU_Dot === 0)
					{
							// If Address $2002 is read during the next ppu cycle, the this.PPU Status flags aren't set.
							// These variables are used to check if Address $2002 is read during the next ppu cycle.
							// I usually refer to this as the $2002 race condition.
							// The more proper term would be "Vblank/NMI flag supression".

							// oh- and also if we're running a fm2 TAS file, due to FCEUX's incorrect timing of the first frame, I need to prevent this from being set just a few cycles after power on.
							if (!this.SyncFM2)
							{
									this.PPU_PendingVBlank = true;
									this.PPU_PendingNMI = true;
							}
							else
							{
									this.SyncFM2 = false;
							}
					}
					if (this.PPU_Dot === 1)
					{
							if (this.PPU_PendingVBlank) // If a read to $2002 did not happen this cycle. (Reading $2002 sets this.PPU_PendingVBlank to false)
							{
									// Huzzah! The this.status flags are set.
									this.PPUStatus_VBlank = true;
									this.PPUStatus_VBlank_Delayed = true; // There are a few extra ppu cycles after this.PPUStatus_VBlank is cleared in which writing to $2000 during Vblank in order to trigger an NMI can still occur.
									this.PPU_PendingVBlank = false; // clear this flag
																						 // if this.PPUControl_NMIEnabled is set to true, then the NMI edge detector will detect this at the end of the CPU cycle!
									this.PPU_RESET = false;
							}
							// else, address $2002 was read on this ppu cycle. no VBlank flag.

							this.FrameAdvance_ReachedVBlank = true; // Emulator specific stuff. Used for frame advancing to detect the frame has ended, and nothing else.
							if (!this.ClockFiltering) // specifically for TASing stuff. Increment the index for the input log.
							{
									// If this was using "SubFrame", this.TAS_InputSequenceIndex is incremented evnever the controller is strobed.
									// Instead, I increment the index here at the start of vblank.
									this.TAS_InputSequenceIndex++;
							}


					}

			}
			else if (this.PPU_Scanline === 260 && this.PPU_Dot === 340)
			{
					this.PPU_OddFrame = !this.PPU_OddFrame; // I guess this could happen on pretty much any cycle?
			}
			else if (this.PPU_Scanline === 261 && this.PPU_Dot === 0)
			{
					this.PPUStatus_SpriteZeroHit = false;
					// this contradicts the information on the nesdev wiki, but I think I'm going to go mad if this really is cleared on dot 1.
			}
			else if (this.PPU_Scanline === 261 && this.PPU_Dot === 1)
			{
					// On the dot 1 of the pre-render scanline, all of these flags are cleared.
					this.PPUStatus_VBlank = false;
					this.PPUStatus_SpriteOverflow = false;
					this.PPU_CanDetectSpriteZeroHit = true;
			}
			else if (this.PPU_Scanline === 261 && this.PPU_Dot === 10)
			{
					// And then a few cycles later, the CPU notices that this flag was cleared.
					this.PPUStatus_VBlank_Delayed = false;
			}

			// Right now, I'm only emulating MMC3's IRQ counter in this function.
			this.PPU_MapperSpecificFunctions();
			this.PPU_ADDR_Prev = this.PPU_AddressBus; // Record the value of the ppu address bus. This is used in the this.PPU_MapperSpecificFunctions(), so if this changes between here and next ppu cycle, we'll know.
			if (this.PPU_OddFrame && (this.PPU_Mask_ShowBackground || this.PPU_Mask_ShowSprites))
			{
					if (this.PPU_Scanline === 261 && this.PPU_Dot === 340)
					{
							// On every other frame, dot 0 of scanline 0 is skipped.
							// this cycle is technically (0,0), but this still makes the Nametable fetch during the last cycle of the pre-render line
							this.PPU_Scanline = 0;
							this.PPU_Dot = 0;
							this.SkippedPreRenderDot341 = true;
					}
			}
			if(this.PPU_OddFrame && this.PPU_Scanline === 0 && this.PPU_Dot === 2)
			{
					this.SkippedPreRenderDot341 = false; // This varialbe is used for some esoteric business on dot 1 of scanline 0.
			}
			// Okay, now that we're updated all those flags, let's render stuff to the screen!

			// let's establish the order of operations.
			// Sprite evaluation
			// then calcualte the color for the next dot.

			//but to complicate things, the delay after writing to $2001 happens between those 2 steps, and also on a specific alignment, this delay is 1 cycle longer for sprite evaluation.

			// If this is NOT phase 1
			if ((this.MasterClock & 3) !== 2)
			{
					// sprite evaluation has a 1 ppu cycle delay before recognizing these flags were set or cleared.
					this.PPU_Mask_ShowBackground_Delayed = this.PPU_Mask_ShowBackground;
					this.PPU_Mask_ShowSprites_Delayed = this.PPU_Mask_ShowSprites;
			}
			if ((this.PPU_Scanline < 240 || this.PPU_Scanline === 261))// if this is the pre-render line, or any line before vblank
			{
					// Sprite evaluation
					if (this.PPU_Scanline < 241 || this.PPU_Scanline === 261)
					{
							this.PPU_Render_SpriteEvaluation(); // fill in secondary this.OAM, and set up various arrays of sprite properties.
					}
			}
			if ((this.MasterClock & 3) === 2)
			{
					// on phase 1,
					// sprite evaluation has a 2 ppu cycle delay before recognizing these flags were set or cleared.
					this.PPU_Mask_ShowBackground_Delayed = this.PPU_Mask_ShowBackground;
					this.PPU_Mask_ShowSprites_Delayed = this.PPU_Mask_ShowSprites;
			}
			// after sprite evaluation, but before screen rendering...
			if (this.PPU_Update2001Delay > 0) // if we wrote to 2001 recently
			{
					this.PPU_Update2001Delay--;
					if (this.PPU_Update2001Delay === 0) // if we've waited enough cycles, apply the changes
					{
							this.PPU_Mask = this.PPU_Update2001Value; // this value is only used for debugging.
							this.PPU_Mask_8PxShowBackground = (this.PPU_Update2001Value & 0x02) !== 0;
							this.PPU_Mask_8PxShowSprites = (this.PPU_Update2001Value & 0x04) !== 0;
							this.PPU_Mask_ShowBackground = (this.PPU_Update2001Value & 0x08) !== 0;
							this.PPU_Mask_ShowSprites = (this.PPU_Update2001Value & 0x10) !== 0;

							this.PPU_Mask_ShowBackground_Instant = this.PPU_Mask_ShowBackground; // now that the this.PPU has updated, this.OAM evaluation will also recognize the change
							this.PPU_Mask_ShowSprites_Instant = this.PPU_Mask_ShowSprites;
					}
			}
			if (this.PPU_Update2001OAMCorruptionDelay > 0) // if we wrote to 2001 recently
			{
					this.PPU_Update2001OAMCorruptionDelay--;
					if (this.PPU_Update2001OAMCorruptionDelay === 0) // if we've waited enough cycles, apply the changes
					{
							if (this.PPU_WasRenderingBefore2001Write && (this.PPU_Update2001Value & 0x08) === 0 && (this.PPU_Update2001Value & 0x10) === 0)
							{
									if ((this.PPU_Scanline < 240 || this.PPU_Scanline === 261)) // if this is the pre-render line, or any line before vblank
									{
											if (!this.PPU_PendingOAMCorruption) // due to this.OAM corruption occuring inside this.OAM evaluation before this even occurs, make sure this.OAM isn't already corrupt
											{
													this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = true;
											}
									}
							}
					}
			}
			if (this.PPU_Update2001EmphasisBitsDelay > 0)
			{
					this.PPU_Update2001EmphasisBitsDelay--;
					if(this.PPU_Update2001EmphasisBitsDelay === 0)
					{
							this.PPU_Mask_Greyscale = (this.PPU_Update2001Value & 0x01) !== 0;
							this.PPU_Mask_EmphasizeRed = (this.PPU_Update2001Value & 0x20) !== 0;
							this.PPU_Mask_EmphasizeGreen = (this.PPU_Update2001Value & 0x40) !== 0;
							this.PPU_Mask_EmphasizeBlue = (this.PPU_Update2001Value & 0x80) !== 0;
					}
			}

			if ((this.PPU_Scanline < 240 || this.PPU_Scanline === 261))// if this is the pre-render line, or any line before vblank
			{
					this.PrevPrevPrevDotColor = this.PrevPrevDotColor; // Drawing a color to the screen has a 3(?) ppu cycle delay between deciding the color, and drawing it.
					this.PrevPrevDotColor = this.PrevDotColor;
					this.PrevDotColor = this.DotColor; // These varaibles here just record the color, and swap them through these varaibles so it can be used 3 cycles after it was chosen.

					if ((this.PPU_Dot > 0 && this.PPU_Dot <= 257) || (this.PPU_Dot > 320 && this.PPU_Dot <= 336)) // if this is a visible pixel, or preparing the start of next scanline
					{
							if ((this.PPU_Mask_ShowBackground || this.PPU_Mask_ShowSprites)) // if rendering background or sprites
							{
									this.PPU_UpdateShiftRegisters(); // shift all the shift registers 1 bit
																							// the shift registers are used in the CalculatePixel() function.
																							// a single bit from the register is read at a time.
									this.PPU_Render_ShiftRegistersAndBitPlanes(); // update shift registers for the background.
							}

							if (this.PPU_Scanline < 241)
							{
									this.PPU_Render_CalculatePixel(); // this determines the color of the pixel being drawn.
							}

							
							this.UpdateSpriteShiftRegisters(); // update shift registers for the sprites.
							
					}
					this.DrawToScreen();


					if (this.PPU_DecodeSignal && (this.PPU_Dot === 0) && this.PPU_Scanline < 241)
					{
							this.ntsc_signal_of_dot_0 = this.ntsc_signal;
							this.chosenColor = this.PaletteRAM[0x00] & 0x3F;
							if (this.PPU_Mask_Greyscale) // if the ppu greyscale mode is active,
							{
									this.chosenColor &= 0x30; //To force greyscale, bitiwse AND this color with 0x30
							}
							// emphasis bits
							let emphasis = 0;
							if (this.PPU_Mask_EmphasizeRed) { emphasis |= 0x40; } // if emhpasizing r, add 0x40 to the index into the palette LUT.
							if (this.PPU_Mask_EmphasizeGreen) { emphasis |= 0x80; } // if emhpasizing g, add 0x80 to the index into the palette LUT.
							if (this.PPU_Mask_EmphasizeBlue) { emphasis |= 0x100; } // if emhpasizing b, add 0x100 to the index into the palette LUT.
							this.PrevPrevPrevPrevDotColor = this.chosenColor | emphasis; // set up samples for dot 1
							this.PPU_SignalDecode(this.chosenColor | emphasis);
					}
					if (this.PPU_DecodeSignal && (this.PPU_Dot === 260) && this.PPU_Scanline < 241)
					{
							this.PPU_SignalDecode(this.PrevPrevPrevPrevDotColor);
					}
					else if (this.PPU_DecodeSignal && (this.PPU_Dot === 261) && this.PPU_Scanline < 241)
					{
							this.RenderNTSCScanline();
					}
			}

			if (this.PPU_DecodeSignal)
			{
					this.ntsc_signal+=8;
					this.ntsc_signal %= 12;
			}
	} // and that's all for the PPU cycle!

	DrawToScreen()
	{
			if (this.PPU_Dot > 3 && this.PPU_Dot <= 259 && this.PPU_Scanline < 241) // the process of drawing a dot to the screen actually has a 2 ppu cycle delay, which the emphasis bits happen after
			{
					// in other words, the geryscale/emphasis bits can affect the color that was decided 2 ppu cycles ago.
					this.chosenColor = this.PrevPrevPrevDotColor;
					if (this.PPU_Mask_Greyscale) // if the ppu greyscale mode is active,
					{
							this.chosenColor &= 0x30; //To force greyscale, bitiwse AND this color with 0x30
					}
					// emphasis bits
					let emphasis = 0;
					if (this.PPU_Mask_EmphasizeRed) { emphasis |= 0x40; } // if emhpasizing r, add 0x40 to the index into the palette LUT.
					if (this.PPU_Mask_EmphasizeGreen) { emphasis |= 0x80; } // if emhpasizing g, add 0x80 to the index into the palette LUT.
					if (this.PPU_Mask_EmphasizeBlue) { emphasis |= 0x100; } // if emhpasizing b, add 0x100 to the index into the palette LUT.
					let scanline0OddFrameOffset = 0;
					if (this.PPU_Scanline === 0 && this.PPU_OddFrame)
					{
							scanline0OddFrameOffset = 1;
					}
					if (!this.PPU_DecodeSignal)
					{
							if (!this.PPU_ShowScreenBoarders)
							{
									if (scanline0OddFrameOffset === 1 && this.PPU_Dot === 4)
									{
											// do nothing. This would be off screen.
									}
									else
									{
										
											let i = (this.PPU_Scanline * 256 + (this.PPU_Dot - 4 - scanline0OddFrameOffset)) * 4;
											let c = (this.chosenColor | emphasis) * 3;
											this.Screen[i + 0] = Emulator.NESPal[c + 0];
											this.Screen[i + 1] = Emulator.NESPal[c + 1];
											this.Screen[i + 2] = Emulator.NESPal[c + 2];
											this.Screen[i + 3] = 255; // this sets the pixel on screen to the chosen color.
									}
							}
							else
							{
									let i = (this.PPU_Scanline * 256 + (this.PPU_Dot - 4 - scanline0OddFrameOffset)) * 4;
									let c = (this.chosenColor | emphasis) * 3;
									this.Screen[i + 0] = Emulator.NESPal[c + 0];
									this.Screen[i + 1] = Emulator.NESPal[c + 1];
									this.Screen[i + 2] = Emulator.NESPal[c + 2];
									this.Screen[i + 3] = 255; // this sets the pixel on screen to the chosen color.
							}
					}
					else
					{
							if (this.PPU_Mask_Greyscale) // if the ppu greyscale mode is active,
							{
									this.chosenColor &= 0x30; //To force greyscale, bitiwse AND this color with 0x30
							}
							this.PPU_SignalDecode(this.chosenColor | emphasis);
							this.PrevPrevPrevPrevDotColor = this.chosenColor | emphasis;
					}
			}
			if (this.PPU_Scanline === 0 && this.PPU_OddFrame && this.PPU_Dot === 259)
			{
					// draw the backdrop.
					this.chosenColor = this.PaletteRAM[0];
					// emphasis bits
					let emphasis = 0;
					if (this.PPU_Mask_EmphasizeRed) { emphasis |= 0x40; } // if emhpasizing r, add 0x40 to the index into the palette LUT.
					if (this.PPU_Mask_EmphasizeGreen) { emphasis |= 0x80; } // if emhpasizing g, add 0x80 to the index into the palette LUT.
					if (this.PPU_Mask_EmphasizeBlue) { emphasis |= 0x100; } // if emhpasizing b, add 0x100 to the index into the palette LUT.
					if (!this.PPU_DecodeSignal)
					{
							let i = (this.PPU_Scanline * 256 + (255)) * 4;
							let c = (this.chosenColor | emphasis) * 3;
							this.Screen[i + 0] = Emulator.NESPal[c + 0];
							this.Screen[i + 1] = Emulator.NESPal[c + 1];
							this.Screen[i + 2] = Emulator.NESPal[c + 2];
							this.Screen[i + 3] = 255; // this sets the pixel on screen to the chosen color.
					}
					else
					{
							if (this.PPU_Mask_Greyscale) // if the ppu greyscale mode is active,
							{
									this.chosenColor &= 0x30; //To force greyscale, bitiwse AND this color with 0x30
							}
							this.PPU_SignalDecode(this.chosenColor | emphasis);
							this.PrevPrevPrevPrevDotColor = this.chosenColor | emphasis;
					}
			}
	}


	PPU_DecodeSignal = false;
	PPU_ShowScreenBoarders = false;
	static chroma_saturation_correction = 2.4;
	static Voltages =
			[ 0.228, 0.312, 0.552, 0.880, // Signal low
			0.616, 0.840, 1.100, 1.100, // Signal high
			0.192, 0.256, 0.448, 0.712, // Signal low, attenuated
			0.500, 0.676, 0.896, 0.896  // Signal high, attenuated
			];
	ntsc_signal = 0;
	ntsc_signal_of_dot_0 = 0;
	NTSC_Samples = new Float32Array(257*8 + 24);
	static Levels =
			[
			(this.Voltages[0] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[1] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[2] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[3] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[4] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[5] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[6] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[7] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[8] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[9] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[10] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[11] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[12] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[13] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[14] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12,
			(this.Voltages[15] - this.Voltages[1]) / (this.Voltages[6] - this.Voltages[1]) / 12
	];
	Saturation = 0.75;
	SignalBufferWidth = 12;
	static hue = 0;
	static SinTable =
			[
			Math.sin(Math.PI* (0 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (1 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (2 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (3 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (4 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (5 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (6 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (7 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (8 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (9 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (10 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.sin(Math.PI* (11 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction
			 ];
	static CosTable =
			[
			Math.cos(Math.PI* (0 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (1 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (2 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (3 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (4 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (5 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (6 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (7 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (8 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (9 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (10 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction,
			Math.cos(Math.PI* (11 + 3 - 0.5 + this.hue) / 6) * this.chroma_saturation_correction
			 ];
	InColorPhase(col, DecodePhase)
	{
			return (col + DecodePhase) % 12 < 6;
	}
	static ntsc_black = 0.312
	static ntsc_white = 1.100;
	PPU_SignalDecode(nesColor)
	{
			let phase = this.ntsc_signal;
			let i = 0;
			while (i < 8)
			{
					// Decode the NES color.
					let colInd = (nesColor & 0x0F);   // 0..15 "cccc"
					let level = (nesColor >> 4) & 3;  // 0..3  "ll"
					let emphasis = (nesColor >> 6);   // 0..7  "eee"
					if (colInd > 13) { level = 1; }   // For colors 14..15, level 1 is forced.
					let attenuation = (
											(((emphasis & 1) !== 0) && this.InColorPhase(0xC, phase)) ||
											(((emphasis & 2) !== 0) && this.InColorPhase(0x4, phase)) ||
											(((emphasis & 4) !== 0) && this.InColorPhase(0x8, phase)) && (colInd < 0xE)) ? 8 : 0;
					let low = Emulator.Levels[0 + level + attenuation];
					let high = Emulator.Levels[4 + level + attenuation];
					if (colInd === 0) { low = high; } // For color 0, only high level is emitted
					if (colInd > 12) { high = low; } // For colors 13..15, only low level is emitted
					let sample = this.InColorPhase(colInd, phase) ? high : low;
					if (this.PPU_Dot === 0)
					{
							this.NTSC_Samples[i] = sample;
					}
					else
					{
							this.NTSC_Samples[(this.PPU_Dot - 3) * 8 + i] = sample;
					}
					phase++;
					phase %= 12;
					i++;
			}
	}
	RenderNTSCScanline()
	{
			let phase = this.ntsc_signal_of_dot_0;

			let scanline0OddFrameOffset = 0;
			if (this.PPU_Scanline === 0 && this.PPU_OddFrame)
			{
					scanline0OddFrameOffset = 8;
			}

			let i = 0;
			while(i < 256*8 + scanline0OddFrameOffset)
			{
					let center = i+8;
					let begin = center - 6;
					let end = center + 6;
					let Y = 0;
					let U = 0;
					let V = 0;
					for (let p = begin; p < end; ++p) // Collect and accumulate samples
					{
							let sample = this.NTSC_Samples[p] / 12;
							Y += sample;
							U += sample * Emulator.SinTable[(phase+p) % 12];
							V += sample * Emulator.CosTable[(phase+p) % 12];
					}
					Y *= 12;
					U *= 12;
					V *= 12;
					U = U * 0.5 + 0.5;
					V = V * 0.5 + 0.5;
					// convert YUV to RGB
					let R = 1.164 * (Y - 16 / 256.0) + 1.596 * (V - 128 / 256.0);
					let G = 1.164 * (Y - 16 / 256.0) - 0.392 * (U - 128 / 256.0) - 0.813 * (V - 128 / 256.0);
					let B = 1.164 * (Y - 16 / 256.0) + 2.017 * (U - 128 / 256.0);
					if (R < 0) { R = 0; }
					if (R > 1) { R = 1; }
					if (G < 0) { G = 0; }
					if (G > 1) { G = 1; }
					if (B < 0) { B = 0; }
					if (B > 1) { B = 1; }

					if (scanline0OddFrameOffset === 0)
					{
							let idx = (this.PPU_Scanline * 256*8 + i) * 4;
							this.NTSCScreen[idx + 0] = R * 255;
							this.NTSCScreen[idx + 1] = G * 255;
							this.NTSCScreen[idx + 2] = B * 255;
							this.NTSCScreen[idx + 3] = 255;  // this sets the pixel on screen to the chosen color.
					}
					else
					{
							if (i >= 8)
							{
									let idx = (this.PPU_Scanline * 256*8 + i - 8) * 4;
									this.NTSCScreen[idx + 0] = R * 255;
									this.NTSCScreen[idx + 1] = G * 255;
									this.NTSCScreen[idx + 2] = B * 255;
									this.NTSCScreen[idx + 3] = 255;  // this sets the pixel on screen to the chosen color.
							}
					}
					i++;
			}
	}

	PPU_MapperSpecificFunctions()
	{
			if (this.Cart.MemoryMapper === 4)// MMC3 stuff.
			{
					// if bit 12 of the ppu address bus (A12) changes:
					if (((this.PPU_ADDR_Prev & 0b0001000000000000) === 0) && ((this.PPU_AddressBus & 0b0001000000000000) !== 0) && this.MMC3_M2Filter === 3)
					{
							if (this.Cart.Mapper_4_ReloadIRQCounter)
							{
									// If we're reloading the IRQ counter
									this.Cart.Mapper_4_IRQCounter = this.Cart.Mapper_4_IRQLatch; // The latch is the reset value.
									this.Cart.Mapper_4_ReloadIRQCounter = false;
									if (this.Cart.Mapper_4_IRQCounter === 0)  // if the latch is set to 0, you need to enable the IRQ.
									{
											if (this.Cart.Mapper_4_EnableIRQ) // if setting the value to zero, run an IRQ
											{
													this.IRQ_LevelDetector = true;
											}
									}
							}
							else
							{
									// decrement the counter
									this.Cart.Mapper_4_IRQCounter--;
									if (this.Cart.Mapper_4_IRQCounter === 0) // if decrementing the counter moved it to 0...
									{
											if (this.Cart.Mapper_4_EnableIRQ) // and the MMC3 IRQ is enabled...
											{
													this.IRQ_LevelDetector = true; // Run an IRQ!
											}
									}
									else if (this.Cart.Mapper_4_IRQCounter === 255) // if the counter underflows...
									{
											this.Cart.Mapper_4_IRQCounter = this.Cart.Mapper_4_IRQLatch; // reset the irq counter
											if (this.Cart.Mapper_4_IRQCounter === 0)  // if the latch is set to 0, you need to enable the IRQ... again
											{
													if (this.Cart.Mapper_4_EnableIRQ)
													{
															this.IRQ_LevelDetector = true;
													}
											}
									}

							}
					}
					if (this.ResetM2Filter)
					{
							this.ResetM2Filter = false;
							this.MMC3_M2Filter = 0;
					}
			}
	}

	// If OAM corruption is pending, it occurs on the first rendered dot.
	CorruptOAM()
	{
			// basically 8 entries of this.OAM are getting replaced (this is considered a single "row" of this.OAM) 
			// this.PPU_OAMCorruptionIndex is the row that gets corrupted.
			if(this.PPU_OAMCorruptionIndex === 0x20)
			{
					this.PPU_OAMCorruptionIndex = 0;
			}
			let i = 0;
			while (i < 8) // 8 entries in a row
			{
					this.OAM[this.PPU_OAMCorruptionIndex * 8 + i] = this.OAM[i]; // The corrupted row is replaced with the values from row 0
					i++;
			}
			this.SecondaryOAM[this.PPU_OAMCorruptionIndex] = this.SecondaryOAM[0]; // Also corrupt this byte.
			// this all happens in a single cycle.
	}







	OamCorruptedOnOddCycle = false;
	PPU_SpriteEvaluationTemp = 0; // is this just the ppubus?
	PPU_Render_SpriteEvaluation()
	{
			let SpriteEval_ReadOnly = false;
			if(this.PPU_Scanline === 261)
			{
					SpriteEval_ReadOnly = true;
			}
			if ((this.PPU_Mask_ShowBackground_Instant || this.PPU_Mask_ShowSprites_Instant))
			{
					if (this.PPU_PendingOAMCorruption) // this.OAM corruption occurs on the visible dot after rendering was enabled. It also can happen on the pre-render line.
					{
							this.PPU_PendingOAMCorruption = false;
							if (!this.PPU_OAMCorruptionRenderingEnabledOutOfVBlank)
							{
									this.CorruptOAM();
							}
							this.PPU_OAMCorruptionRenderingEnabledOutOfVBlank = false;
					}
			}

			if ((this.PPU_Dot >= 0 && this.PPU_Dot <= 64)) // Dots 1 through 64, not on the pre-render line. (and also dot 0 for this.OAM corruption purposes)
			{
					
					// this step is clearing secondary this.OAM, and writing FF to each byte in the array.
					if ((this.PPU_Dot & 1) === 1)
					{ //odd cycles
							if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed))
							{
									if (SpriteEval_ReadOnly)
									{
											this.PPU_SpriteEvaluationTemp = this.SecondaryOAM[this.SecondaryOAMAddress];
									}
									else
									{
											this.PPU_SpriteEvaluationTemp = this.ReadOAM(); // During these cycles, this.OAM is hard-coded to read $FF.
									}
									if (this.PPU_Dot === 1)
									{
											this.SecondaryOAMAddress = 0; // if this is dot 1, reset the secondary this.OAM address
											this.SecondaryOAMFull = false;// also reset the flag that checks of secondary this.OAM is full.
																							 // in preperation for the next section, let's clear these flags too
											this.SpriteEvaluationTick = 0;
											this.OAMAddressOverflowedDuringSpriteEvaluation = false;
									}
									if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank)
									{
											this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
											this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
											this.PPU_PendingOAMCorruption = true;
											this.PPU_OAMCorruptionIndex = this.SecondaryOAMAddress; // this value will be used when rendering is re-enabled and the corruption occurs
									}
							}
					}
					else
					{ //even cycles
							if (this.PPU_Dot > 0)
							{
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed))
									{
											if (!SpriteEval_ReadOnly)
											{
													this.SecondaryOAM[this.SecondaryOAMAddress] = this.PPU_SpriteEvaluationTemp; // store FF in secondary this.OAM
											}
											if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank)
											{
													this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
													this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
													this.PPU_PendingOAMCorruption = true;
													this.PPU_OAMCorruptionIndex = this.SecondaryOAMAddress; // this value will be used when rendering is re-enabled and the corruption occurs
											}

											this.SecondaryOAMAddress++;  // increment this value so on the next even cycle, we write to the next this.SecondaryOAM address.
											this.SecondaryOAMAddress &= 0x1F;  // keep the secondary this.OAM address in-bounds

											if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant && this.PPU_Dot === 64)
											{
													this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
													this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
													this.PPU_PendingOAMCorruption = true;
											}
									}
									else
									{
											if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank)
											{
													this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
													this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
													this.PPU_PendingOAMCorruption = true;
													this.PPU_OAMCorruptionIndex = 1; // this value will be used when rendering is re-enabled and the corruption occurs
											}
									}
							}
							else
							{
									this.SecondaryOAMAddress++;  // increment this value so on the next even cycle, we write to the next this.SecondaryOAM address.
									this.SecondaryOAMAddress &= 0x1F;  // keep the secondary this.OAM address in-bounds
							}                    
					}
			}
			else if ((this.PPU_Dot >= 65 && this.PPU_Dot <= 256)) // Dots 65 through 256, not on the pre-render line
			{
					if (this.PPU_Mask_ShowBackground_Instant || this.PPU_Mask_ShowSprites_Instant || this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant) // if rendering is enabled, or was *just* disabled mid evaluation
					{
							if ((this.PPU_Dot & 1) === 1)
							{ //odd cycles
									let PrevSpriteEvalTemp = this.PPU_SpriteEvaluationTemp;
									this.PPU_SpriteEvaluationTemp = this.OAM[this.PPUOAMAddress]; // read from this.OAM
									if ((this.PPUOAMAddress & 3) === 2)
									{
											this.PPU_SpriteEvaluationTemp &= 0xE7; // this.OAM address 02, 06, 0A, 0E, 12... are missing bits 3 and 4.
									}

									// If rendering was disabled *this* cycle (the odd cycle) then the even cycle will run normally, and the *next odd cycle* will have the this.OAM address increment. Presumably, that's when we record secondOAMAddr.
									if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant)
									{
											this.PPU_OAMEvaluationCorruptionOddCycle = false;
											this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
											if (!SpriteEval_ReadOnly)
											{
													this.PPUOAMAddress = (this.PPUOAMAddress + 1) & 0xFF;
											}
											this.OamCorruptedOnOddCycle = true;

									}
							}
							else
							{ //even cycles                       

									if (!this.OAMAddressOverflowedDuringSpriteEvaluation)
									{
											let PreIncVal = this.PPUOAMAddress; // for checking if this.PPUOAMAddress overflows
											if (!this.SecondaryOAMFull && !SpriteEval_ReadOnly) // If secondary this.OAM is not yet full,
											{
													this.SecondaryOAM[this.SecondaryOAMAddress] = this.PPU_SpriteEvaluationTemp; // store this value at the secondary oam address.
											}
											
											if (this.SpriteEvaluationTick === 0) // tick 0: check if this object's y position is in range for this scanline
											{
													this.PPU_OAMEvaluationObjectInXRange = false;
													if (!SpriteEval_ReadOnly && (this.PPU_Scanline & 0xFF) - this.PPU_SpriteEvaluationTemp >= 0 && (this.PPU_Scanline & 0xFF) - this.PPU_SpriteEvaluationTemp < (this.PPU_Spritex16 ? 16 : 8))
													{
															this.PPU_OAMEvaluationObjectInRange = true;
															// if this sprite is within range.
															if (!this.SecondaryOAMFull)
															{
																	if (!this.OamCorruptedOnOddCycle)
																	{
																			if (!SpriteEval_ReadOnly)
																			{
																					this.PPUOAMAddress = (this.PPUOAMAddress + 1) & 0xFF; // +1
																			}
																			this.SecondaryOAMAddress = (this.SecondaryOAMAddress + 1) & 0xFF; // increment this for the next write to secondary this.OAM
																	}
																	if (!this.SecondaryOAMFull) // if secondary this.OAM is not full
																	{
																			this.SecondaryOAMAddress &= 0x1F; // keep the secondary this.OAM address in-bounds
																			if (this.SecondaryOAMAddress === 0) // If we've overflowed the secondary this.OAM address
																			{
																					this.SecondaryOAMFull = true; // secondary this.OAM is now full.
																			}
																	}
																	// Sprite zero hits actually have nothing to do with reading the object at this.OAM index 0. Rather, if an object is within range of the scanline on dot 66.
																	// typically, the object processed on dot 66 is this.OAM[0], though it's possible using precisely timed writes to $2003 to have this.PPUOAMAddress start processing here from a different value.
																	if (this.PPU_Dot === 66)
																	{
																			this.PPU_NextScanlineContainsSpriteZero = true; // this value will be transferred to PPU_PreviousScanlineContainsSpriteZero at the end of the scanline, and that variable is used in sp 0 hit detection.
																	}
															}
															else // if secondary this.OAM is full, yet another object is on this scanline
															{
																	this.PPUStatus_SpriteOverflow = true; // set the sprite overflow flag
															}
															if (!SpriteEval_ReadOnly)
															{
																	this.SpriteEvaluationTick++; // increment the tick for next even ppu cycle.
															}
													}
													else
													{
															if (this.PPU_Dot === 66)
															{
																	this.PPU_NextScanlineContainsSpriteZero = false; // this value will be transferred to PPU_PreviousScanlineContainsSpriteZero at the end of the scanline, and that variable is used in sp 0 hit detection.
															}
															this.PPU_OAMEvaluationObjectInRange = false;
															if (!this.OamCorruptedOnOddCycle && !SpriteEval_ReadOnly)
															{
																	if (this.SecondaryOAMFull)
																	{
																			if ((this.PPUOAMAddress & 0x3) === 3)
																			{
																					this.PPUOAMAddress++; // this.A real hardware bug.
																					this.PPUOAMAddress &= 0xFF;
																			}
																			else
																			{
																					this.PPUOAMAddress += 4; // +4
																					this.PPUOAMAddress++; // this.A real hardware bug.
																					this.PPUOAMAddress &= 0xFF;
																			}
																	}
																	else
																	{
																			this.PPUOAMAddress += 4; // +4
																			this.PPUOAMAddress &= 0xFC; // also mask away the lower 2 bits
																	}
															}
													}
											}
											else // ticks 1, 2, or 3
											{
													if (this.SpriteEvaluationTick === 3) // tick 3: this.X position.
													{
															this.PPU_OAMEvaluationObjectInRange = false;
															// this.OAM this.X coordinate.
															// This also runs the "vertical in range check", though typically the result doesn't matter.
															if (this.PPU_Scanline - this.PPU_SpriteEvaluationTemp >= 0 && this.PPU_Scanline - this.PPU_SpriteEvaluationTemp < (this.PPU_Spritex16 ? 16 : 8))
															{
																	// if this sprite is within range.
																	this.PPU_OAMEvaluationObjectInXRange = true;
																	if (!this.SecondaryOAMFull)
																	{
																			if (!this.OamCorruptedOnOddCycle && !SpriteEval_ReadOnly)
																			{
																					this.PPUOAMAddress = (this.PPUOAMAddress + 1) & 0xFF; // +1
																			}
																	}
																	else
																	{
																			if (!this.OamCorruptedOnOddCycle && !SpriteEval_ReadOnly)
																			{
																					this.PPUOAMAddress += 4; // +1 (In theory, this should be +4, though my experiments only reflect my consoles behavior if this is +1?)
																					this.PPUOAMAddress &= 0xFF;
																			}
																	}
															}
															else
															{
																	this.PPU_OAMEvaluationObjectInXRange = false;
																	if (!this.SecondaryOAMFull)
																	{
																			if (!this.OamCorruptedOnOddCycle && !SpriteEval_ReadOnly)
																			{
																					this.PPUOAMAddress += 1; // +1 (In theory, this should be +4, though my experiments only reflect my consoles behavior if this is +1?)
																					this.PPUOAMAddress &= 0xFC; // also mask away the lower 2 bits
																			}
																	}
															}
													}
													else // ticks 1 and 2 don't make any checks. Only increment the this.OAM address.
													{
															if (!this.OamCorruptedOnOddCycle && !SpriteEval_ReadOnly)
															{
																	this.PPUOAMAddress = (this.PPUOAMAddress + 1) & 0xFF; // +1
															}
													}
													this.SpriteEvaluationTick++; // increment the tick for next even ppu cycle.
													this.SpriteEvaluationTick &= 3; // and reset the tick to 0 if it reaches 4.
													if (!this.SecondaryOAMFull && !SpriteEval_ReadOnly) // if secondary this.OAM is not full
													{
															this.SecondaryOAMAddress++; // increment the secondary this.OAM address.
															this.SecondaryOAMAddress &= 0x1F; // keep the secondary this.OAM address in-bounds
															if (this.SecondaryOAMAddress === 0) // If we've overflowed the secondary this.OAM address
															{
																	this.SecondaryOAMFull = true; // secondary this.OAM is now full.
															}
													}
											}
											this.OamCorruptedOnOddCycle = false;

											if (this.PPUOAMAddress < PreIncVal && this.PPUOAMAddress < 4) // If an overflow occured
											{
													this.OAMAddressOverflowedDuringSpriteEvaluation = true; // set this flag.
											}
									}
									else
									{   // this.OAM Address Overflowerd During Sprite Evaluation
											// fail to write to this.SecondaryOAM
											// boo womp.

											// also update the this.PPUOAMAddress.
											if (!this.OamCorruptedOnOddCycle && !SpriteEval_ReadOnly)
											{
													this.PPUOAMAddress += 4; // +4
													this.PPUOAMAddress &= 0xFC; // also mask away the lower 2 bits
											}
									}
									if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant && !this.PPU_OAMEvaluationCorruptionOddCycle) // if we just disabled rendering mid this.OAM evaluation, the address is incremented yet again.
									{
											this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
											this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
											this.PPU_PendingOAMCorruption = true;

											if ((this.SecondaryOAMAddress & 3) !== 0 && !this.OAMAddressOverflowedDuringSpriteEvaluation && !SpriteEval_ReadOnly)
											{
													this.SecondaryOAMAddress += 4;
													this.SecondaryOAMAddress &= 0xFC;
											}
											if (this.PPUClock === 0 || this.PPUClock === 3)
											{
													this.PPU_OAMCorruptionIndex = (this.SecondaryOAMAddress); // this value will be used when rendering is re-enabled and the corruption occurs
											}
											if (this.PPUClock === 1 || this.PPUClock === 2)
											{
													this.PPU_OAMCorruptionIndex = (this.SecondaryOAMAddress); // this value will be used when rendering is re-enabled and the corruption occurs
											}
											if(this.PPU_Dot === 256)
											{
													this.PPU_OAMCorruptionIndex = this.OamCorruptedOnOddCycle ? 0 : 1; //I have no idea.
											}

									}
									this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
							}
					}

			}
			else if (this.PPU_Dot >= 257 && this.PPU_Dot <= 320) // this also happens on the pre-render line.
			{
					this.PPU_CurrentScanlineContainsSpriteZero = this.PPU_NextScanlineContainsSpriteZero;

					if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed))
					{
							this.PPUOAMAddress = 0; // this is reset during every one of these cycles, 257 through 320
					}
					if (this.PPU_Dot === 257)
					{
							// reset these flags for this section.
							this.SecondaryOAMAddress = 0;
							this.SpriteEvaluationTick = 0;
					}

					if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank && (this.PPUClock === 0 || this.PPUClock === 3))
					{
							this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
							this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
							this.PPU_PendingOAMCorruption = true;
							this.PPU_OAMCorruptionIndex = this.SecondaryOAMAddress; // this value will be used when rendering is re-enabled and the corruption occurs
					}

					switch (this.SpriteEvaluationTick)
					{
							// So each scanline can only have up to 8 sprites.
							// Each sprite has a this.Y position, Pattern, Attributes, and this.X position.
							// So there's an 8-index-long array for each of those.
							// Each index in the array is for a different sprite.

							// Sprites also have 2 "bit plane" shift registers.
							// These are the 8 pixels to draw for the object on this scanline.
							// Again, there are 8 objects, so there are 2 8-index-long arrays of bit planes.

							// each case is a different ppu cycle.
							// case 0.
							// next cycle, case 1.
							// next cycle, case 2, and so on.
							// case 7 then leads back to case 0.


							case 0: // this.Y position         dot 257, (+8), (+16) ...
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed)) // if rendering has been enabled for at least 1 cycle.
									{
											// set this object's this.Y position in the array
											this.PPU_SpriteYposition[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress];
											this.PPU_Render_ShiftRegistersAndBitPlanes(); // Dummy Nametable this.Fetch
									}
									this.SecondaryOAMAddress++; // and increment the Secondary this.OAM address for next cycle
									break;
							case 1: // Pattern            dot 258, (+8), (+16) ...
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed)) // if rendering has been enabled for at least 1 cycle.
									{
											// set this object's pattern in the array
											this.PPU_SpritePattern[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress];
											this.PPU_Render_ShiftRegistersAndBitPlanes(); // Dummy Nametable this.Fetch
									}
									this.SecondaryOAMAddress++; // and increment the Secondary this.OAM address for next cycle
									break;
							case 2: // Attribute          dot 259, (+8), (+16) ...
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed)) // if rendering has been enabled for at least 1 cycle.
									{
											// set this object's attribute in the array
											this.PPU_SpriteAttribute[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress];
											this.PPU_Render_ShiftRegistersAndBitPlanes(); // Dummy Nametable this.Fetch
									}
									this.SecondaryOAMAddress++; // and increment the Secondary this.OAM address for next cycle
									break;
							case 3: // this.X position         dot 260, (+8), (+16) ...
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed)) // if rendering has been enabled for at least 1 cycle.
									{
											// set this object's this.X position in the array
											this.PPU_SpriteXposition[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress];
											this.PPU_Render_ShiftRegistersAndBitPlanes(); // Dummy Nametable this.Fetch
									}
									// notably, the secondary this.OAM address does not get incremented until case 7
									break;
							case 4: // this.X position (again) dot 261, (+8), (+16) ...
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed)) // if rendering has been enabled for at least 1 cycle.
									{
											// set this object's this.X position in the array... again.
											this.PPU_SpriteXposition[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress];
											// But also: Find the this.PPU address of this sprite's graphical data inside the Pattern Tables.
											this.PPU_SpriteEvaluation_GetSpriteAddress((this.SecondaryOAMAddress >> 2));
									}

									break;
							case 5: // this.X position (again)  dot 262, (+8), (+16) ...
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed)) // if rendering has been enabled for at least 1 cycle.
									{
											// set this object's this.X position in the array... again.
											this.PPU_SpriteXposition[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress];
											// but also: set up the bit plane shift register.
											this.PPU_SpritePatternL = this.FetchPPU(this.PPU_AddressBus);
											if (((this.PPU_SpriteAttribute[this.SecondaryOAMAddress >> 2] >> 6) & 1) === 1) // Attributes are set up to flip this.X
											{
													this.PPU_SpritePatternL = this.Flip(this.PPU_SpritePatternL);
											}
											this.PPU_SpriteShiftRegisterL[this.SecondaryOAMAddress >> 2] = this.PPU_SpritePatternL;
									}


									// in-range check. (The pre-render line ends up checking scanline 5 due to the `& 0xFF`.
									if(!((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[this.SecondaryOAMAddress >> 2] >= 0 && (this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[this.SecondaryOAMAddress >> 2] < (this.PPU_Spritex16 ? 16 : 8)))
									{
											this.PPU_SpriteShiftRegisterL[this.SecondaryOAMAddress >> 2] = 0; // clear the value in this shift register if this object isn't in range.
									}

									break;
							case 6: // this.X position (again)  dot 263, (+8), (+16) ...
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed))
									{
											// set this object's this.X position in the array... again.
											this.PPU_SpriteXposition[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress];
											// but also: add 8 to the this.PPU address. The other bit plane is 8 addresses away.
											this.PPU_AddressBus += 8; // at this point, the address couldn't possibly overflow, so there's no need to worry about that.
									}

									break;

							case 7: // this.X position (again)  dot 264, (+8), (+16) ...
									if (this.PPU_Scanline > 256)
									{

									}
									if ((this.PPU_Mask_ShowBackground_Delayed || this.PPU_Mask_ShowSprites_Delayed))
									{
											// set this object's this.X position in the array... again.
											this.PPU_SpriteXposition[this.SecondaryOAMAddress >> 2] = this.SecondaryOAM[this.SecondaryOAMAddress]; // read this.X pos again
											// but also: set up the second bit plane
											this.PPU_SpritePatternH = this.FetchPPU(this.PPU_AddressBus);
											if (((this.PPU_SpriteAttribute[this.SecondaryOAMAddress >> 2] >> 6) & 1) === 1) // Attributes are set up to flip this.X
											{
													this.PPU_SpritePatternH = this.Flip(this.PPU_SpritePatternH);
											}
											this.PPU_SpriteShiftRegisterH[this.SecondaryOAMAddress >> 2] = this.PPU_SpritePatternH;
									}

									// in-range check. (The pre-render line ends up checking scanline 5 due to the `& 0xFF`.
									if (!((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[this.SecondaryOAMAddress >> 2] >= 0 && (this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[this.SecondaryOAMAddress >> 2] < (this.PPU_Spritex16 ? 16 : 8)))
									{
											this.PPU_SpriteShiftRegisterH[this.SecondaryOAMAddress >> 2] = 0; // clear the value in this shift register if this object isn't in range.
									}

									this.SecondaryOAMAddress++; // and increment the Secondary this.OAM address for next cycle

									break;
					}
					this.SecondaryOAMAddress &= 0x1F; // keep the secondary this.OAM address in-bounds
											
					this.SpriteEvaluationTick++; // increment the tick, so next cycle uses the following case in the switch statement
					this.SpriteEvaluationTick &= 7; // and reset at 8

					if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank && (this.PPUClock === 1 || this.PPUClock === 2))
					{
							this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
							this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
							this.PPU_PendingOAMCorruption = true;
							this.PPU_OAMCorruptionIndex = this.SecondaryOAMAddress; // this value will be used when rendering is re-enabled and the corruption occurs
					}

			}
			else
			{
					// cycles 320 to 340
					if (this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank || this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant)
					{
							this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank = false;
							this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = false;
							this.PPU_PendingOAMCorruption = true;
							this.PPU_OAMCorruptionIndex = this.SecondaryOAMAddress; // this value will be used when rendering is re-enabled and the corruption occurs
					}

					if(this.PPU_Dot === 339)
					{
							for (let i = 0; i < 8; i++)
							{
									if ((this.PPU_Mask_ShowSprites || this.PPU_Mask_ShowBackground))
									{
											this.PPU_SpriteShifterCounter[i] = this.PPU_SpriteXposition[i];
									}
									else
									{
											this.PPU_SpriteShifterCounter[i] = 0;
									}
							}
					}
			}
			// and that's all for sprite evaluation!
	}

	PPU_SpriteEvaluation_GetSpriteAddress(SecondOAMSlot)
	{
			// this.PPU_PatternSelect_Sprites is set by writing to bit 3 of address $2000

			if (!this.PPU_Spritex16) //8x8 sprites
			{
					// The address is $0000 or $1000 depending on the nametable.
					// plus the pattern value from this.OAM * 16
					// plus the number of scanlines from the top of the object.
					// if the attributes are set to flip this.Y, it's 7 - the number of scanlines from the top of the object.
					if (((this.PPU_SpriteAttribute[SecondOAMSlot] >> 7) & 1) === 0) // Attributes are not set up to flip this.Y
					{
							this.PPU_AddressBus = ((this.PPU_PatternSelect_Sprites ? 0x1000 : 0) + (this.PPU_SpritePattern[SecondOAMSlot] << 4) + ((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot])) & 0xFFFF;
					}
					else  // Attributes are set up to flip this.Y
					{
							this.PPU_AddressBus = ((this.PPU_PatternSelect_Sprites ? 0x1000 : 0) + (this.PPU_SpritePattern[SecondOAMSlot] << 4) + ((7 - ((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot])) & 7)) & 0xFFFF;
					}
			}
			else //8x16 sprites
			{
					// In 8x16 mode, instead of using this.PPU_PatternSelect_Sprites to determine which pattern table to fetch data from...
					// these sprites instead use bit 0 of the object's pattern information from this.OAM.

					// The address is $0000 or $1000 depending on the nametable.
					// plus (the pattern value from this.OAM, clearing bit 0) * 16
					// plus the number of scanlines from the top of the object.
					// if the attributes are set to flip this.Y, it's 7 - the number of scanlines from the top of the object.

					// if we're drawing the bottom half of the sprite, add 16.
					if (((this.PPU_SpriteAttribute[SecondOAMSlot] >> 7) & 1) === 0) // Attributes are not set up to flip this.Y
					{
							if ((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot] < 8)
							{
									this.PPU_AddressBus = ((((this.PPU_SpritePattern[SecondOAMSlot] & 1) === 1) ? 0x1000 : 0) | ((this.PPU_SpritePattern[SecondOAMSlot] & 0xFE) << 4) + ((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot])) & 0xFFFF;
							}
							else
							{
									this.PPU_AddressBus = ((((this.PPU_SpritePattern[SecondOAMSlot] & 1) === 1) ? 0x1000 : 0) | (((this.PPU_SpritePattern[SecondOAMSlot] & 0xFE) << 4) + 16) + (((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot]) & 7)) & 0xFFFF;
							}
					}
					else // Attributes are set up to flip this.Y
					{
							if ((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot] < 8)
							{
									this.PPU_AddressBus = ((((this.PPU_SpritePattern[SecondOAMSlot] & 1) === 1) ? 0x1000 : 0) | (((this.PPU_SpritePattern[SecondOAMSlot] & 0xFE) << 4) + 16) - (((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot]) & 7) + 7) & 0xFFFF;
							}
							else
							{
									this.PPU_AddressBus = ((((this.PPU_SpritePattern[SecondOAMSlot] & 1) === 1) ? 0x1000 : 0) | (((this.PPU_SpritePattern[SecondOAMSlot] & 0xFE) << 4) + 7) - (((this.PPU_Scanline & 0xFF) - this.PPU_SpriteYposition[SecondOAMSlot]) & 7)) & 0xFFFF;
							}
					}
			}
	}





	PPU_Render_CalculatePixel()
	{
			// dots 1 through 256
			if (this.PPU_Dot <= 256)
			{
					// there are 8 palettes in the this.PPU
					// 4 are for the background, and the other 4 are for sprites.
					let Palette = 0;
					// each of these palettes have 4 colors
					let Color = 0;
					if (this.PPU_Mask_ShowBackground && (this.PPU_Dot > 8 || this.PPU_Mask_8PxShowBackground)) // if rendering is enables for this pixel
					{
							let col0 = (((this.PPU_PatternShiftRegisterL >> (15 - this.PPU_FineXScroll))) & 1); // take the bit from the shift register for the pattern low bit plane
							let col1 = (((this.PPU_PatternShiftRegisterH >> (15 - this.PPU_FineXScroll))) & 1); // take the bit from the shift register for the pattern high bit plane
							Color = ((col1 << 1) | col0);

							let pal0 = (((this.PPU_AttributeShiftRegisterL) >> (15 - this.PPU_FineXScroll)) & 1); // take the bit from the shift register for the attribute low bit plane
							let pal1 = (((this.PPU_AttributeShiftRegisterH) >> (15 - this.PPU_FineXScroll)) & 1); // take the bit from the shift register for the attribute high bit plane
							Palette = ((pal1 << 1) | pal0);

							if (Color === 0 && Palette !== 0) // color 0 of all palettes are mirrors of color 0 of palette 0
							{
									Palette = 0;
							}
					}

					// pretty much the same thing, but for sprites instead of background
					let SpritePalette = 0;
					let SpriteColor = 0;
					let SpritePriority = false; // if set, this sprite will be in front of background tiles. Otherwise, it will only take priority if the background is using color 0.

					if (this.PPU_Mask_ShowSprites && (this.PPU_Dot > 8 || this.PPU_Mask_8PxShowSprites))
					{
							let i = 0;

							// check all 8 objects in secondary this.OAM
							while (i < 8)
							{
									if (this.PPU_SpriteShifterCounter[i] === 0 || this.SkippedPreRenderDot341) // if the shifter counter === 0 (the shifter counter is decremented each ppu cycle)
									{
											let SpixelL = ((this.PPU_SpriteShiftRegisterL[i]) & 0x80) !== 0; // take the bit from the shift register for the pattern low bit plane
											let SpixelH = ((this.PPU_SpriteShiftRegisterH[i]) & 0x80) !== 0; // take the bit from the shift register for the pattern high bit plane
											SpriteColor = 0;
											if (SpixelL) { SpriteColor = 1; }
											if (SpixelH) { SpriteColor |= 2; }

											SpritePalette = ((this.PPU_SpriteAttribute[i] & 0x03) | 0x04); // read the palette from secondary this.OAM attributes.
											SpritePriority = ((this.PPU_SpriteAttribute[i] >> 5) & 1) === 0;      // read the priority from secondary this.OAM attributes.

									}
									else // if no objects are in range of this pixel...
									{
											i++; // try the next one
											continue;
									}

									if (SpriteColor !== 0) // if we found an object, exit the loop. This means, objects earlier in secondary this.OAM hive higher priority over sprites later in secondary this.OAM
									{
											break;
									}

									i++; // This pixel wasn't a part of the previous object. Try the next slot in secondary oam.
							}

							// if we hit sprite zero and both rendering background and sprites are enabled...
							if (this.PPU_CanDetectSpriteZeroHit && i === 0 && this.PPU_CurrentScanlineContainsSpriteZero && this.PPU_Mask_ShowBackground && this.PPU_Mask_ShowSprites)
							{
									if (Color !== 0 && SpriteColor !== 0) // if both the background and sprites are visible on this pixel
									{
											if ((this.PPU_Mask_8PxShowSprites || this.PPU_Dot > 8) && this.PPU_Dot < 256) // and if this isn't on pixel 256, or in the first 8 pixels being masked away fron the nametable, if that setting is enabled...
											{
													this.PPUStatus_SpriteZeroHit = true; // we did it! sprite zero hit achieved.
													this.PPU_CanDetectSpriteZeroHit = false; // another sprite zero hit cannot occur until the end of next vblank.
													if (this.Logging) // and for some debug logging...
													{
															let S = this.DebugLog; // let's add text to the current line letting me know a sprite zero hit occured, and on which dot
															if (S.length > 0)
															{
																	S = S.substring(0, S.length - 2); // trim off \n
																	this.DebugLog = S;
																	this.DebugLog += (" ! Sprite Zero Hit ! (Dot " + this.PPU_Dot + ")\r\n");
															}
													}
											}
									}
							}

							// which do we draw, the background or the sprite?
							if (Color === 0 && SpriteColor !== 0) // Well, if the background was using color 0, and the sprite wasn't,  always draw the sprite.
							{
									Color = SpriteColor; // I'm just re-using this background color variable.
									Palette = SpritePalette;       // I'm also just re-using the background palette variable.
							}
							else if (SpriteColor !== 0) // the background color isn't zero...
							{
									if (SpritePriority) // if the sprite has priority, always draw the sprite.
									{
											Color = SpriteColor; // I'm just re-using this cackground color variable.
											Palette = SpritePalette; // I'm also just re-using the background palette variable.
									}
							}
					}

					if (this.PPU_Mask_ShowBackground || this.PPU_Mask_ShowSprites) // if rendering is enabled...
					{
							this.PaletteRAMAddress = (Palette << 2 | Color); // the Palette this.RAM address is determined by the palette and color we found.
					}
					else
					{
							// rendering is disabled...
							if ((this.PPU_ReadWriteAddress & 0x3F1F) >= 0x3F00) // if v points to palette ram:
							{
									this.PaletteRAMAddress = (this.PPU_ReadWriteAddress & 0x1F); // The palette this.RAM address is simply wherever the v register is. (bitwise and with $1F due to palette this.RAM mirroring)
									if ((this.PaletteRAMAddress & 3) === 0)
									{
											this.PaletteRAMAddress &= 0x0F; // the transparent colors for sprites and backgrounds are shared.
									}
							}
							else
							{
									// EXT Pins
									this.PaletteRAMAddress = 0; // I'm not really emulating the EXT pins, and as far as I'm aware they aren't used in any games, official or homebrew.
									// This is typically why the background color is using Palette[0] when rendering is disabled.
							}
					}

					if (this.PPU_PaletteCorruptionRenderingDisabledOutOfVBlank || this.PPU_VRegisterChangedOutOfVBlank)
					{
							this.PPU_VRegisterChangedOutOfVBlank = false;
							this.PPU_PaletteCorruptionRenderingDisabledOutOfVBlank = false;
							// this.PPU palette corruption!

							this.CorruptPalettes(Color, Palette);
							// This corruption also results in a single discolored pixel, and this occurs on all alignments.
							// I'm not entirely sure how this works, and I think it's the *next* pixel that gets corrupt? More research needed.

					}

					this.DotColor = ((this.PaletteRAM[0x00 | this.PaletteRAMAddress]) & 0x3F); // Get the color by reading from Palette this.RAM

					// though this is actually drawn to the screen 2 ppu cycles from now.
			}
	}

	CorruptPalettes(Color, Palette)
	{
			// Depending on the index into a color palette being used to select a color being drawn when rendering was disabled during a nametable fetch on a visible pixel with the this.PPU V Register (bitwise AND with $3FFF) being >= $3C00...
			// Palettes get "corrupted" with a specific pattern.
			// This pattern is determined by:
			// The lowest nybble of the this.PPU's V register,
			// The color index into the palette,
			// and if this is using a sprite palette. (TODO: emulate this part)

			// All of this was determined by observations with a custom test cart.
			// It is entirely possible that the logic defined in this functions is incorrect, or possibly there are more factors at play.
			// As far as I can tell though, this is "good enough" emulation of palette corruption.

			if ((this.CPUClock & 3) !== 2)
			{
					// this behavior occurs on other alignments, but seems consistent on alignment 2, and very hit or miss on other alignments.
					// Currently, I'm only emulating this on alignment 2, but I'll probably change this in the future.
					return;
			}


			let CorruptedPalette = new Uint8Array(this.PaletteRAM.length);
			for (let i = 0; i < CorruptedPalette.length; i++)
			{
					CorruptedPalette[i] = this.PaletteRAM[i];
			}

			switch (Color)
			{
					case 0:
							// simply take the low nybble from the V register. that's the color to corrupt.
							CorruptedPalette[this.PPU_ReadWriteAddress & 0xF] = ((this.PaletteRAM[0] & this.PaletteRAM[this.PPU_ReadWriteAddress & 0xC]) | (this.PaletteRAM[0] & this.PaletteRAM[this.PPU_ReadWriteAddress & 0xF]) | (this.PaletteRAM[this.PPU_ReadWriteAddress & 0xC] & this.PaletteRAM[this.PPU_ReadWriteAddress & 0xF]));
							// TODO: Nybble 7 can corrupt color F. It's inconsistent though, so I'll need to circle back to this.

							break;
					case 1:

							// To be honest, I'm not sure what's going on, so forgive the lack of comments.
							// There's almost a pattern, but again- unsure on why this is how it behaves.
							// and also it's likely this isn't entirely accurate, either due to mistyping something, or not enough research.

							switch (this.PPU_ReadWriteAddress & 0xF)
							{
									case 0:
											CorruptedPalette[0x0] = ((this.PaletteRAM[0x1] & this.PaletteRAM[0xD]) | this.PaletteRAM[0x0]);
											CorruptedPalette[0x4] = this.PaletteRAM[0x5];
											CorruptedPalette[0x8] = this.PaletteRAM[0x9];
											CorruptedPalette[0xC] = this.PaletteRAM[0xD];
											break;
									case 1:
											break;
									case 2:
											CorruptedPalette[0x2] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0xD]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x3] = ((this.PaletteRAM[0x1] | this.PaletteRAM[0x2]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x6] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0x5]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0xA] = ((this.PaletteRAM[0xA] | this.PaletteRAM[0x9]) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xE] = this.PaletteRAM[0xD];
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
									case 3:
											CorruptedPalette[0x3] &= (this.PaletteRAM[0x1] | this.PaletteRAM[0xD]);
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
									case 4:
											CorruptedPalette[0x0] = this.PaletteRAM[0x1];
											CorruptedPalette[0x4] = ((this.PaletteRAM[0x5] & this.PaletteRAM[0xD]) | this.PaletteRAM[0x4]);
											CorruptedPalette[0x8] = this.PaletteRAM[0x9];
											CorruptedPalette[0xC] = this.PaletteRAM[0xD];
											break;
									case 5:
											break;
									case 6:
											CorruptedPalette[0x2] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0x1]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x6] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0x7]) & this.PaletteRAM[0xD]);
											CorruptedPalette[0x7] = ((this.PaletteRAM[0x7] | this.PaletteRAM[0x6]) & this.PaletteRAM[0x5]);
											CorruptedPalette[0xA] = ((this.PaletteRAM[0xA] | this.PaletteRAM[0x9]) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xE] = this.PaletteRAM[0xD];
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
									case 7:
											CorruptedPalette[0x7] &= (this.PaletteRAM[0x5] | this.PaletteRAM[0xD]);
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
									case 8:
											CorruptedPalette[0x0] = this.PaletteRAM[0x1];
											CorruptedPalette[0x4] = this.PaletteRAM[0x5];
											CorruptedPalette[0x8] = ((this.PaletteRAM[0x9] & this.PaletteRAM[0xD]) | this.PaletteRAM[0x8]);
											CorruptedPalette[0xC] = this.PaletteRAM[0xD];
											break;
									case 9:
											break;
									case 0xA:
											CorruptedPalette[0x2] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0x1]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x6] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0xD]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0xA] = ((this.PaletteRAM[0xB] | this.PaletteRAM[0xD]) & this.PaletteRAM[0xA]);
											CorruptedPalette[0xB] = ((this.PaletteRAM[0x9] | this.PaletteRAM[0xA]) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xE] = this.PaletteRAM[0xD];
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
									case 0xB:
											CorruptedPalette[0xB] &= (this.PaletteRAM[0x9] | this.PaletteRAM[0xD]);
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
									case 0xC:
											CorruptedPalette[0x0] = this.PaletteRAM[0x1];
											CorruptedPalette[0x4] = this.PaletteRAM[0x5];
											CorruptedPalette[0x8] = this.PaletteRAM[0x9];
											CorruptedPalette[0xC] = this.PaletteRAM[0xD];
											break;
									case 0xD:
											break;
									case 0xE:
											CorruptedPalette[0x2] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0x1]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x6] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0xD]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0xA] = ((this.PaletteRAM[0xA] | this.PaletteRAM[0x9]) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xE] = this.PaletteRAM[0xD];
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
									case 0xF:
											CorruptedPalette[0xF] = this.PaletteRAM[0xD];
											break;
							}


							// In some tests with case this.A, bit 3 ($08) of color 3 can remove bit 2 ($04) from the value of color 0 for the purposes of the bitwise AND. It's inconsistent though.


							break;
					case 2:

							// To be honest, I'm not sure what's going on, so forgive the lack of comments.
							// There's almost a pattern, but again- unsure on why this is how it behaves.
							// and also it's likely this isn't entirely accurate, either due to mistyping something, or not enough research.

							switch (this.PPU_ReadWriteAddress & 0xF)
							{
									case 0:
											CorruptedPalette[0x0] = (this.PaletteRAM[0x0] | (this.PaletteRAM[0x2] & this.PaletteRAM[0xE]));
											CorruptedPalette[0x4] = this.PaletteRAM[0x6];
											CorruptedPalette[0x8] = this.PaletteRAM[0xA];
											CorruptedPalette[0xC] = this.PaletteRAM[0xE];
											break;
									case 1:
											CorruptedPalette[0x1] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0x1] | this.PaletteRAM[0xE]) & (this.PaletteRAM[0x3] | this.PaletteRAM[0xE]));
											CorruptedPalette[0x3] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0xE] | 0x3C) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x5] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0x7]) & this.PaletteRAM[0x5]);
											CorruptedPalette[0x9] = ((this.PaletteRAM[0xA] | this.PaletteRAM[0xB]) & this.PaletteRAM[0x9]);
											CorruptedPalette[0xD] = this.PaletteRAM[0xE];
											CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
									case 2:
											break;
									case 3:
											CorruptedPalette[0x3] &= (this.PaletteRAM[0x2] | this.PaletteRAM[0xE]);
											CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
									case 4:
											CorruptedPalette[0x0] = this.PaletteRAM[0x2];
											CorruptedPalette[0x4] = (this.PaletteRAM[0x4] | (this.PaletteRAM[0x6] & this.PaletteRAM[0xE]));
											CorruptedPalette[0x8] = this.PaletteRAM[0xA];
											CorruptedPalette[0xC] = this.PaletteRAM[0xE];
											break;
									case 5:
											CorruptedPalette[0x1] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0x1]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x5] = ((this.PaletteRAM[0xE] | this.PaletteRAM[0x6]) & this.PaletteRAM[0x5]);
											CorruptedPalette[0x7] = ((this.PaletteRAM[0xE] | this.PaletteRAM[0x6]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0xD] = this.PaletteRAM[0xE];
											CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
									case 6:
											break;
									case 7:
											CorruptedPalette[0x7] &= (this.PaletteRAM[0x6] | this.PaletteRAM[0xE]);
											//CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
									case 8:
											CorruptedPalette[0x0] = this.PaletteRAM[0x2];
											CorruptedPalette[0x4] = this.PaletteRAM[0x6];
											CorruptedPalette[0x8] = (this.PaletteRAM[0x8] | (this.PaletteRAM[0xA] & this.PaletteRAM[0xE]));
											CorruptedPalette[0xC] = this.PaletteRAM[0xE];
											break;
									case 9:
											CorruptedPalette[0x1] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0x1]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x5] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0x5]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0x9] = ((this.PaletteRAM[0xE] | this.PaletteRAM[0xA] | 0x01) & this.PaletteRAM[0x9]);
											CorruptedPalette[0xB] = ((this.PaletteRAM[0xE] | this.PaletteRAM[0xA] | 0x31) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xD] = this.PaletteRAM[0xE];
											CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
									case 0xA:
											break;
									case 0xB:
											CorruptedPalette[0xB] &= (this.PaletteRAM[0xA] | this.PaletteRAM[0xE]);
											CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
									case 0xC:
											CorruptedPalette[0x0] = this.PaletteRAM[0x2];
											CorruptedPalette[0x4] = this.PaletteRAM[0x6];
											CorruptedPalette[0x8] = this.PaletteRAM[0xA];
											CorruptedPalette[0xC] = this.PaletteRAM[0xE];
											break;
									case 0xD:
											CorruptedPalette[0x1] = ((this.PaletteRAM[0x2] | this.PaletteRAM[0x1]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x5] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0x5]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0x9] = ((this.PaletteRAM[0xA] | this.PaletteRAM[0x9]) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xD] = this.PaletteRAM[0xE];
											CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
									case 0xE:
											break;
									case 0xF:
											CorruptedPalette[0xF] = this.PaletteRAM[0xE];
											break;
							}


							break;
					case 3:

							// To be honest, I'm not sure what's going on, so forgive the lack of comments.
							// There's almost a pattern, but again- unsure on why this is how it behaves.
							// and also it's likely this isn't entirely accurate, either due to mistyping something, or not enough research.

							switch (this.PPU_ReadWriteAddress & 0xF)
							{
									case 0:
											CorruptedPalette[0x0] = ((this.PaletteRAM[0x3] | (this.PaletteRAM[0xF] & this.PaletteRAM[0x0])));
											CorruptedPalette[0x4] &= this.PaletteRAM[0x7];
											CorruptedPalette[0x8] &= (this.PaletteRAM[0x9] | this.PaletteRAM[0xA] | this.PaletteRAM[0xB] | this.PaletteRAM[0xF] | 0x22); // magic number... Probably a temperature thing? I've seen 02, 22, 2C, or 2E
											CorruptedPalette[0xC] = this.PaletteRAM[0xF];
											break;
									case 1:
											CorruptedPalette[0x1] = ((this.PaletteRAM[0x1] | this.PaletteRAM[0xF]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x5] = this.PaletteRAM[0x7];
											CorruptedPalette[0x9] = this.PaletteRAM[0xB];
											CorruptedPalette[0xD] = this.PaletteRAM[0xF];
											break;
									case 2:
											CorruptedPalette[0x2] = ((this.PaletteRAM[0x3] | this.PaletteRAM[0xF]) & this.PaletteRAM[0x3]);
											CorruptedPalette[0x6] = this.PaletteRAM[0x7];
											CorruptedPalette[0xA] = this.PaletteRAM[0xB];
											CorruptedPalette[0xE] = this.PaletteRAM[0xF];
											break;
									case 3:
											break;
									case 4:
											CorruptedPalette[0x0] &= (((this.PaletteRAM[0xF] ^ 0xFF)) | this.PaletteRAM[0x1] | this.PaletteRAM[0x2] | this.PaletteRAM[0x3] | 0x7); // magic number... I've only seen it as 07 though.
											CorruptedPalette[0x4] &= (this.PaletteRAM[0x7] | this.PaletteRAM[0xF]);
											CorruptedPalette[0x8] &= (this.PaletteRAM[0xB] | this.PaletteRAM[0xF] | (this.PaletteRAM[0xC] ^ 0xFF));
											CorruptedPalette[0xC] = ((this.PaletteRAM[0x7] & this.PaletteRAM[0xF]) | this.PaletteRAM[0xC]);
											break;
									case 5:
											CorruptedPalette[0x1] = this.PaletteRAM[0x3];
											CorruptedPalette[0x5] = ((this.PaletteRAM[0x5] | this.PaletteRAM[0xF]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0x9] = this.PaletteRAM[0xB];
											CorruptedPalette[0xD] = this.PaletteRAM[0xF];
											break;
									case 6:
											CorruptedPalette[0x2] = this.PaletteRAM[0x3];
											CorruptedPalette[0x6] = ((this.PaletteRAM[0x6] | this.PaletteRAM[0xF]) & this.PaletteRAM[0x7]);
											CorruptedPalette[0xA] = this.PaletteRAM[0xB];
											CorruptedPalette[0xE] = this.PaletteRAM[0xF];
											break;
									case 7:
											break;
									case 8:
											CorruptedPalette[0x0] &= (((this.PaletteRAM[0xF] ^ 0xFF)) | this.PaletteRAM[0x1] | this.PaletteRAM[0x2] | this.PaletteRAM[0x3] | 0x23); // magic number... I've only seen it as 23 though.
											CorruptedPalette[0x4] = (this.PaletteRAM[0x7]);
											CorruptedPalette[0x8] &= (this.PaletteRAM[0xB] | this.PaletteRAM[0xF] | (this.PaletteRAM[0xC] ^ 0xFF));
											CorruptedPalette[0xC] = ((this.PaletteRAM[0xB] & this.PaletteRAM[0xF]) | this.PaletteRAM[0xC]);
											break;
									case 9:
											CorruptedPalette[0x1] = this.PaletteRAM[0x3];
											CorruptedPalette[0x5] = this.PaletteRAM[0x7];
											CorruptedPalette[0x9] = ((this.PaletteRAM[0x9] | this.PaletteRAM[0xF]) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xD] = this.PaletteRAM[0xF];
											break;
									case 0xA:
											CorruptedPalette[0x2] = this.PaletteRAM[0x3];
											CorruptedPalette[0x6] = this.PaletteRAM[0x7];
											CorruptedPalette[0xA] = ((this.PaletteRAM[0xA] | this.PaletteRAM[0xF]) & this.PaletteRAM[0xB]);
											CorruptedPalette[0xE] = this.PaletteRAM[0xF];
											break;
									case 0xB:
											break;
									case 0xC:
											CorruptedPalette[0x0] &= (((this.PaletteRAM[0xF] ^ 0xFF)) | this.PaletteRAM[0x1] | this.PaletteRAM[0x2] | this.PaletteRAM[0x3] | 0x37); // magic number... I've only seen it as 23 though.
											CorruptedPalette[0x4] = this.PaletteRAM[0x7];
											CorruptedPalette[0x8] &= (this.PaletteRAM[0xB] | 0x2F); // Magic number. I've seen 2F and 2E
											CorruptedPalette[0xC] = this.PaletteRAM[0xF];
											break;
									case 0xD:
											CorruptedPalette[0x1] = this.PaletteRAM[0x3];
											CorruptedPalette[0x5] = this.PaletteRAM[0x7];
											CorruptedPalette[0x9] = this.PaletteRAM[0xB];
											CorruptedPalette[0xD] = this.PaletteRAM[0xF];
											break;
									case 0xE:
											CorruptedPalette[0x2] = this.PaletteRAM[0x3];
											CorruptedPalette[0x6] = this.PaletteRAM[0x7];
											CorruptedPalette[0xA] = this.PaletteRAM[0xB];
											CorruptedPalette[0xE] = this.PaletteRAM[0xF];
											break;
									case 0xF:
											break;
							}

							break;


			}
			for (let i = 0; i < CorruptedPalette.length; i++)
			{
					this.PaletteRAM[i] = CorruptedPalette[i];
			}


	}





	PPU_RenderTemp = 0; // a variable used in the following function to store information between ppu cycles.
	PPU_Render_ShiftRegistersAndBitPlanes()
	{
			let cycleTick = 0; // for the switch statement below, this checks which case to run on a given ppu cycle.
			cycleTick = ((this.PPU_Dot - 1) & 7);

			switch (cycleTick)
			{
					case 0:
							this.PPU_LoadShiftRegisters();
							// fetch byte from Nametable
							this.PPU_AddressBus = (0x2000 + (this.PPU_ReadWriteAddress & 0x0FFF));
							this.PPU_RenderTemp = this.FetchPPU(this.PPU_AddressBus);
							break;
					case 1:
							// store the character read from the nametable
							this.PPU_NextCharacter = this.PPU_RenderTemp;
							break;
					case 2:
							// fetch attribute byte from attribute table
							this.PPU_AddressBus = (0x23C0 | (this.PPU_ReadWriteAddress & 0x0C00) | ((this.PPU_ReadWriteAddress >> 4) & 0x38) | ((this.PPU_ReadWriteAddress >> 2) & 0x07));
							this.PPU_RenderTemp = this.FetchPPU(this.PPU_AddressBus);
							break;
					case 3:
							// store the attribute value read.
							this.PPU_Attribute = this.PPU_RenderTemp;
							// 1 byte of attribute data is 4 tiles worth. determine which tile this is for.
							if ((this.PPU_ReadWriteAddress & 3) >= 2) // If this is on the right tile
							{
									this.PPU_Attribute = (this.PPU_Attribute >> 2);
							}
							if ((((this.PPU_ReadWriteAddress & 0b0000001111100000) >> 5) & 3) >= 2) // If this is on the bottom tile
							{
									this.PPU_Attribute = (this.PPU_Attribute >> 4);
							}
							this.PPU_Attribute = (this.PPU_Attribute & 3);
							// now we only have the 2 bits we're looking for
							break;
					case 4:
							// fetch pattern bits from value read off the nametable
							this.PPU_AddressBus = (((this.PPU_ReadWriteAddress & 0b0111000000000000) >> 12) | this.PPU_NextCharacter * 16 | (this.PPU_PatternSelect_Background ? 0x1000 : 0));
							this.PPU_RenderTemp = this.FetchPPU(this.PPU_AddressBus);
							this.PPU_LowBitPlane = this.PPU_RenderTemp;
							break;
					case 5:
							// update the address bus for the next fetch
							this.PPU_AddressBus += 8; // +8 
							break;
					case 6:
							// fetch pattern bits with the new address
							this.PPU_RenderTemp = this.FetchPPU(this.PPU_AddressBus);
							this.PPU_HighBitPlane = this.PPU_RenderTemp;
							break;
					case 7:
							// and update the this.X scroll for the next tile on the nametable
							this.PPU_IncrementScrollX();
							break;
			}

	}


	// in sprite evaluation, if a sprite is horizontally mirrored, we need to flip all the order of the bits in the shift register.
	Flip(b)
	{
			b = (((b & 0xF0) >> 4) | ((b & 0xF) << 4));
			b = (((b & 0xCC) >> 2) | ((b & 0x33) << 2));
			b = (((b & 0xAA) >> 1) | ((b & 0x55) << 1));
			return b;
	}

	/// <summary>
	/// Returns the value from the PPU RAM, or the cartridge's CHR RAM/ROM at the target PPU address. 
	/// </summary>
	/// <param name="Address"></param>
	/// <returns></returns>

	FetchPPU(Address)
	{
			// when reading from the this.PPU's Video this.RAM, there's a lot of mapper-specific behavior to consider.
			Address &= 0x3FFF;
			if (Address < 0x2000)
			{
					if (this.Cart.UsingCHRRAM)
					{
							return this.Cart.CHRRAM[Address];
					}
					else
					{
							//Pattern Table
							switch (this.Cart.MemoryMapper)
							{
									case 0: return this.Cart.CHRROM[Address & (this.Cart.CHRROM.length - 1)];
									case 1: // MMC1
											// bit 4 of Mapper_1_Control controls how the pattern tables are swapped. if set, 2 banks of 4Kib. Otherwise, 1 8Kib bank
											if ((this.Cart.Mapper_1_Control & 0x10) !== 0)
											{
													// with the MMC1 chip, you can swap out the pattern tables.
													// address < 0x1000 is the first pattern table, else, the second pattern table.
													// if the final write for the MMC1 shift register was in the $A000 - $BFFF, this updates this.Cart.Mapper_1_CHR0
													// if the final write for the MMC1 shift register was in the $B000 - $CFFF, this updates this.Cart.Mapper_1_CHR1
													if (Address < 0x1000) { return this.Cart.CHRROM[((this.Cart.Mapper_1_CHR0 & 0x1F) * 0x1000 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else { Address &= 0xFFF; return this.Cart.CHRROM[((this.Cart.Mapper_1_CHR1 & 0x1F) * 0x1000 + Address) & (this.Cart.CHRROM.length - 1)]; }
											}
											else // one swappable bank that changes both pattern tables.
											{
													// this uses the value written to Mapper_1_CHR0
													return this.Cart.CHRROM[((this.Cart.Mapper_1_CHR0 & 0b11111110) * 0x2000 + Address) & (this.Cart.CHRROM.length - 1)];
											}
									case 3: // CNROM
											// by writing to any address $8000 or greater with CNROM, bits 0 and 1 determine the CHR bank.
											return this.Cart.CHRROM[(this.Cart.Mapper_3_CHRBank * 0x2000 + Address) & (this.Cart.CHRROM.length - 1)];
									case 4:
									case 118:
									case 119: // MMC3
											//Writes to $8000 determine the mode, writes to $8001 determine the banks
											if ((this.Cart.Mapper_4_8000 & 0x80) === 0) // bit 7 of the previous write to $8000 determines which pattern table is 2 2kb banks, and which is 4 1kb banks.
											{
													if (Address < 0x800) { return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_2K0 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0x1000) { Address &= 0x7FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_2K8 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0x1400) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1K0 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0x1800) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1K4 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0x1C00) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1K8 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1KC * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											}
											else
											{
													if (Address < 0x400) { return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1K0 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0x800) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1K4 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0xC00) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1K8 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0x1000) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_1KC * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else if (Address < 0x1800) { Address &= 0x7FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_2K0 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
													else { Address &= 0x7FF; return this.Cart.CHRROM[(this.Cart.Mapper_4_CHR_2K8 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											}
									case 9: //MMC2                            
											let temp = 0;
											let Addr = Address;
											if (Address < 0x1000) { temp = this.Cart.CHRROM[(this.Cart.Mapper_9_Latch0_FE ? this.Cart.Mapper_9_CHR0_FE : this.Cart.Mapper_9_CHR0_FD) * 0x1000 + Addr]; }
											else { Addr &= 0xFFF; temp = this.Cart.CHRROM[(this.Cart.Mapper_9_Latch1_FE ? this.Cart.Mapper_9_CHR1_FE : this.Cart.Mapper_9_CHR1_FD) * 0x1000 + Addr]; }
											if (Address === 0x0FD8)
											{
													this.Cart.Mapper_9_Latch0_FE = false;
											}
											else if (Address === 0x0FE8)
											{
													this.Cart.Mapper_9_Latch0_FE = true;
											}
											else if (Address >= 0x1FD8 && Address <= 0x1FDF)
											{
													this.Cart.Mapper_9_Latch1_FE = false;
											}
											else if (Address >= 0x1FE8 && Address <= 0x1FEF)
											{
													this.Cart.Mapper_9_Latch1_FE = true;
											}
											return temp;
									case 69: // Sunsoft FME-7
											if (Address < 0x400) { return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K0 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											else if (Address < 0x800) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K1 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											else if (Address < 0xC00) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K2 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											else if (Address < 0x1000) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K3 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											else if (Address < 0x1400) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K4 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											else if (Address < 0x1800) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K5 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											else if (Address < 0x1C00) { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K6 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }
											else { Address &= 0x3FF; return this.Cart.CHRROM[(this.Cart.Mapper_69_CHR_1K7 * 0x400 + Address) & (this.Cart.CHRROM.length - 1)]; }

							}
							// if it wasn't any of those mappers, I still need to implement stuff.

							return this.Cart.CHRROM[Address & (this.Cart.CHRROM.length - 1)];
					}

			}
			else // if the VRAM address is >= $2000, we need to consider nametable mirroring.
			{
					Address = this.PPUAddressWithMirroring(Address);
					if (Address >= 0x3F00)
					{
							// read from palette this.RAM.
							// Palette this.RAM only returns bits 0-5, so bits 6 and 7 are this.PPU open bus.
							return ((this.PaletteRAM[Address & 0x1F] & 0x3F) | (this.PPUBus & 0xC0));
					}
					Address &= 0x7FF;
					return this.PPU[Address];
			}
	}

	PPU_UpdateShiftRegisters()
	{

			if ((this.PPU_Mask_ShowSprites || this.PPU_Mask_ShowBackground)) // if rendering, update the shift registers for the background.
			{
					this.PPU_PatternShiftRegisterL = (this.PPU_PatternShiftRegisterL << 1) & 0xFFFF; // shift 1 bit to the left.
					this.PPU_PatternShiftRegisterH = (this.PPU_PatternShiftRegisterH << 1) & 0xFFFF; // shift 1 bit to the left.
					this.PPU_AttributeShiftRegisterL = (this.PPU_AttributeShiftRegisterL << 1) & 0xFFFF; // shift 1 bit to the left.
					this.PPU_AttributeShiftRegisterH = (this.PPU_AttributeShiftRegisterH << 1) & 0xFFFF; // shift 1 bit to the left.
			}            
	}

	UpdateSpriteShiftRegisters()
	{
			if (this.PPU_Dot <= 256) // the shift registers for sprites are shifter after the rendering process.
			{               
					// shift all 8 sprite shift registers.
					let i = 0;
					while (i < 8)
					{
							if (this.PPU_SpriteShifterCounter[i] > 0 && !this.SkippedPreRenderDot341)
							{
									this.PPU_SpriteShifterCounter[i]--; // decrement the this.X position of all objects in secondary this.OAM. When this is zero, the ppu can draw it.
							}
							else
							{
									if ((this.PPU_Mask_ShowSprites || this.PPU_Mask_ShowBackground)) // this happens if rendering either sprites or background.
									{
											this.PPU_SpriteShiftRegisterL[i] = (this.PPU_SpriteShiftRegisterL[i] << 1); // shift 1 bit to the left.
											this.PPU_SpriteShiftRegisterH[i] = (this.PPU_SpriteShiftRegisterH[i] << 1); // shift 1 bit to the left.
									}
							}

							i++;
					}
					
			}
	}

	PPU_LoadShiftRegisters()
	{
			// this runs as the first step of this.PPU_Render_ShiftRegistersAndBitPlanes(), using the values determined by the previous 8 steps of this.PPU_Render_ShiftRegistersAndBitPlanes().
			this.PPU_PatternShiftRegisterL = ((this.PPU_PatternShiftRegisterL & 0xFF00) | this.PPU_LowBitPlane);
			this.PPU_PatternShiftRegisterH = ((this.PPU_PatternShiftRegisterH & 0xFF00) | this.PPU_HighBitPlane);
			this.PPU_AttributeShiftRegisterL = ((this.PPU_AttributeShiftRegisterL & 0xFF00) | ((this.PPU_Attribute & 1) === 1 ? 0xFF : 0));
			this.PPU_AttributeShiftRegisterH = ((this.PPU_AttributeShiftRegisterH & 0xFF00) | ((this.PPU_Attribute & 2) === 2 ? 0xFF : 0));
	}

	PPU_IncrementScrollX()
	{
			// used when setting up shift registers for the background
			// update the v register. Either increment it, or reset the scroll
			if ((this.PPU_ReadWriteAddress & 0x001F) === 31)
			{
					this.PPU_ReadWriteAddress &= 0xFFE0; // resetting the scroll
					this.PPU_ReadWriteAddress ^= 0x0400;
			}
			else
			{
					this.PPU_ReadWriteAddress++; // increment
			}
	}

	PPU_IncrementScrollY()
	{
			if (this.CopyV)
			{
					this.PPU_ReadWriteAddress = (this.PPU_Update2006Value_Temp & this.PPU_Update2006Value); // This isn't actually accurate. More research needed.
			}
			else
			{
					if ((this.PPU_ReadWriteAddress & 0x7000) !== 0x7000)
					{
							this.PPU_ReadWriteAddress += 0x1000;
							this.PPU_ReadWriteAddress &= 0xFFFF;
					}
					else
					{
							this.PPU_ReadWriteAddress &= 0x0FFF;
							let y = (this.PPU_ReadWriteAddress & 0x03E0) >> 5;
							if (y === 29)
							{
									y = 0; // reset the this.Y value and also flip some other bit in the 'v' register
									this.PPU_ReadWriteAddress ^= 0x0800;
							}
							else if (y === 31)
							{
									y = 0; // reset the this.Y value
							}
							else
							{
									y++; // increment the this.Y value
							}
							this.PPU_ReadWriteAddress = ((this.PPU_ReadWriteAddress & 0xFC1F) | (y << 5));
					}
			}
	}

	PPU_ResetXScroll()
	{
			// If a write to $2000 occurs during this ppu cycle, this.PPU_TempVRAMAddress will be the incorrect value!
			// The value of this.PPU_TempVRAMAddress will be corrected on the next ppu cycle, but it's already too late.
			// This is the "scanline bug" : https://www.nesdev.org/wiki/PPU_glitches#PPUCTRL
			// The bug is only visible if the nametable mirroring is vertical.
			this.PPU_ReadWriteAddress = ((this.PPU_ReadWriteAddress & 0b0111101111100000) | (this.PPU_TempVRAMAddress & 0b0000010000011111));
	}
	PPU_ResetYScroll()
	{
			// The exact same issue from this.PPU_ResetXScroll() can happen here too, except this corrupts an entire frame.
			// The bug is only visible if the nametable mirroring is horizontal.
			this.PPU_ReadWriteAddress = ((this.PPU_ReadWriteAddress & 0b0000010000011111) | (this.PPU_TempVRAMAddress & 0b0111101111100000));
	}

	DecayPPUDataBus()
	{
			let i = 0;
			while (i < this.PPUBusDecay.length)
			{
					if (this.PPUBusDecay[i] > 0)
					{
							this.PPUBusDecay[i]--;
							if(this.PPUBusDecay[i]===0)
							{
									this.PPUBus &= DecayBitmask[i];
							}
					}
					i++;
			}
	}
	static DecayBitmask = new Uint8Array([ 0xFE, 0xFD, 0xFB, 0xF7, 0xEF, 0xDF, 0xBF, 0x7F ]);

	// The object attribute memory DMA!
	OAMDMA_Aligned = false;
	OAMDMA_Halt = false;
	DMCDMA_Halt = false;
	OAM_InternalBus = 0;   // a data bus that's used for the OAM DMA
	OAMAddressBus = 0;   // the address bus of the OAM DMA

	// The DMAs (Direct Memory Accesses) Have "get" and "put" cycles.
	// they can also be "halted" in which case, it will always read instead of write.

	// the following functions,
	// OAMDMA_Get()    : Get cycles are reads
	// OAMDMA_Halted() : Halted gets and halted puts are both reads from the current address bus
	// OAMDMA_Put()    : Put cycles are writes to OAM.

	// DMCDMA_Get()    : Get cycles are reads
	// DMCDMA_Halted() : Halted gets and halted puts are both reads from the current address bus
	// DMCDMA_Put()    : Put cycles are writes to the DMC shifter.

	OAMDMA_Get()
	{
			this.OAMAddressBus = (this.DMAPage << 8 | this.DMAAddress);
			this.OAMDMA_Aligned = true;
			// the fetch happens regardless of halt
			this.OAM_InternalBus = this.Fetch(this.OAMAddressBus);
	}
	OAMDMA_Halted()
	{
			this.Fetch(this.addressBus); // if halted, just read from the current address bus.
	}

	OAMDMA_Put()
	{

			if (this.OAMDMA_Aligned) // if the DMA is aligned
			{
					this.Store(this.OAM_InternalBus, 0x2004); // write to this.OAM
					this.DMAAddress = (this.DMAAddress + 1) & 0xFF;
					if (this.DMAAddress === 0) // if we overflow the DMA address
					{
							this.DoOAMDMA = false; // we have completed the DMA.
							this.OAMDMA_Aligned = false;
							return;
					}
			}
			else // if this is an alignment cycle
			{
					this.Fetch(this.addressBus); // just read from the current address bus
			}

	}

	DMCDMA_Get()
	{
			// now reload the DMC buffer.
			this.APU_DMC_Buffer = this.Fetch(this.APU_DMC_AddressCounter);
			
			this.APU_DMC_AddressCounter = (this.APU_DMC_AddressCounter + 1) & 0xFFFF;
			if(this.APU_DMC_AddressCounter === 0)
			{
					this.APU_DMC_AddressCounter = 0x8000;
			}
			if (this.APU_DMC_BytesRemaining > 0)
			{
					// due to writes to $4015 setting the BytesRemaining to 0 if disabled, this could potentially underflow without the if statement.
					this.APU_DMC_BytesRemaining--;
			}

			if (this.APU_DMC_BytesRemaining === 0)
			{
					//reset sample

					if (!this.APU_DMC_Loop)
					{
							this.APU_Status_DMC = false;
							if (this.APU_DMC_EnableIRQ) // if the DMC should fire an IRQ when it completes...
							{
									this.IRQ_LevelDetector = true;
									this.APU_Status_DMCInterrupt = true;
							}
					}
					else
					{
							this.StartDMCSample();
					}
			}
			this.DoDMCDMA = false;
			this.OAMDMA_Aligned = false;
			this.CannotRunDMCDMARightNow = 2;

	}

	DMCDMA_Halted()
	{
			this.Fetch(this.addressBus);
	}
	DMCDMA_Put()
	{
			this.Fetch(this.addressBus);
	}

	// Typically in the last CPU cycle of an instruction, the console will check if the NMI edge detector or IRQ level detector is set. In which case, it's time to run an interrupt.
	// The timing on this is different for branch instructions, and the BRK instruction doesn't do this at all.
	PollInterrupts()
	{
			this.NMI_PreviousPinsSignal = this.NMI_PinsSignal;
			this.NMI_PinsSignal = this.NMILine;
			if (this.NMI_PinsSignal && !this.NMI_PreviousPinsSignal)
			{
					this.DoNMI = true;
			}
			this.DoIRQ = this.IRQLine && !this.flag_Interrupt;
	}

	PollInterrupts_CantDisableIRQ()
	{
			this.NMI_PreviousPinsSignal = this.NMI_PinsSignal;
			this.NMI_PinsSignal = this.NMILine;
			if (this.NMI_PinsSignal && !this.NMI_PreviousPinsSignal)
			{
					this.DoNMI = true;
			}
			if(!this.DoIRQ)
			{
					this.DoIRQ = this.IRQLine && !this.flag_Interrupt;
			}
	}

	_6502()
	{
			if ((this.DoDMCDMA && (this.APU_Status_DMC || this.APU_ImplicitAbortDMC4015) && this.CPU_Read) || (this.DoOAMDMA && this.CPU_Read)) // Are we running a DMA? Did it fail? Also some specific behavior can force a DMA to abort. Did that occur?
			{
					if (
							(this.opCode === 0x93 && this.operationCycle === 4) ||
							(this.opCode === 0x9B && this.operationCycle === 3) ||
							(this.opCode === 0x9C && this.operationCycle === 3) ||
							(this.opCode === 0x9E && this.operationCycle === 3) ||
							(this.opCode === 0x9F && this.operationCycle === 3)
							)
					{
							this.IgnoreH = true;
					}

					if (this.DoOAMDMA && this.FirstCycleOfOAMDMA) // interrupt suppression. (There's probably a better way to implement this) if this is the first cycle of the this.OAM DMA...
					{
							if (!(this.DoNMI || this.DoIRQ)) // and we are NOT running an NMI or IRQ
							{
									this.SuppressInterrupt = true; // Suppress one if it starts before the next instruction
							}
							this.FirstCycleOfOAMDMA = false; // disable this flag.
							if (!this.APU_PutCycle)
							{
									this.OAMDMA_Halt = true;
							}
					}

					if (this.APU_PutCycle) // even cycles are puts, odd cycles are gets.
					{
							// Put cycle (write)
							if (this.DoDMCDMA && this.DoOAMDMA) // if we're running both a DMC and this.OAM DMA.
							{
									if (this.DMCDMA_Halt && this.OAMDMA_Halt) // both halt cycles
									{
											this.OAMDMA_Halted();
									}
									else if (!this.OAMDMA_Halt && this.DMCDMA_Halt) // only DMC halted
									{
											this.OAMDMA_Put();
									}
									else if (this.OAMDMA_Halt && !this.DMCDMA_Halt) // only this.OAM halted
									{
											this.DMCDMA_Put(); // Can this logically ever happen?
									}
									else // none halted : this.OAM DMA has priority
									{
											this.OAMDMA_Put();
									}
							}
							else // only performing a single DMA
							{
									if (this.DoDMCDMA) // only running DMC DMA
									{
											if (this.DMCDMA_Halt)
											{
													this.DMCDMA_Halted();
											}
											else 
											{ 
													this.DMCDMA_Put(); 
											}
									}
									else // only running this.OAM DMA
									{
											if (this.OAMDMA_Halt)
											{ 
													this.OAMDMA_Halted();
											}
											else 
											{ 
													this.OAMDMA_Put(); 
											}
									}
							}
					}
					else
					{
							// Get cycle (read)
							if (this.DoDMCDMA && this.DoOAMDMA) // if we're running both a DMC and this.OAM DMA.
							{
									if (this.DMCDMA_Halt && this.OAMDMA_Halt) // both halt cycles
									{
											this.DMCDMA_Halted();
									}
									else if (!this.OAMDMA_Halt && this.DMCDMA_Halt) // only DMC halted
									{
											this.OAMDMA_Get();
									}
									else if (this.OAMDMA_Halt && !this.DMCDMA_Halt) // only this.OAM halted
									{
											this.DMCDMA_Get();
									}
									else // none halted : DMC DMA has priority
									{
											this.DMCDMA_Get();
									}
							}
							else
							{
									// only performing a single DMA
									if (this.DoDMCDMA) // only running DMC DMA
									{
											if (this.DMCDMA_Halt) 
											{ 
													this.DMCDMA_Halted(); 
											}
											else 
											{ 
													this.DMCDMA_Get(); 
											}
									}
									else // only running this.OAM DMA
									{
											if (this.OAMDMA_Halt) 
											{ 
													this.OAMDMA_Halted(); 
											}
											else 
											{ 
													this.OAMDMA_Get();
											}
									}
							}

							this.DMCDMA_Halt = false; // both halt cycles get cleared after a get cycle.
							this.OAMDMA_Halt = false;
					}

			}
			else if (this.operationCycle === 0) // We are not running any DMAs, and this is the first cycle of an instruction.
			{
					// cycle 0. fetch opcode:
					this.addressBus = this.programCounter;
					this.opCode = this.Fetch(this.addressBus); // this.Fetch the value at the program counter. This is the opcode.

					if (!this.SuppressInterrupt) // If we are not suppressing an interrupt, check if any interrupts are occuring.
					{
							if (this.DoNMI) // If an NMI is occuring,
							{
									this.opCode = 0; // replace the opcode with 0. (this.A BRK, which has modified behavior for NMIs)
							}
							else if (this.DoIRQ) // If an IRQ is occuring,
							{
									this.opCode = 0; // replace the opcode with 0. (this.A BRK, which has modified behavior for IRQs)
							}
							else if (this.DoReset) // If a RESET is occuring,
							{
									this.opCode = 0; // replace the opcode with 0. (this.A BRK, which has modified behavior for RESETs)
							}
							else if (this.opCode === 0) // Otherwise, if an interrupt is not occuring, and the opcode is already 0
							{
									this.DoBRK = true; // There's also specific behavior for the BRK instruction if it is in-fact a BRK, and not an interrupt.
							}
					}
					else if (this.opCode === 0) // If we are suppressing an interrupt, but we're still running a BRK isntruction
					{
							this.DoBRK = true; // still set this flag.
					}

					if (this.Logging) // For debugging only.
					{
							Debug(); // This is where the tracelogger occurs.
					}
					if ((!this.DoNMI && !this.DoIRQ && !this.DoReset) || this.SuppressInterrupt) // If we aren't running any interrupts...
					{
							this.programCounter = (this.programCounter + 1) & 0xFFFF; // the PC is incremented to the next address
							this.addressBus = this.programCounter;
					}

					this.operationCycle++; // increment this for use in the following CPU cycle.
					this.SuppressInterrupt = false; // Disable this flag.

			}
			else
			{
					// a really big switch statement.
					// depending on the value of the opcode, different behavior will take place.
					// this is how instructions work.

					// All intructions are labeled. If it's an undocumented opcode, I also write "***" next to it.

					switch (this.opCode)
					{
							case 0x00: //BRK
									switch (this.operationCycle)
									{
											case 1:
													if (!this.DoBRK)
													{
															this.addressBus = this.programCounter;
															this.Fetch(this.addressBus); //dummy fetch without incrementing PC.
													}
													else
													{
															this.GetImmediate(); //dummy fetch and PC increment
													}
													break;
											case 2:
													if (!this.DoReset)
													{
															this.Push((this.programCounter >> 8));
													}
													else
													{
															this.ResetReadPush();
													}
													break;
											case 3:
													if (!this.DoReset)
													{
															this.Push((this.programCounter) & 0xFF);
													}
													else
													{
															this.ResetReadPush();
													}
													break;
											case 4:
													if (!this.DoReset)
													{
															this.status = this.flag_Carry ? 0x01 : 0;
															this.status |= this.flag_Zero ? 0x02 : 0;
															this.status |= this.flag_Interrupt ? 0x04 : 0;
															this.status |= this.flag_Decimal ? 0x08 : 0;
															this.status |= this.DoBRK ? 0x10 : 0;
															this.status |= 0x20;
															this.status |= this.flag_Overflow ? 0x40 : 0;
															this.status |= this.flag_Negative ? 0x80 : 0;
															this.Push(this.status);
													}
													else
													{
															this.ResetReadPush();
													}
													this.PollInterrupts(); // check for NMI?
													break;
											case 5:
													if (this.DoNMI)
													{
															this.programCounter = ((this.programCounter & 0xFF00) | (this.Fetch(0xFFFA)));
													}
													else if (this.DoReset)
													{
															this.programCounter = ((this.programCounter & 0xFF00) | (this.Fetch(0xFFFC)));
													}
													else
													{
															this.programCounter = ((this.programCounter & 0xFF00) | (this.Fetch(0xFFFE)));
													}
													this.InterruptHijackedByIRQ = this.DoIRQ;

													break;
											case 6:
													if (this.DoNMI)
													{
															this.programCounter = ((this.programCounter & 0xFF) | (this.Fetch(0xFFFB) << 8));
													}
													else if (this.DoReset)
													{
															this.programCounter = ((this.programCounter & 0xFF) | (this.Fetch(0xFFFD) << 8));
													}
													else
													{
															this.programCounter = ((this.programCounter & 0xFF) | (this.Fetch(0xFFFF) << 8));
													}

													this.operationComplete = true; // notably, BRK does not check the NMI edge detector at the end of the instruction
													this.DoReset = false;

													this.DoNMI = false;
													this.DoIRQ = false;
													this.IRQLine = false;

													this.SuppressInterrupt = true;

													this.DoBRK = false;

													this.flag_Interrupt = true;



													break;
									}
									break;

							case 0x01: //(ORA, this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_ORA(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x02: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x03: //(SLO, this.X)  *** 
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // write back to the address
													this.Store(this.dl, this.addressBus);
													break; // perform the operation
											case 7:
													this.PollInterrupts();
													this.Op_SLO(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x04: //DOP ***
									if (this.operationCycle === 1)
									{
											this.GetAddressZeroPage();
									}
									else
									{
											// read from address
											this.PollInterrupts();
											this.Fetch(this.addressBus);
											this.operationComplete = true;
									}
									break;

							case 0x05: //ORA zp
									if (this.operationCycle === 1)
									{
											this.GetAddressZeroPage();
									}
									else
									{
											// read from address
											this.PollInterrupts();
											this.Op_ORA(this.Fetch(this.addressBus));
											this.operationComplete = true;
									}
									break;

							case 0x06: //ASL, zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_ASL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x07: //SLO zp  *** 
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_SLO(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x08: //PHP

									if (this.operationCycle === 1)
									{
											//dummy fetch
											this.Fetch(this.programCounter);
									}
									else
									{
											this.PollInterrupts();
											// read from address
											this.status = this.flag_Carry ? 0x01 : 0;
											this.status += this.flag_Zero ? 0x02 : 0;
											this.status += this.flag_Interrupt ? 0x04 : 0;
											this.status += this.flag_Decimal ? 0x08 : 0;
											this.status += 0x10; //always set in PHP
											this.status += 0x20; //always set in PHP
											this.status += this.flag_Overflow ? 0x40 : 0;
											this.status += this.flag_Negative ? 0x80 : 0;
											this.Push(this.status);
											this.operationComplete = true;
									}
									break;

							case 0x09: //ORA Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_ORA(this.dl);
									this.operationComplete = true;
									break;

							case 0x0A: //ASL this.A
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.Op_ASL_A();
									this.operationComplete = true;
									break;

							case 0x0B: //ANC Imm ***
									this.PollInterrupts();
									this.GetImmediate();
									this.A = (this.A & this.dl);
									this.flag_Carry = this.A >= 0x80;
									this.flag_Zero = this.A === 0;
									this.flag_Negative = this.A >= 0x80;
									this.operationComplete = true;

									break;

							case 0x0C: //TOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x0D: //ORA Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_ORA(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x0E: //ASL, Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_ASL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x0F: //SLO Abs  *** 
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_SLO(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x10: //BPL
									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (this.flag_Negative)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x11: //(ORA) this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_ORA(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x12: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x13: //(SLO) this.Y  *** 
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													break;
											case 5: // dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 7: // read from address
													this.PollInterrupts();
													this.Op_SLO(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x14: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x15: //ORA zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_ORA(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x16: //ASL, zp this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_ASL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x17: //SLO zp this.X *** 
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_SLO(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x18: //CLC
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.flag_Carry = false;
									this.operationComplete = true;
									break;

							case 0x19: //ORA Abs, this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_ORA(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x1A: //NOP ***
									this.PollInterrupts();
									this.addressBus = this.programCounter; this.Fetch(this.addressBus);
									this.operationComplete = true;
									break;

							case 0x1B: //SLO Abs this.Y *** 
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_SLO(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x1C: //TOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x1D: //ORA Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_ORA(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x1E: //ASL, Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_ASL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;


							case 0x1F: //SLO Abs, this.X *** 
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_SLO(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x20: //JSR

									switch (this.operationCycle)
									{
											// this is pretty cursed, though according to visual6502, this is apparently what happens.
											case 1: // fetch the byte that will be PC low
													this.addressBus = this.programCounter;
													this.dl = this.Fetch(this.addressBus);
													this.programCounter = (this.programCounter + 1) & 0xFFFF;
													break;
											case 2: // transfer stack pointer to address bus, and alu to stack pointer. I'm just reusing `this.dl` here, but this instruction actually uses the Arithmetic Logic Unit for this.
													this.addressBus = (0x100 | this.stackPointer);
													this.stackPointer = this.dl;
													this.CPU_Read = false;
													this.Fetch(this.addressBus); // dummy read
													break;
											case 3: // push PC high to stack via address bus
													this.Store(((this.programCounter & 0xFF00) >> 8), this.addressBus);
													this.addressBus = (((this.addressBus - 1) & 0xFF) | 0x100);
													break;
											case 4: // push PC low to stack via address bus
													this.Store((this.programCounter & 0xFF), this.addressBus);
													this.addressBus = (((this.addressBus - 1) & 0xFF) | 0x100);
													this.specialBus = (this.addressBus & 0xFF);
													this.CPU_Read = true;
													break;
											case 5: // fetch PC High, transfer stack pointer to PC low, address bus to stack pointer.
													this.PollInterrupts();
													this.addressBus = this.programCounter;
													this.programCounter = ((this.Fetch(this.addressBus) << 8) | this.stackPointer);
													this.stackPointer = this.specialBus;
													this.operationComplete = true;
													break;
									}
									break;

							case 0x21: //(AND, this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_AND(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x22: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x23: //(RLA, this.X)  ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // write back to the address
													this.Store(this.dl, this.addressBus);
													break; // perform the operation
											case 7:
													this.PollInterrupts();
													this.Op_RLA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x24: //BIT Zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.dl = this.Fetch(this.addressBus);
													this.flag_Zero = (this.A & this.dl) === 0;
													this.flag_Negative = (this.dl & 0x80) !== 0;
													this.flag_Overflow = (this.dl & 0x40) !== 0;
													this.operationComplete = true;
													break;
									}
									break;

							case 0x25: //AND zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Op_AND(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x26: //ROL zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_ROL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x27: //RLA zp  ***
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_RLA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x28: //PLP
									switch (this.operationCycle)
									{
											case 1: //dummy fetch
													this.addressBus = this.programCounter;
													this.Fetch(this.addressBus);
													break;
											case 2: //increment S
													this.addressBus = (0x100 + this.stackPointer);
													this.Fetch(this.addressBus); // dummy read
													this.stackPointer = (this.stackPointer + 1) & 0xFF;
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.addressBus = (0x100 + this.stackPointer);
													this.status = this.Fetch(this.addressBus);
													this.flag_Carry = (this.status & 1) === 1;
													this.flag_Zero = ((this.status & 0x02) >> 1) === 1;
													this.flag_Interrupt = ((this.status & 0x04) >> 2) === 1;
													this.flag_Decimal = ((this.status & 0x08) >> 3) === 1;
													this.flag_B = false;// ((this.status & 0x10) >> 4) === 1;
													this.flag_T = true;// ((this.status & 0x20) >> 5) === 1;
													this.flag_Overflow = ((this.status & 0x40) >> 6) === 1;
													this.flag_Negative = ((this.status & 0x80) >> 7) === 1;
													this.operationComplete = true;
													break;
									}
									break;

							case 0x29: //AND Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_AND(this.dl);
									this.operationComplete = true;
									break;

							case 0x2A: //ROL this.A
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.Op_ROL_A();
									this.operationComplete = true;
									break;

							case 0x2B: //ANC Imm *** (same as 0x0B)
									this.PollInterrupts();
									this.GetImmediate();
									this.A = (this.A & this.dl);
									this.flag_Carry = this.A >= 0x80;
									this.flag_Zero = this.A === 0;
									this.flag_Negative = this.A >= 0x80;
									this.operationComplete = true;

									break;

							case 0x2C: //BIT Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.dl = this.Fetch(this.addressBus);
													this.flag_Zero = (this.A & this.dl) === 0;
													this.flag_Negative = (this.dl & 0x80) !== 0;
													this.flag_Overflow = (this.dl & 0x40) !== 0;
													this.operationComplete = true;
													break;
									}
									break;

							case 0x2D: //AND Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_AND(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x2E: //ROL Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_ROL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x2F: //RLA Abs ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_RLA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x30: //BMI
									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (!this.flag_Negative)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x31: //(AND), this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_AND(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x32: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;
							case 0x33: //(RLA), this.Y  ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													break;
											case 5: // dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 7: // read from address
													this.PollInterrupts();
													this.Op_RLA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x34: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x35: //AND zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_AND(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x36: //ROL zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_ROL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x37: //RLA zp, this.X  ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_RLA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x38: //SEC
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.flag_Carry = true;
									this.operationComplete = true;
									break;

							case 0x39: //AND Abs, this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_AND(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x3A: //NOP ***
									this.PollInterrupts();
									this.addressBus = this.programCounter; this.Fetch(this.addressBus);
									this.operationComplete = true;
									break;

							case 0x3B: //RLA Abs, this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_RLA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x3C: //TOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x3D: //AND Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_AND(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x3E: //ROL Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_ROL(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x3F: //RLA Abs, this.X ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_RLA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x40: //RTI
									switch (this.operationCycle)
									{
											case 1:
													this.GetImmediate();
													break;
											case 2:
													this.addressBus = (0x100 | this.stackPointer);
													this.Fetch(this.addressBus);
													this.addressBus = (((this.addressBus + 1) & 0xFF) | 0x100);
													break;
											case 3:
													this.status = this.Fetch(this.addressBus);
													this.flag_Carry = (this.status & 1) !== 0;
													this.flag_Zero = (this.status & 0x02) !== 0;
													this.flag_Interrupt = (this.status & 0x04) !== 0;
													this.flag_Decimal = (this.status & 0x08) !== 0;
													this.flag_B = false;// ((this.status & 0x10) !== 0) === 1;
													this.flag_T = true;// ((this.status & 0x20) !== 0) === 1;
													this.flag_Overflow = (this.status & 0x40) !== 0;
													this.flag_Negative = (this.status & 0x80) !== 0;

													this.addressBus = (((this.addressBus + 1) & 0xFF) | 0x100);
													break;
											case 4:
													this.dl = this.Fetch(this.addressBus);
													this.programCounter = ((this.programCounter & 0xFF00) | this.dl); //technically not accurate, as this happens in cycle 5
													this.addressBus = (((this.addressBus + 1) & 0xFF) | 0x100);
													break;
											case 5:
													this.PollInterrupts();
													this.dl = this.Fetch(this.addressBus);
													this.programCounter = ((this.programCounter & 0xFF) | (this.dl << 8));
													this.stackPointer = (this.addressBus & 0xFF);
													this.operationComplete = true;
													break;

									}
									break;

							case 0x41: //(EOR this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_EOR(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x42: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x43: //(SRE, this.X) ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // write back to the address
													this.Store(this.dl, this.addressBus);
													break; // perform the operation
											case 7:
													this.PollInterrupts();
													this.Op_SRE(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x44: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x45: //EOR zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Op_EOR(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x46: //LSR zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_LSR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x47: //SRE zp ***

									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_SRE(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x48: //PHA

									switch (this.operationCycle)
									{
											case 1: //dummy fetch
													this.dl = this.Fetch(this.addressBus);
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Push(this.A);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x49: //EOR Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_EOR(this.dl);
									this.operationComplete = true;
									break;

							case 0x4A: //LSR this.A
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.Op_LSR_A();
									this.operationComplete = true;
									break;

							case 0x4B: //ASR Imm ***
									this.PollInterrupts();
									this.GetImmediate();
									this.A = (this.A & this.dl);
									this.Op_LSR_A();
									this.operationComplete = true;
									break;

							case 0x4C: //JMP
									if (this.operationCycle === 1)
									{
											this.GetAddressAbsolute();

									}
									else
									{
											this.PollInterrupts();
											this.GetAddressAbsolute();
											this.programCounter = this.addressBus;
											this.operationComplete = true;
									}
									break;

							case 0x4D: //EOR Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_EOR(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x4E: //LSR abs

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_LSR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x4F: //SRE abs ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_SRE(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x50: //BVC

									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (this.flag_Overflow)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x51: //(EOR), this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_EOR(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x52: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x53: //(SRE) this.Y ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													break;
											case 5: // dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 7: // read from address
													this.PollInterrupts();
													this.Op_SRE(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x54: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x55: //EOR zp , this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_EOR(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x56: //LSR zp, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_LSR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x57: //SRE zp this.X ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_SRE(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x58: //CLI
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.flag_Interrupt = false;
									this.operationComplete = true;
									break;

							case 0x59: //EOR Abs this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_EOR(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x5A: //NOP ***
									this.PollInterrupts();
									this.addressBus = this.programCounter; this.Fetch(this.addressBus);
									this.operationComplete = true;
									break;

							case 0x5B: //SRE abs, this.Y ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_SRE(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x5C: //TOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x5D: //EOR Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_EOR(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x5E: //LSR abs, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_LSR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x5F: //SRE abs, this.X ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_SRE(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x60: //RTS


									switch (this.operationCycle)
									{
											case 1:
													this.GetImmediate();
													break;
											case 2:
													this.addressBus = (0x100 | this.stackPointer);
													this.Fetch(this.addressBus);
													this.addressBus = (((this.addressBus + 1) & 0xFF) | 0x100);
													break;
											case 3:
													this.dl = this.Fetch(this.addressBus);
													this.programCounter = ((this.programCounter & 0xFF00) | this.dl); //technically not accurate, as this happens in cycle 5
													this.addressBus = (((this.addressBus + 1) & 0xFF) | 0x100);
													break;
											case 4:
													this.dl = this.Fetch(this.addressBus);
													this.programCounter = ((this.programCounter & 0xFF) | (this.dl << 8));
													break;
											case 5:
													this.PollInterrupts();
													this.stackPointer = (this.addressBus & 0xFF);
													this.GetImmediate();
													this.operationComplete = true;
													break;

									}
									break;

							case 0x61: //(ADC this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_ADC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x62: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x63: //(RRA this.X) ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // write back to the address
													this.Store(this.dl, this.addressBus);
													break; // perform the operation
											case 7:
													this.PollInterrupts();
													this.Op_RRA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x64: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x65: //ADC Zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Op_ADC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x66: //ROR zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_ROR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x67: //RRA zp ***
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_RRA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;
							case 0x68: //PLA

									switch (this.operationCycle)
									{
											case 1: //dummy fetch
													this.addressBus = this.programCounter;
													this.Fetch(this.addressBus);
													break;
											case 2: // read from address
													this.addressBus = (0x100 | (this.stackPointer));
													this.Fetch(this.addressBus); // dummy read
													this.stackPointer = (this.stackPointer + 1) & 0xFF;
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.addressBus = (0x100 | (this.stackPointer));
													this.A = this.Fetch(this.addressBus);
													this.flag_Zero = this.A === 0;
													this.flag_Negative = this.A >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0x69: //ADC Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_ADC(this.dl);
									this.operationComplete = true;
									break;

							case 0x6A: //ROR this.A
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.Op_ROR_A();
									this.operationComplete = true;
									break;

							case 0x6B: // ARR ***
									this.PollInterrupts();
									this.GetImmediate();
									this.A = (this.A & this.dl);
									this.Op_ROR_A();
									this.flag_Zero = this.A === 0;
									this.flag_Carry = ((this.A & 0x40) >> 6) === 1;
									this.flag_Overflow = (((this.A & 0x20) >> 5) ^ ((this.A & 0x40) >> 6)) === 1;
									this.flag_Negative = this.A >= 0x80;
									this.operationComplete = true;
									break;

							case 0x6C: //JMP (indirect)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3:
													this.specialBus = this.Fetch(this.addressBus); // Okay, this doesn't actually use the SB register. I'm just re-using that variable.
													break;
											case 4:
													this.PollInterrupts();
													this.dl = this.Fetch(((this.addressBus & 0xFF00) | ((this.addressBus + 1) & 0xFF)));
													this.programCounter = ((this.dl << 8) | this.specialBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x6D: //ADC Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_ADC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x6E: //ROR Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_ROR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x6F: //RRA Abs ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_RRA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x70: //BVS
									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (!this.flag_Overflow)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x71: //(ADC), this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_ADC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x72: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x73: //(RRA) this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													break;
											case 5: // dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 7: // read from address
													this.PollInterrupts();
													this.Op_RRA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x74: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x75: //ADC Zp, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_ADC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x76: //ROR zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_ROR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x77: //RRA zp this.X ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_RRA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x78: //SEI
									this.PollInterrupts();
									this.Fetch(this.addressBus); // dummy read
									this.flag_Interrupt = true;
									this.operationComplete = true;
									break;
							case 0x79: //ADC Abs, this.Y

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_ADC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x7A: //NOP ***
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus);
									this.operationComplete = true;
									break;

							case 0x7B: //RRA Abs, this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_RRA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x7C: //TOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x7D: //ADC Abs, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_ADC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x7E: //ROR Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_ROR(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x7F: //RRA Abs, this.X ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_RRA(this.dl, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x80: //DOP ***
									this.PollInterrupts();
									this.GetImmediate();
									this.operationComplete = true;
									break;


							case 0x81: //(STA this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Store(this.A, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x82: //DOP ***
									this.PollInterrupts();
									this.GetImmediate();
									this.operationComplete = true;
									break;

							case 0x83: //(SAX this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Store((this.A & this.X), this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x84: //STY zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													this.CPU_Read = false;
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Store(this.Y, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x85: //STA zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													this.CPU_Read = false;
													break;
											case 2:
													this.PollInterrupts();
													this.Store(this.A, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x86: //STX zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													this.CPU_Read = false;
													break;
											case 2:
													this.PollInterrupts();
													this.Store(this.X, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;
							case 0x87: //AAX zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													this.CPU_Read = false;
													break;
											case 2:
													this.PollInterrupts();
													this.Store((this.A & this.X), this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x88: //DEY

									this.PollInterrupts();
									this.Y = (this.Y - 1) & 0xFF;
									this.flag_Zero = this.Y === 0;
									this.flag_Negative = this.Y >= 0x80;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.operationComplete = true;

									break;

							case 0x89: //DOP ***
									this.PollInterrupts();
									this.GetImmediate();
									this.operationComplete = true;

									break;

							case 0x8A: //TXA
									this.PollInterrupts();
									this.A = this.X;
									this.flag_Zero = this.A === 0;
									this.flag_Negative = this.A >= 0x80;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.operationComplete = true;
									break;

							case 0x8B: //ANE
									this.PollInterrupts();
									this.GetImmediate();
									//this.A = (((this.A | 0xFF) & this.X) & temp); 
									// Magic = FF
									this.A = ((this.A | 0xFF) & this.X & this.dl); // 0xEE is also known as "MAGIC", and can supposedly be different depending on the CPU's temperature.
									this.flag_Zero = this.A === 0;
									this.flag_Negative = this.A >= 0x80;
									this.operationComplete = true;
									break;

							case 0x8C: //STY Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Store(this.Y, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x8D: //STA Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Store(this.A, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x8E: //STX Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3:
													this.PollInterrupts();
													this.Store(this.X, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x8F: //AAX Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Store((this.A & this.X), this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x90: //BCC
									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (this.flag_Carry)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0x91: //(STA), this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:
													this.PollInterrupts();
													this.Store(this.A, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x92: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0x93: // (SHA) this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													if (this.operationCycle === 4) {
															this.CPU_Read = false; }
													break;
											case 5: // read from address
													this.PollInterrupts();
													if ((this.temporaryAddress & 0xFF00) !== (this.addressBus & 0xFF00))
													{
															// if adding this.Y to the target address crossed a page boundary, this opcode has "gone unstable"
															this.addressBus = ((this.addressBus & 0xFF) | ((this.addressBus >> 8) /*& this.A*/ & this.X) << 8); // Alternate SHA behavior. The this.A register isn't used here!
													}
													// pd = the high byte of the target address + 1
													if(this.IgnoreH)
													{
															this.H = 0xFF;
													}
													this.Store((this.A & (this.X | 0xF5) & this.H), this.addressBus); // Alternate SHA behavior. this.X is ORed with a magic number. On my console, it's $F5 for a few hours, then it flickers from $F5 and $FD.
													this.operationComplete = true;
													break;
									}


									break;

							case 0x94: //STY zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Store(this.Y, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x95: //STA zp, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Store(this.A, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x96: //STX zp, this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffY();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Store(this.X, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x97: //AAX zp, this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffY();
													if (this.operationCycle === 2) { this.CPU_Read = false; }
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Store((this.A & this.X), this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x98: //TYA
									this.PollInterrupts();
									this.A = this.Y;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Zero = this.A === 0;
									this.flag_Negative = this.A >= 0x80;
									this.operationComplete = true;

									break;

							case 0x99: //STA Abs, this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 3) { this.CPU_Read = false; }
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Store(this.A, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x9A: //TXS
									this.PollInterrupts();
									this.stackPointer = this.X;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.operationComplete = true;
									break;


							case 0x9B: //SHS, Abs this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 3) { this.CPU_Read = false; }
													break;
											case 4: // read from address
													this.PollInterrupts();
													if ((this.temporaryAddress & 0xFF00) !== (this.addressBus & 0xFF00))
													{
															// if adding this.Y to the target address crossed a page boundary, this opcode has "gone unstable"
															this.addressBus = ((this.addressBus & 0xFF) | ((this.addressBus >> 8) /*& this.A*/ & this.X) << 8); // Alternate SHA behavior. The this.A register isn't used here!
													}
													// pd = the high byte of the target address + 1
													this.stackPointer = (this.A & this.X);
													if (this.IgnoreH)
													{
															this.H = 0xFF;
													}
													this.Store((this.A & (this.X | 0xF5) & this.H), this.addressBus); // Alternate SHS behavior. this.X is ORed with a magic number. On my console, it's $F5 for a few hours, then it flickers from $F5 and $FD.
													this.operationComplete = true;
													break;
									}
									break;

							case 0x9C: //SHY Abs, this.X ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 3) { this.CPU_Read = false; }
													break;
											case 4:
													this.PollInterrupts();
													if ((this.temporaryAddress & 0xFF00) !== (this.addressBus & 0xFF00))
													{
															// if adding this.X to the target address crossed a page boundary, this opcode has "gone unstable"
															this.addressBus = ((this.addressBus & 0xFF) | ((this.addressBus >> 8) & this.Y) << 8);
													}
													if (this.IgnoreH)
													{
															this.H = 0xFF;
													}
													this.Store((this.Y & this.H), this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x9D: //STA Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 3) { this.CPU_Read = false; }
													break;
											case 4:
													this.PollInterrupts();
													this.Store(this.A, this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x9E: // SHX Abs, this.Y***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 3) { this.CPU_Read = false; }
													break;
											case 4:
													this.PollInterrupts();
													// Not even close to what the documentation says this instruction does.
													if ((this.temporaryAddress & 0xFF00) !== (this.addressBus & 0xFF00))
													{
															// if adding this.Y to the target address crossed a page boundary, this opcode has "gone unstable"
															this.addressBus = ((this.addressBus & 0xFF) | ((this.addressBus >> 8) & this.X) << 8);
													}
													if (this.IgnoreH)
													{
															this.H = 0xFF;
													}
													this.Store((this.X & this.H), this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0x9F: // SHA Abs, this.Y***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 3) { this.CPU_Read = false; }
													break;
											case 4: // read from address
													this.PollInterrupts();
													if ((this.temporaryAddress & 0xFF00) !== (this.addressBus & 0xFF00))
													{
															// if adding this.Y to the target address crossed a page boundary, this opcode has "gone unstable"
															this.addressBus = ((this.addressBus & 0xFF) | ((this.addressBus >> 8) /*& this.A*/ & this.X) << 8); // Alternate SHA behavior. The this.A register isn't used here!
													}
													if (this.IgnoreH)
													{
															this.H = 0xFF;
													}
													this.Store((this.A & (this.X | 0xF5) & this.H), this.addressBus); // Alternate SHA behavior. this.X is ORed with a magic number. On my console, it's $F5 for a few hours, then it flickers from $F5 and $FD.
													this.operationComplete = true;
													break;
									}
									break;

							case 0xA0: //LDY imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Y = this.dl;
									this.flag_Zero = this.Y === 0;
									this.flag_Negative = this.Y >= 0x80;
									this.operationComplete = true;

									break;

							case 0xA1: //(LDA, this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.flag_Zero = this.A === 0;
													this.flag_Negative = this.A >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xA2: //LDX imm
									this.PollInterrupts();
									this.GetImmediate();
									this.X = this.dl;
									this.flag_Zero = this.X === 0;
									this.flag_Negative = this.X >= 0x80;
									this.operationComplete = true;

									break;

							case 0xA3: //(LAX, this.X) ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5:
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.X = this.A;
													this.flag_Zero = this.X === 0;
													this.flag_Negative = this.X >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xA4: //LDY zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Y = this.Fetch(this.addressBus);
													this.flag_Zero = this.Y === 0;
													this.flag_Negative = this.Y >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xA5: //LDA zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.flag_Zero = this.A === 0;
													this.flag_Negative = this.A >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xA6: //LDX zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.X = this.Fetch(this.addressBus);
													this.flag_Zero = this.X === 0;
													this.flag_Negative = this.X >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xA7: //LAX zp ***
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.X = this.A;
													this.flag_Zero = this.X === 0;
													this.flag_Negative = this.X >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xA8: //TAY
									this.PollInterrupts();
									this.Y = this.A;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Zero = this.A === 0;
									this.flag_Negative = this.Y >= 0x80;
									this.operationComplete = true;
									break;

							case 0xA9: //LDA Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.A = this.dl;
									this.flag_Zero = this.A === 0;
									this.flag_Negative = this.A >= 0x80;
									this.operationComplete = true;
									break;

							case 0xAA: //TAX
									this.PollInterrupts();
									this.X = this.A;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Zero = this.X === 0;
									this.flag_Negative = this.X >= 0x80;
									this.operationComplete = true;
									break;

							case 0xAB: //LXA ***
									this.PollInterrupts();
									this.GetImmediate();
									this.A = ((this.A | 0xFF) & this.dl); // 0xEE is also known as "MAGIC", and can supposedly be different depending on the CPU's temperature.
									this.X = this.A;  // this instruction is basically XAA but using LAX behavior, so this.X is also affected..
									this.flag_Negative = this.X >= 0x80;
									this.flag_Zero = this.X === 0x00;
									this.operationComplete = true;
									break;

							case 0xAC: //LDY Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Y = this.Fetch(this.addressBus);
													this.flag_Negative = this.Y >= 0x80;
													this.flag_Zero = this.Y === 0x00;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xAD: //LDA Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.flag_Negative = this.A >= 0x80;
													this.flag_Zero = this.A === 0x00;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xAE: //LDX Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.X = this.Fetch(this.addressBus);
													this.flag_Negative = this.X >= 0x80;
													this.flag_Zero = this.X === 0x00;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xAF: //LAX Abs ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.X = this.A;
													this.flag_Negative = this.X >= 0x80;
													this.flag_Zero = this.X === 0x00;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xB0: //BCS
									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (!this.flag_Carry)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xB1: //(LDA), this.Y

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5:
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.flag_Zero = this.A === 0;
													this.flag_Negative = this.A >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xB2: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0xB3: //(LAX), this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.X = this.A;
													this.flag_Zero = this.X === 0;
													this.flag_Negative = this.X >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;
							case 0xB4: //LDY zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Y = this.Fetch(this.addressBus);
													this.flag_Zero = this.Y === 0;
													this.flag_Negative = this.Y >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xB5: //LDA zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.flag_Zero = this.A === 0;
													this.flag_Negative = this.A >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xB6: //LDX zp,  this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffY();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.X = this.Fetch(this.addressBus);
													this.flag_Zero = this.X === 0;
													this.flag_Negative = this.X >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xB7: //LAX zp, this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffY();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.X = this.A;
													this.flag_Zero = this.X === 0;
													this.flag_Negative = this.X >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xB8: //CLV
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Overflow = false;
									this.operationComplete = true;
									break;

							case 0xB9: //LDA abs , this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.flag_Zero = this.A === 0;
													this.flag_Negative = this.A >= 0x80;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xBA: //TSX

									this.PollInterrupts();
									this.X = this.stackPointer;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Negative = this.X >= 0x80;
									this.flag_Zero = this.X === 0;
									this.operationComplete = true;
									break;

							case 0xBB: //LAE Abs, this.Y***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.dl = this.Fetch(this.addressBus);
													this.A = (this.dl & this.stackPointer);
													this.X = (this.dl & this.stackPointer);
													this.stackPointer = (this.dl & this.stackPointer);
													this.flag_Negative = this.X >= 0x80;
													this.flag_Zero = this.X === 0;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xBC: //LDY abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Y = this.Fetch(this.addressBus);
													this.flag_Negative = this.Y >= 0x80;
													this.flag_Zero = this.Y === 0;
													this.operationComplete = true;
													break;
									}
									break;


							case 0xBD: //LDA abs, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.flag_Negative = this.A >= 0x80;
													this.flag_Zero = this.A === 0;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xBE: //LDX abs , this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.X = this.Fetch(this.addressBus);
													this.flag_Negative = this.X >= 0x80;
													this.flag_Zero = this.X === 0;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xBF: //LAX Abs, this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.A = this.Fetch(this.addressBus);
													this.X = this.A;
													this.flag_Negative = this.X >= 0x80;
													this.flag_Zero = this.X === 0;
													this.operationComplete = true;
													break;
									}
									break;

							case 0xC0: //CPY Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_CPY(this.dl);
									this.operationComplete = true;

									break;

							case 0xC1: //(CMP this.X),
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_CMP(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xC2: //DOP ***
									this.PollInterrupts();
									this.GetImmediate();
									this.operationComplete = true;

									break;

							case 0xC3: //(DCP, this.X) ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // write back to the address
													this.Store(this.dl, this.addressBus);
													break; // perform the operation
											case 7:
													this.PollInterrupts();
													this.dl = (this.dl - 1) & 0xFF;
													this.Store(this.dl, this.addressBus);
													this.Op_CMP(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xC4: //CPY zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Op_CPY(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xC5: //CMP zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Op_CMP(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xC6: //DEC zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2:
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3:
													this.Store(this.dl, this.addressBus); //dummy write
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xC7: //DCP zp ***
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2:
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3:
													this.Store(this.dl, this.addressBus); //dummy write
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.Op_CMP(this.dl);
													this.operationComplete = true;
													break;
									}
									break;


							case 0xC8: //INY
									this.PollInterrupts();
									this.Y = (this.Y + 1) & 0xFF;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Zero = this.Y === 0;
									this.flag_Negative = this.Y >= 0x80;
									this.operationComplete = true;
									break;

							case 0xC9: //CMP Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_CMP(this.dl);
									this.operationComplete = true;
									break;

							case 0xCA: //DEX
									this.PollInterrupts();
									this.X = (this.X - 1) & 0xFF;
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Zero = this.X === 0;
									this.flag_Negative = this.X >= 0x80;
									this.operationComplete = true;

									break;

							case 0xCB: // AXS ***
									this.PollInterrupts();
									this.GetImmediate();
									this.X = (this.X & this.A);
									this.flag_Carry = this.X >= this.dl;
									this.X -= this.dl;
									this.X &= 0xFF;
									this.flag_Zero = this.X === 0;
									this.flag_Negative = (this.X >= 0x80);

									this.operationComplete = true;
									break;


							case 0xCC: //CPY Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_CPY(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xCD: //CMP Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_CMP(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xCE: //DEC Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3:
													// dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4:
													// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5: // write
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xCF: //DCP Abs ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3:
													// dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4:
													// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5: // write
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.Op_CMP(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD0: //BNE
									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (this.flag_Zero)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD1: //(CMP), this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_CMP(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD2: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0xD3: //(DCP) this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													break;
											case 5: // dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 7: // read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.Op_CMP(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD4: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD5: //CMP zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_CMP(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD6: //DEC zp, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3:
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4:
													this.Store(this.dl, this.addressBus); //dummy write
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD7: //DCP Zp this.X ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3:
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4:
													this.Store(this.dl, this.addressBus); //dummy write
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.Op_CMP(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xD8: //CLD
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Decimal = false;
									this.operationComplete = true;

									break;
							case 0xD9: //CMP abs, this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_CMP(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xDA: //NOP ***
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.operationComplete = true;
									break;

							case 0xDB: //DCP Abs this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.Op_CMP(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xDC: //TOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xDD: //CMP abs, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_CMP(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xDE: //DEC Abs this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xDF: //DCP Abs this.X ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_DEC(this.addressBus);
													this.Op_CMP(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xE0: //CPX Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_CPX(this.dl);
									this.operationComplete = true;
									break;

							case 0xE1: //(SBC this.X)
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_SBC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xE2: //DOP ***
									this.PollInterrupts();
									this.GetImmediate();
									this.operationComplete = true;
									break;

							case 0xE3: //(ISC, this.X) ***

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffX();
													break;
											case 5: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // write back to the address
													this.Store(this.dl, this.addressBus);
													break; // perform the operation
											case 7:
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.Op_SBC(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xE4: //CPX zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Op_CPX(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xE5: //SBC Zp

									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.PollInterrupts();
													this.Op_SBC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xE6: //INC zp
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xE7: //ISC zp ***
									switch (this.operationCycle)
									{
											case 1:
													this.GetAddressZeroPage();
													break;
											case 2: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 3: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 4: // perform operation
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.Op_SBC(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xE8: //INX
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.X = (this.X + 1) & 0xFF;
									this.flag_Zero = this.X === 0;
									this.flag_Negative = this.X >= 0x80;
									this.operationComplete = true;
									break;

							case 0xE9: //SBC Imm
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_SBC(this.dl);
									this.operationComplete = true;
									break;

							case 0xEA: //NOP
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.operationComplete = true;
									break;

							case 0xEB: //SBC Imm ***
									this.PollInterrupts();
									this.GetImmediate();
									this.Op_SBC(this.dl);
									this.operationComplete = true;
									break;

							case 0xEC: //CPX Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_CPX(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xED: //SBC Abs

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_SBC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xEE: //INC Abs
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													if(this.addressBus === 0x4014)
													{

													}
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xEF: //ISC Abs ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressAbsolute();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.Op_SBC(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF0: //BEQ
									switch (this.operationCycle)
									{
											case 1:
													this.PollInterrupts();
													this.GetImmediate();
													if (!this.flag_Zero)
													{
															this.operationComplete = true;
													}
													break;
											case 2:
													this.Fetch(this.addressBus); // dummy read
													this.temporaryAddress = (this.programCounter + ((this.dl >= 0x80) ? -(256 - this.dl) : this.dl)) & 0xFFFF;
													this.programCounter = ((this.programCounter & 0xFF00) | (((this.programCounter & 0xFF) + this.dl) & 0xFF));
													this.addressBus = this.programCounter;
													if ((this.temporaryAddress & 0xFF00) === (this.programCounter & 0xFF00))
													{
															this.operationComplete = true;
													}
													break;
											case 3: // read from address
													this.PollInterrupts_CantDisableIRQ(); // If the first poll detected an IRQ, this second poll should not be allowed to un-set the IRQ.
													this.Fetch(this.addressBus); // dummy read
													this.programCounter = ((this.programCounter & 0xFF) | (this.temporaryAddress & 0xFF00));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF1: //(SBC) this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(true);
													break;
											case 5: // read from address
													this.PollInterrupts();
													this.Op_SBC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF2: ///HLT ***
									switch (this.operationCycle)
									{
											case 1:
													this.dl = this.Fetch(this.programCounter);
													break;
											case 2:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 3:
											case 4:
													this.addressBus = 0xFFFE;
													this.Fetch(this.addressBus);
													break;
											case 5:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													break;
											case 6:
													this.addressBus = 0xFFFF;
													this.Fetch(this.addressBus);
													this.operationCycle = 5; //makes this loop infinitely.
													break;
									}
									break;

							case 0xF3: //(ISC) this.Y
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressIndOffY(false);
													break;
											case 5: // dummy read
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 6: // dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 7: // read from address
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.Op_SBC(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF4: //DOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF5: //SBC Zp, this.X

									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.PollInterrupts();
													this.Op_SBC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF6: //INC Zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF7: //ISC zp, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
													this.GetAddressZPOffX();
													break;
											case 3: // read from address
													this.dl = this.Fetch(this.addressBus);
													this.CPU_Read = false;
													break;
											case 4: //dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 5:
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.Op_SBC(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xF8: //SED
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.flag_Decimal = true;
									this.operationComplete = true;
									break;

							case 0xF9: //SBC Abs this.Y

									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffY(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_SBC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xFA: //NOP ***
									this.PollInterrupts();
									this.addressBus = this.programCounter;
									this.Fetch(this.addressBus); // dummy read
									this.operationComplete = true;
									break;

							case 0xFB: //ISC Abs this.Y ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffY(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.Op_SBC(this.dl);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xFC: //TOP ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Fetch(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xFD: //SBC Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
													this.GetAddressAbsOffX(true);
													break;
											case 4: // read from address
													this.PollInterrupts();
													this.Op_SBC(this.Fetch(this.addressBus));
													this.operationComplete = true;
													break;
									}
									break;

							case 0xFE: //INC Abs, this.X
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.operationComplete = true;
													break;
									}
									break;

							case 0xFF: //ISC Abs, this.X ***
									switch (this.operationCycle)
									{
											case 1:
											case 2:
											case 3:
											case 4:
													this.GetAddressAbsOffX(false);
													if (this.operationCycle === 4) { this.CPU_Read = false; }
													break;
											case 5:// dummy write
													this.Store(this.dl, this.addressBus);
													break;
											case 6:// read from address
													this.PollInterrupts();
													this.Op_INC(this.addressBus);
													this.Op_SBC(this.dl);
													this.operationComplete = true;
													break;
									}
									break;
							// And that's all 256 instructions!

							default: return; // logically, this can never happen.
					}
					this.operationCycle++; // increment this for next CPU cycle.
					// If this.operationComplete is true, this.operationCycle will be set to 0 for next instruction.
			}
			if (this.DoDMCDMA && this.APU_ImplicitAbortDMC4015)
			{
					this.APU_ImplicitAbortDMC4015 = false; // If this was delayed by a write cycle, it won't run at all.
			}
	}


	ResetReadPush()
	{
			// the RESET instruction has unique behavior where it reads from the stack, and decrements the stack pointer.
			this.Fetch((0x100 + this.stackPointer));
			this.stackPointer = (this.stackPointer - 1) & 0xFF;
	}

	Push(A)
	{
			// this.Store to the stack, and decrement the stack pointer.
			this.Store(A, (0x100 + this.stackPointer));
			this.stackPointer = (this.stackPointer - 1) & 0xFF;
	}

	// I don't have a void for pop... All instructions that pull form the stack just perform the logic.


	PPU_VRAM_MysteryAddress = 0; // used during consecutive write cycles to VRAM. The PPU makes 2 extra writes to VRAM, and one of them I call "the mystery write".

	PPU_AddressBus = 0;  // the Address Bus of the PPU

	PPU_ReadWriteAddress = 0;// PPU Internal Register 'v'
	PPU_TempVRAMAddress = 0; // PPU Internal Register 't'. "can also be thought of as the address of the top left onscreen tile: https://www.nesdev.org/wiki/PPU_scrolling"
	/*
	The v and t registers are 15 bits:
	yyy NN YYYYY XXXXX
	||| || ||||| +++++-- coarse X scroll
	||| || +++++-------- coarse Y scroll
	||| ++-------------- nametable select
	+++----------------- fine Y scroll
	*/

	PPU_Update2006Delay = 0;   // The number of PPU cycles to wait between writing to $2006 and the ppu from updating
	PPU_Update2005Delay = 0;   // The number of PPU cycles to wait between writing to $2004 and the ppu from updating
	PPU_Update2005Value = 0;   // The value written to $2005, for use when the delay has ended.
	PPU_Update2001Delay = 0;   // The number of PPU cycles to wait between writing to $2001 and the ppu from updating
	PPU_Update2001EmphasisBitsDelay = 0;   // The number of PPU cycles to wait between writing to $2001 and the ppu from updating the emphasis bits and greyscale
	PPU_Update2001OAMCorruptionDelay = 0;  // The number of PPU cycles to wait before OAM gets corrupted if OAM corruption is occuring.
	PPU_Update2001Value = 0;   // The value written to $2001, for use when the delay has ended.
	PPU_Update2000Delay = 0;   // The number of PPU cycles to wait between writing to $2000 and the ppu from updating
	PPU_Update2000Value = 0;   // The value written to $2000, for use when the delay has ended.
	PPU_Update2006Value = 0;   // The value written to $2006, for use when the delay has ended.
	PPU_Update2006Value_Temp = 0;

	PPU_WasRenderingBefore2001Write = false; // Were we rendering before writing to $2001? (used for OAM corruption)

	PPU_VRAMAddressBuffer = 0; // when reading from $2007, this buffer holds the value from VRAM that gets read. Updated after reading from $2007.

	PPUAddrLatch = false;  // Certain ppu registers take two writes to fully set things up. It's flipped when writing to $2005 and $2006. Reset when reading from $2002

	PPUControlIncrementMode32 = false; // Set by writing to $2000. If set, the VRAM address is incremented by 32 instead of 1 after reads/writes to $2007.
	PPUControl_NMIEnabled = false;     // Set by writing to $2000. If set, the NMI can occur.
	PPUControl_NMIEnabled_Delay = false; // There's a slight delay between this value getting set, and the PPU registering that.

	PPU_PatternSelect_Sprites = false; //which pattern table is used for sprites / background
	PPU_PatternSelect_Background = false; //which pattern table is used for sprites / background

	StorePPURegisters(Addr, In)
	{
			let AddrT = ((Addr & 0x2007));
			switch (AddrT)
			{
					case 0x2000:
							// writing here updates a large amount of this.PPU flags
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							if (this.PPU_RESET)
							{
									return;
							}

							// NOTE: This uses the contents of the databus (instead of "In") for a single ppu cycle. (alignment dependent)
							// this will be fixed on the next this.PPU cycle. no worries :)
							// In other words, this can cause a visual bug if this write occurs on the wrong ppu cycle. (dot 257 of a visible scanline)
							this.PPUControl_NMIEnabled = (In & 0x80) !== 0;
							this.PPUControlIncrementMode32 = (this.dataBus & 0x4) !== 0;
							this.PPU_Spritex16 = (this.dataBus & 0x20) !== 0;           // these bits don't seem to be affected by open bus
							this.PPU_PatternSelect_Sprites = (In & 0x8) !== 0;     // these bits don't seem to be affected by open bus
							this.PPU_PatternSelect_Background = (In & 0x10) !== 0; // these bits don't seem to be affected by open bus
							this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b0111001111111111) | ((this.dataBus & 0x3) << 10)); // using 'databus' here for 1 ppu cycle is the cause of the scanline bug.

							switch (this.PPUClock & 3) //depending on CPU/this.PPU alignment, the delay could be different.
							{
									case 0:
											this.PPU_Update2000Delay = 2; break;
									case 1:
											this.PPU_Update2000Delay = 2; break;
									case 2:
											this.PPU_Update2000Delay = 1; break; // the bug does not happen, as this this.PPU cycle fixes it.
									case 3:
											this.PPU_Update2000Delay = 1; break; // the bug does not happen, as this this.PPU cycle fixes it.
							}
							this.PPU_Update2000Value = In;


							break;

					case 0x2001:
							// writing here updates a large amount of this.PPU flags
							// Is the background being drawn? Are sprites being drawn? Greyscale / color emphasis?
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							if (this.PPU_RESET)
							{
									return;
							}
							switch (this.PPUClock & 3) //depending on CPU/this.PPU alignment, the delay could be different.
							{
									case 0:
											this.PPU_Update2001Delay = 2; this.PPU_Update2001EmphasisBitsDelay = 2; this.PPU_Update2001OAMCorruptionDelay = 2; break;
									case 1:
											this.PPU_Update2001Delay = 2; this.PPU_Update2001EmphasisBitsDelay = 1; this.PPU_Update2001OAMCorruptionDelay = 3; break; // this.PPU_Update2001EmphasisBitsDelay is actually 2, but different behavior than case 0 and 3.
									case 2:
											this.PPU_Update2001Delay = 3; this.PPU_Update2001EmphasisBitsDelay = 1; this.PPU_Update2001OAMCorruptionDelay = 3; break; // this.PPU_Update2001EmphasisBitsDelay is actually 2, but different behavior than case 0 and 3.
									case 3:
											this.PPU_Update2001Delay = 2; this.PPU_Update2001EmphasisBitsDelay = 2; this.PPU_Update2001OAMCorruptionDelay = 2; break;
							}
							this.PPU_WasRenderingBefore2001Write = this.PPU_Mask_ShowBackground || this.PPU_Mask_ShowSprites;
							let temp_rendering = this.PPU_WasRenderingBefore2001Write;
							let temp_renderingFromInput = ((In & 0x08) !== 0) || ((In & 0x10) !== 0);
							//this.PPU_Mask_8PxShowBackground = (this.dataBus & 0x02) !== 0;
							//this.PPU_Mask_8PxShowSprites = (this.dataBus & 0x04) !== 0;
							this.PPU_Mask_ShowBackground_Instant = (this.dataBus & 0x08) !== 0;
							this.PPU_Mask_ShowSprites_Instant = (this.dataBus & 0x10) !== 0;

							// disabling rendering can cause this.OAM corruption.
							if (temp_rendering && !temp_renderingFromInput)
							{
									// we are disabling rendering inside vblank
									if (this.PPU_Scanline < 241 || this.PPU_Scanline === 261)
									{
											this.PPU_OAMCorruptionRenderingDisabledOutOfVBlank_Instant = true; // used in the next cycle of sprite evaluation
											if ((this.PPU_Dot & 7) < 2 && this.PPU_Dot <= 250)
											{
													// Palette corruption only occurs if rendering was disabled during the first 2 dots of a nametable fetch
													if ((this.PPU_ReadWriteAddress & 0x3FFF) >= 0x3C00) // palette corruption only appears to occur when disabling rendering if the VRAM address is currently greater than 3C00
													{
															this.PPU_PaletteCorruptionRenderingDisabledOutOfVBlank = true; // used in the color calculation for the next dot being drawn
													}
											}
									}
							}
							else if (!temp_rendering && temp_renderingFromInput)
							{
									if (this.PPU_Scanline < 241 || this.PPU_Scanline === 261)
									{
											// if re-enabling rendering outside vblank
											if (this.PPU_PendingOAMCorruption)
											{
													// If this.OAM corruption is going to occur
													if (this.PPUClock === 1 || this.PPUClock === 2)
													{
															// if on clock alignment 1 or 2, it doesn't happen!
															this.PPU_OAMCorruptionRenderingEnabledOutOfVBlank = true;
													}
											}
									}
							}

							// this part happens immediately though?
							if (this.PPU_Update2001EmphasisBitsDelay === 2)
							{
									this.PPU_Mask_Greyscale = (this.dataBus & 0x01) !== 0;
									this.PPU_Mask_EmphasizeBlue = (this.dataBus & 0x80) !== 0;
							}
							else
							{
									this.PPU_Update2001EmphasisBitsDelay++; // it's always 2.
							}
							this.PPU_Mask_EmphasizeRed = (In & 0x20) !== 0;
							this.PPU_Mask_EmphasizeGreen = (In & 0x40) !== 0;

							this.PPU_Update2001Value = In;

							break;

					case 0x2002: // this value is Read only.
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							break;

					case 0x2003:
							// writing here updates the this.OAM address
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							this.PPUOAMAddress = this.PPUBus;
							break;

					case 0x2004:
							// writing here updates the this.OAM byte at the current this.OAM address
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							if (((this.PPU_Scanline >= 240 && this.PPU_Scanline < 261) && (this.PPU_Mask_ShowBackground || this.PPU_Mask_ShowSprites)) || (!this.PPU_Mask_ShowBackground && !this.PPU_Mask_ShowSprites))
							{
									if ((this.PPUOAMAddress & 3) === 2)
									{
											In &= 0xE3;
									}
									this.OAM[this.PPUOAMAddress] = In;
									this.PPUOAMAddress = (this.PPUOAMAddress + 1) & 0xFF;
							}
							else
							{
									this.PPUOAMAddress += 4;
									this.PPUOAMAddress &= 0xFC;

							}
							break;

					case 0x2005:
							// writing here updates the this.X and this.Y scroll
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							if (this.PPU_RESET)
							{
									return;
							}
							switch (this.PPUClock & 3) //depending on CPU/this.PPU alignment, the delay could be different.
							{
									case 0: this.PPU_Update2005Delay = 1; break;
									case 1: this.PPU_Update2005Delay = 1; break;
									case 2: this.PPU_Update2005Delay = 2; break;
									case 3: this.PPU_Update2005Delay = 1; break;
							}
							this.PPU_Update2005Value = In;
							// There's a slight delay before the this.PPU updates the scroll with the correct values.
							// In the meantime, it uses the value from the databus.
							if (!this.PPUAddrLatch)
							{
									this.PPU_FineXScroll = (this.dataBus & 7);
									this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b0111111111100000) | (this.dataBus >> 3));
							}
							else
							{
									this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b0000110000011111) | (((this.dataBus & 0xF8) << 2) | ((this.dataBus & 7) << 12)));
							}
							break;

					case 0x2006:
							// writing here updates the this.PPU's read/write address.
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							if (this.PPU_RESET)
							{
									return;
							}

							if (!this.PPUAddrLatch)
							{
									this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b000000011111111) | ((In & 0x3F) << 8));

							}
							else
							{
									this.PPU_TempVRAMAddress = ((this.PPU_TempVRAMAddress & 0b0111111100000000) | (In));
									this.PPU_Update2006Value = this.PPU_TempVRAMAddress;
									this.PPU_Update2006Value_Temp = this.PPU_ReadWriteAddress;
									switch (this.PPUClock & 3) //depending on CPU/this.PPU alignment, the delay could be different.
									{
											case 0: this.PPU_Update2006Delay = 4; break;
											case 1: this.PPU_Update2006Delay = 4; break;
											case 2: this.PPU_Update2006Delay = 5; break;
											case 3: this.PPU_Update2006Delay = 4; break;
									}
							}
							this.PPUAddrLatch = !this.PPUAddrLatch;

							break;

					case 0x2007:
							// writing here updates the byte at the current read/write address
							this.PPUBus = In;
							for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
							this.PPU_Data_StateMachine_InputValue = In;

							let Address = this.PPU_ReadWriteAddress;
							// This if statement is only relevent in an edge case. Read-Modify-Write instructions to $2007 are *complicated*.
							if (this.PPU_Data_StateMachine === 3 || this.PPU_Data_StateMachine === 6) // This write follows another read/write cycle
							{
									// during Read-Modify-Write instructions to $2007, there's alignment specific side effects.
									this.PPU_VRAM_MysteryAddress = (Address & 0xFF00 | In);
									if (!this.PPU_Data_SateMachine_Read)
									{
											this.PPU_Data_StateMachine_PerformMysteryWrite = true;
									}
									else
									{
											this.PPU_Data_StateMachine_InterruptedReadToWrite = true;
									}
							}
							else
							{
									// if this isn't interrupting the this.PPU's state machine due to a read-modify-write, don't worry about all that.
									this.PPU_Data_StateMachine_NormalWriteBehavior = true;
							}

							if (this.PPU_Data_StateMachine !== 3) // as long as this isn't 1 CPU cycle after the previous access to $2007...
							{
									if (this.PPU_Data_StateMachine === 9) // If this is not interrupting the state machine. (This is just a standard write to the $2007. No back-to-back cycles reading/writing)
									{
											this.PPU_Data_StateMachine = 3; // then the ppu VRAM read/write address needs to be updated *next* cycle.
									}
									else
									{
											this.PPU_Data_StateMachine = 0; // otherwise, the state machine will need to go back to zero.
									}
									this.PPU_Data_SateMachine_Read = false; // this is a write, not a read.
							}
							else
							{
									this.PPU_Data_SateMachine_Read_Delayed = false; // this is a write, not a read, but we likely just cut off a read.
							}

							break;
					// and that's it for the ppu registers!

					default: break; //should never happen
			}


	}

	PPUAddressWithMirroring(Address)
	{
			// if the address is less than $2000, there is no mirroring.
			if (Address < 0x2000)
			{
					return Address;
			}

			// if the vram address is pointing to the color palettes:
			if (Address >= 0x3F00)
			{
					Address &= 0x3F1F;
					if ((Address & 3) === 0)
					{
							Address &= 0x3F0F;
					}
					return Address;
			}
			Address &= 0x2FFF; // $3000 through $3F00 is always mirrored down.
			switch (this.Cart.MemoryMapper)
			{
					default:
					case 0: // NROM, just use the mirror setting from the ines header.
							if (!this.Cart.NametableHorizontalMirroring)
							{
									Address &= 0x37FF; // mask away $0800
							}
							else // horizontal
							{
									Address = ((Address & 0x33FF) | ((Address & 0x0800) >> 1)); // mask away $0C00, bit 10 becomes the former bit 11
							}
							break;
					case 1: // MMC1
							switch (this.Cart.Mapper_1_Control & 3)
							{
									case 0: //one screen, low
											Address &= 0x33FF;
											break;
									case 1: //one screen, high
											Address &= 0x33FF;
											Address |= 0x400;
											break;
									case 2: //vertical
											Address &= 0x37FF; // mask away $0800
											break;
									case 3: //horizontal
											Address = ((Address & 0x33FF) | ((Address & 0x0800) >> 1)); // mask away $0C00, bit 10 becomes the former bit 11

											break;
							}
							break;
					case 4:
					case 118:
					case 119: // MMC3
							if (this.Cart.Mapper_4_NametableMirroring) //horizontal
							{
									Address = ((Address & 0x33FF) | ((Address & 0x0800) >> 1)); // mask away $0C00, bit 10 becomes the former bit 11
							}
							else //vertical
							{
									Address &= 0x37FF; // mask away $0800
							}
							break;
					case 7: // AOROM
							if ((this.Cart.Mapper_7_BankSelect & 0x10) === 0) // show nametable 0
							{
									Address &= 0x33FF;
							}
							else // show nametable 1
							{
									Address &= 0x33FF;
									Address |= 0x400;
							}
							break;
					case 9: // MMC2
							if (this.Cart.Mapper_9_NametableMirroring) //horizontal
							{
									Address = ((Address & 0x33FF) | ((Address & 0x0800) >> 1)); // mask away $0C00, bit 10 becomes the former bit 11
							}
							else //vertical
							{
									Address &= 0x37FF; // mask away $0800
							}
							break;
					case 69: // Sunsoft FME-7
							switch (this.Cart.Mapper_69_NametableMirroring)
							{
									case 0: //vertical
											Address &= 0x37FF; // mask away $0800
											break;
									case 1: //horizontal
											Address = ((Address & 0x33FF) | ((Address & 0x0800) >> 1)); // mask away $0C00, bit 10 becomes the former bit 11
											break;
									case 2: //one-screen this.A
											Address &= 0x33FF;
											break;
									case 3: //one-screen B
											Address &= 0x33FF;
											Address |= 0x400;
											break;
							}
							break;
			}
			return Address;
	}

	StorePPUData(Address, In)
	{
			// writing to the this.PPU's VRAM.
			// first, check if the address has any mirroring going on:
			Address = this.PPUAddressWithMirroring(Address);
			if (Address < 0x2000) // if this is pointing to CHR this.RAM
			{
					this.Cart.CHRRAM[Address] = In;
			}
			else if (Address >= 0x3F00)
			{
					this.PaletteRAM[Address & 0x1F] = In;
			}
			else // if this is not pointing to CHR this.RAM or palettes
			{
					this.PPU[Address & 0x7FF] = In;

			}
	}








	//for logging purposes. doesn't update databus.
	DebugObserve = false;
	Observe(Address)
	{
			// this is mostly just so my debugger can read from this.PPU addresses without actually modifying the values of them.
			// Some registers change things when read, and this prevents that.
			let t = this.dataBus; // copy the databus
			this.DebugObserve = true; // this flag prevents ppu registers from updating things when reading
			this.Fetch(Address);
			this.DebugObserve = false; // uncheck this flag
			let t2 = this.dataBus; // copy the new databus value
			this.dataBus = t; // restore the old databus
			return t2; // return the new databus
	}
	DataPinsAreNotFloating = false;   // used in controller reading + OAM DMA.
	Fetch(Address)
	{
			this.DataPinsAreNotFloating = false;
			// Reading from anywhere goes through this function.
			if ((Address >= 0x8000))
			{
					// Reading from ROM.
					// Different mappers could rearrange the data from the ROM into different locations on the system bus.
					this.MapperFetch(Address, this.Cart.MemoryMapper);
					this.DataPinsAreNotFloating = true;
			}
			else if (Address < 0x2000)
			{
					// Reading from this.RAM.
					// Ram mirroring! Only addresses $0000 through $07FF exist in this.RAM, so ignore bits 11 and 12
					this.dataBus = this.RAM[Address & 0x7FF];
					this.DataPinsAreNotFloating = true;
			}
			else if (Address >= 0x2000 && Address < 0x4000)
			{
					// this.PPU registers. most of these aren't meant to be read.
					Address = (Address & 0x2007);
					switch (Address)
					{
							case 0x2000:
									// Write only. Return the this.PPU databus.
									this.dataBus = this.PPUBus;
									if (this.DebugObserve) // for debug logging, actually return this value.
									{
											this.dataBus = this.PPU_Ctrl;
									}
									break;
							case 0x2001:
									// Write only. Return the this.PPU databus.
									this.dataBus = this.PPUBus;
									if (this.DebugObserve) // for debug logging, actually return this value.
									{
											this.dataBus = this.PPU_Mask;
									}
									break;
							case 0x2002:
									// this.PPU Flags.
									if(this.programCounter === 0xEA6D)
									{

									}
									this.dataBus = ((((this.PPUStatus_VBlank ? 0x80 : 0) | (this.PPUStatus_SpriteZeroHit ? 0x40 : 0) | (this.PPUStatus_SpriteOverflow ? 0x20 : 0)) & 0xE0) + (this.PPUBus & 0x1F));
									if (!this.DebugObserve)
									{
											this.PPUAddrLatch = false;
											this.PPUStatus_VBlank = false;
											this.PPUStatus_VBlank_Delayed = false;
											if (this.PPU_Dot < 3) // If $2002 is written to within 3 cycles of this.PPU_PendingNMI
											{
													this.PPU_PendingNMI = false;
											}
											this.PPU_PendingVBlank = false;
											this.PPUBus = this.dataBus;
											for (let i = 5; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
									}
									break;
							case 0x2003:
									// write only. Return the this.PPU databus.
									this.dataBus = this.PPUBus; break;
							case 0x2004:
									// Read from this.OAM
									this.dataBus = this.ReadOAM();
									if ((this.PPUOAMAddress & 3) === 2)
									{
											this.dataBus &= 0xE3; // the attributes always return 0 for bits 2, 3, and 4
									}
									if (!this.DebugObserve)
									{
											this.PPUBus = this.dataBus;
											for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
									}
									break;
							case 0x2005:
									// write only. Return the this.PPU databus.
									this.dataBus = this.PPUBus; break;
							case 0x2006:
									// write only. Return the this.PPU databus.
									this.dataBus = this.PPUBus; break;
							case 0x2007:
									// Reading from VRAM.

									if (!this.DebugObserve)
									{
											// if this is 1 CPU cycle after another read, there's interesting behavior.
											if (this.PPU_Data_StateMachine === 3 && this.PPU_Data_SateMachine_Read)
											{
													//Behavior that is CPU/this.PPU alignment specific
													if (this.PPUClock === 0)
													{
															this.dataBus = this.PPU_VRAMAddressBuffer; // just read the buffer
													}
													else if (this.PPUClock === 1)
													{
															this.PPU_Data_StateMachine_UpdateVRAMAddressEarly = true;
															this.dataBus = this.PPU_VRAMAddressBuffer; // just read the buffer, but *also* the VRAM address will be updated early.

													}
													else if (this.PPUClock === 2)
													{
															this.PPU_Data_StateMachine_UpdateVRAMAddressEarly = true; // update the vram address early...

															this.dataBus = (this.PPU_ReadWriteAddress & 0xFF); // the value read is not the buffer, but instead it's the low byte of the read/write address. 
													}
													else if (this.PPUClock === 3)
													{
															if (this.PPU_ReadWriteAddress >= 0x2000) // this is apprently different depending on where the read is? TODO: More testing required.
															{
																	if (this.PPU_VRAMAddressBuffer !== 0)
																	{
																			// TODO: Inconsistent on real hardware, even with the same alignment.
																	}
																	this.dataBus = this.PPU_VRAMAddressBuffer; // with some bits missing
																	this.PPU_Data_StateMachine_UpdateVRAMAddressEarly = true; // update the vram address early...

															}
															else
															{
																	this.PPU_Data_StateMachine_UpdateVRAMAddressEarly = true; // update the vram address early...

																	this.dataBus = (this.PPU_ReadWriteAddress & 0xFF); // the value read is not the buffer, but instead it's the low byte of the read/write address. 
															}
													}
											}
											else // a normal read, not interrupting another read.
											{
													// this isn't a RMW instruction
													if (this.PPU_ReadWriteAddress >= 0x3F00)
													{
															// reading from the palettes
															this.PPU_AddressBus = this.PPU_ReadWriteAddress;
															this.dataBus = this.FetchPPU((this.PPU_AddressBus & 0x3FFF));
													}
													else
													{
															// not reading from the palettes, reading from the buffer.
															this.dataBus = this.PPU_VRAMAddressBuffer;
													}
											}

											// if the this.PPU state machine is not currently in progress...
											if (this.PPU_Data_StateMachine === 9)
											{
													this.PPU_Data_StateMachine = 0; // start it at 0
													if (this.PPUClock === 1 || this.PPUClock === 0)
													{
															// and if this is phase 0 or 1, the buffer is updated later.
															this.PPU_Data_StateMachine_UpdateVRAMBufferLate = true;
													}
													if ((this.DoDMCDMA && (this.APU_Status_DMC || this.APU_ImplicitAbortDMC4015)))
													{
															this.PPU_ReadWriteAddress = (this.PPU_ReadWriteAddress + 1) & 0xFFFF; // I'm unsure on the timing of this, but I know the DMC DMA landing here ends up incrementing this one more time than my "state machine" currently runs.
													}
											}

											this.PPU_Data_SateMachine_Read = true; // This is a read instruction, so the state machien needs to read.
											this.PPU_Data_SateMachine_Read_Delayed = true; // This is also set, in case the state machine is interrupted.
											this.PPUBus = this.dataBus;
											for (let i = 0; i < 8; i++) { this.PPUBusDecay[i] = this.PPUBusDecayConstant; }
									}
									else
									{ // else, if this is just reading from $2007 with the debug logger...
											if (this.PPU_ReadWriteAddress >= 0x3F00)
											{
													this.dataBus = this.FetchPPU((this.PPU_ReadWriteAddress & 0x3FFF)); // just read the color, and don't update the read/write address
											}
											else
											{
													this.dataBus = this.PPU_VRAMAddressBuffer; // just read the buffer, and don't update it.
											}
									}
									break;
					}
					this.DataPinsAreNotFloating = true;

			}
			else
			{
					//mapper chip stuff, but also open bus!
					this.MapperFetch(Address, this.Cart.MemoryMapper);
			}

			if ((this.addressBus >= 0x4000 && this.addressBus <= 0x401F) || (this.DebugObserve && Address >= 0x4000 && Address <= 0x401F)) // If APU registers are active, bus conflicts can occur. Or perhaps you are intentionally reading from the APU registers...
			{
					//this.addressBus 
					let Reg = (Address & 0x1F);
					if (Reg === 0x15)
					{
							if (this.DebugObserve)
							{
									this.dataBus = 0x40; // if this is this.DebugObserve, the databus's previous value is restored after this function. Fear not!
							}
							let InternalBus = this.dataBus;

							InternalBus &= 0x20;
							InternalBus |= (this.APU_Status_DMCInterrupt ? 0x80 : 0);
							InternalBus |= (this.APU_Status_FrameInterrupt ? 0x40 : 0);
							InternalBus |= ((this.APU_DMC_BytesRemaining !== 0 && this.APU_Status_DelayedDMC) ? 0x10 : 0); // see footnote.
							InternalBus |= ((this.APU_LengthCounter_Noise !== 0) ? 0x08 : 0);
							InternalBus |= ((this.APU_LengthCounter_Triangle !== 0) ? 0x04 : 0);
							InternalBus |= ((this.APU_LengthCounter_Pulse2 !== 0) ? 0x02 : 0);
							InternalBus |= ((this.APU_LengthCounter_Pulse1 !== 0) ? 0x01 : 0);
							if (!this.DebugObserve)
							{
									this.Clearing_APU_FrameInterrupt = true;
							}

							// footnote:
							// Consider the following. LDA #0, STA $4015, LDA $4015.
							// The this.APU_DMC_BytesRemaining byte isn't cleared until 3 or 4 cycles after writing 0 to $4015.
							// However, reading from $4015 after the needs to immediately have bit 4 cleared.

							return InternalBus; // reading from $4015 can not affect the databus
					}
					else if (Reg === 0x16 || Reg === 0x17)
					{
							let ControllerRead = ((((Reg === 0x16) ? (this.ControllerShiftRegister1 & 0x80) : (this.ControllerShiftRegister2 & 0x80)) === 0 ? 0 : 1) | (this.dataBus & 0xE0));
							
							// controller ports
							// grab 1 bit from the controller's shift register.
							// also add the upper 3 bits of the databus.
							if (!this.DebugObserve)
							{
									if (Reg === 0x16)
									{
											// if there are 2 CPU cycles in a row that read from this address, the registers don't get shifted
											this.Controller1ShiftCounter = 2; // The shift register isn't shifted until this is 0, decremented in every APU PUT cycle
									}
									else
									{
											// if there are 2 CPU cycles in a row that read from this address, the registers don't get shifted
											this.Controller2ShiftCounter = 2; // The shift register isn't shifted until this is 0, decremented in every APU PUT cycle
									}
							}
							this.APU_ControllerPortsStrobed = false; // This allows data to rapidly be streamed in through the this.A button if the controllers are read while strobed.
							if (this.DoOAMDMA && this.DataPinsAreNotFloating) // If all the databus pins are floating, then the controller bits are visible. Otherwise... not so much.
							{
									return this.dataBus;
							}
							this.dataBus = ControllerRead;

					}
			}

			return this.dataBus;
	}
	MapperFetch(Address, Mapper)
	{
			switch (Mapper)
			{
					default:
					case 0: //NROM
							if (Address >= 0x8000)
							{
									this.dataBus = this.Cart.PRGROM[Address & (this.Cart.PRGROM.length - 1)]; // Get the address form the ROM file. If the ROM only has $4000 bytes, this will make addresses > $BFFF mirrors of $8000 through $BFFF.
									this.DataPinsAreNotFloating = true;
									return;
							}
							//open bus
							return;

					case 1: //MMC1
							if (Address >= 0x8000)
							{
									this.DataPinsAreNotFloating = true;
									// The bank mode for MMC1:
									let MMC1PRGROMBankMode = ((this.Cart.Mapper_1_Control & 0b01100) >> 2);
									switch (MMC1PRGROMBankMode)
									{
											case 0:
											case 1:
													{
															// switch 32 KB at $8000, ignoring low bit of bank number
															let tempo = (Address & 0x7FFF);
															this.dataBus = this.Cart.PRGROM[(0x8000 * (this.Cart.Mapper_1_PRG & 0x0E) + tempo) % this.Cart.PRGROM.length];
															return;
													}
											case 2:
													// fix first bank at $8000 and switch 16 KB bank at $C000
													if (Address >= 0xC000)
													{
															let tempo = (Address & 0x3FFF);
															this.dataBus = this.Cart.PRGROM[0x4000 * (this.Cart.Mapper_1_PRG) + tempo];
															return;
													}
													else
													{
															let tempo = (Address & 0x3FFF);
															this.dataBus = this.Cart.PRGROM[tempo];
															return;
													}
											case 3:
													// fix last bank at $C000 and switch 16 KB bank at $8000
													if (Address >= 0xC000)
													{
															let tempo = (Address & 0x3FFF);
															this.dataBus = this.Cart.PRGROM[this.Cart.PRGROM.length - 0x4000 + tempo];
															return;
													}
													else
													{
															let tempo = (Address & 0x3FFF);
															this.dataBus = this.Cart.PRGROM[(0x4000 * (this.Cart.Mapper_1_PRG & 0x0F) + tempo) & (this.Cart.PRGROM.length - 1)];
															return;
													}
									}
							}
							else // if the address is < $8000
							{
									if (((this.Cart.Mapper_1_PRG & 0x10) === 0)) // if Work this.RAM is enabled
									{
											this.dataBus = this.Cart.PRGRAM[Address & 0x1FFF];
											this.DataPinsAreNotFloating = true;
											return;
									}
									// else, open bus.
							}
							//open bus
							return;

					case 71:
					case 2: //UxROM
							if (Address >= 0x8000)
							{
									this.DataPinsAreNotFloating = true;
									if (Address >= 0xC000)
									{
											let tempo = (Address & 0x3FFF);
											this.dataBus = this.Cart.PRGROM[this.Cart.PRGROM.length - 0x4000 + tempo];
											return;
									}
									else
									{
											let tempo = (Address & 0x3FFF);
											this.dataBus = this.Cart.PRGROM[0x4000 * (this.Cart.Mapper_2_BankSelect & 0x0F) + tempo];
											return;
									}
							}
							return;
					// case 3, CNROM doesn't have any PRG bank switching, so it shares the logic with NROM
					case 4:
					case 118:
					case 119:
							//MMC3
							if (Address >= 0xE000) // This bank is fixed the the final PRG bank of the ROM
							{
									this.DataPinsAreNotFloating = true;
									this.dataBus = this.Cart.PRGROM[(this.Cart.PRG_SizeMinus1 << 14) | (Address & 0x3FFF)];
									return;
							}
							else if (Address >= 0xC000)
							{
									this.DataPinsAreNotFloating = true;
									if ((this.Cart.Mapper_4_8000 & 0x40) === 0x40)
									{
											//$C000 swappable
											this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_4_Bank8C << 13) | (Address & 0x1FFF)];
									}
									else
									{
											//$8000 swappable
											this.dataBus = this.Cart.PRGROM[(this.Cart.PRG_SizeMinus1 << 14) | (Address & 0x1FFF)];
									}
									return;
							}
							else if (Address >= 0xA000)
							{
									this.DataPinsAreNotFloating = true;
									//$8000 swappable
									this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_4_BankA << 13) | (Address & 0x1FFF)];

									return;
							}
							else if (Address >= 0x8000)
							{
									this.DataPinsAreNotFloating = true;
									if ((this.Cart.Mapper_4_8000 & 0x40) === 0x40)
									{
											//$8000 swappable
											this.dataBus = this.Cart.PRGROM[(this.Cart.PRG_SizeMinus1 << 14) | (Address & 0x1FFF)];
									}
									else
									{
											//$C000 swappable
											this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_4_Bank8C << 13) | (Address & 0x1FFF)];
									}
									return;
							}
							else //if (Address >= 0x6000)
							{
									if ((this.Cart.Mapper_4_PRGRAMProtect & 0x80) !== 0)
									{
											this.DataPinsAreNotFloating = true;
											this.dataBus = this.Cart.PRGRAM[Address & 0x1FFF];
									}
									//else, open bus
									return;
							}
					case 7: // AOROM
							if (Address >= 0x8000)
							{
									this.DataPinsAreNotFloating = true;
									let tempo = (Address & 0x7FFF);
									this.dataBus = this.Cart.PRGROM[(0x8000 * (this.Cart.Mapper_7_BankSelect & 0x07) + tempo)&(this.Cart.PRGROM.length-1)];
							}
							// AOROM doesn't have any PRG this.RAM
							return;
					case 9: //MMC2
							if(Address >= 0xA000)
							{
									this.dataBus = this.Cart.PRGROM[((this.Cart.PRG_Size-2) << 14) | (Address & 0x7FFF)];
							}
							else
							{
									this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_9_BankSelect << 13) | (Address & 0x1FFF)];
							}
							return;
					case 69:
							//Sunsoft FME-7 (used in Gimmick)
							if (Address >= 0x6000)
							{
									let tempo = (Address % 0x2000);
									if (Address >= 0x6000)
									{
											//actions
											if (Address < 0x8000)
											{
													if (this.Cart.Mapper_69_Bank_6_isRAM)
													{
															if (this.Cart.Mapper_69_Bank_6_isRAMEnabled)
															{
																	this.dataBus = this.Cart.PRGRAM[Address & 0x1FFF];
																	this.DataPinsAreNotFloating = true;
																	return;
															}
															else
															{   //open bus
																	return;
															}
													}
													else
													{   //read from ROM
															this.DataPinsAreNotFloating = true;
															this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_69_Bank_6 * 0x2000 + tempo) % this.Cart.PRGROM.length];
															return;
													}
											}
											else if (Address < 0xA000)
											{
													this.DataPinsAreNotFloating = true;
													this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_69_Bank_8 * 0x2000 + tempo) % this.Cart.PRGROM.length];
													return;
											}
											else if (Address < 0xC000)
											{
													this.DataPinsAreNotFloating = true;
													this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_69_Bank_A * 0x2000 + tempo) % this.Cart.PRGROM.length];
													return;
											}
											else if (Address < 0xE000)
											{
													this.DataPinsAreNotFloating = true;
													this.dataBus = this.Cart.PRGROM[(this.Cart.Mapper_69_Bank_C * 0x2000 + tempo) % this.Cart.PRGROM.length];
													return;
											}
											else
											{
													this.DataPinsAreNotFloating = true;
													this.dataBus = this.Cart.PRGROM[this.Cart.PRGROM.length - 0x2000 + tempo];
													return;
											}
									}
							}
							//open bus
							return;

			}

	}

	ReadOAM()
	{
			if((this.PPU_Mask_ShowBackground || this.PPU_Mask_ShowSprites) && this.PPU_Scanline < 240)
			{
					if (this.PPU_Dot >0 && this.PPU_Dot <= 64)
					{
							return 0xFF;
					}
					else if (this.PPU_Dot <= 256)
					{
							return this.OAM[this.PPUOAMAddress];
					}
					else if (this.PPU_Dot <= 320)
					{
							return 0xFF;
					}
					return this.OAM[this.PPUOAMAddress];
			}
			return this.OAM[this.PPUOAMAddress];
	}

	PPU_PendingVBlank = false;
	PPU_PendingNMI = false; //at vblank

	TAS_ReadingTAS = false;         // if we're reading inputs from a TAS, this will be set.
	TAS_InputSequenceIndex = 0;  // which index from the TAS input log will be used for this current controller strobe?
	TAS_InputLog = []; // controller [22222222 11111111]
	ClockFiltering = false; // If set, TAS_InputSequenceIndex increments every time the controllers are strobed (or clocked, if the controller is held strobing). Otherwise, "latch filtering" is used, incrementing TAS_InputSequenceIndex once a frame.
	SyncFM2 = false; // This is set if we're running an FM2 TAS, which (due to FCEUX's very incorrect timing of the first frame after power on) I need to start execution on scanline 240, and prevent the vblank flag from being set.
	Store(Input, Address)
	{
			// This is used whenever writing anywhere with the CPU
			if (Address < 0x2000)
			{
					//guarunteed to be this.RAM

					this.RAM[Address & 0x7FF] = Input;

			}
			else if (Address < 0x4000)
			{
					// $2000 through $3FFF writes to the this.PPU registers
					this.StorePPURegisters(Address, Input);
			}
			else if (Address >= 0x4000 && Address <= 0x4015)
			{
					// extra stuff
					switch (Address)
					{
							case 0x4000:
									this.sequencer1Sequence = Emulator.sequenceLookup[Input >> 6];
									this.length1Halt = (Input & 0b00100000) > 0;
									this.env1Loop = (Input & 0b00100000) > 0;
									this.env1Constant = (Input & 0b00010000) > 0;
									this.env1Volume = (Input & 0b00001111);
									break;
							case 0x4001:
									this.sweep1Enabled = (Input & 0b10000000) > 0;
									this.sweep1Period = ((Input & 0b01110000) >> 4);
									this.sweep1Negate = (Input & 0b00001000) > 0;
									this.sweep1Shift = (Input & 0b00000111);
									this.sweep1Reload = true;
									break;
							case 0x4002:
									this.timer1Period = (this.timer1Period & 0b11100000000) + Input;
									break;
							case 0x4003:
									if (this.length1Enabled) this.length1Counter = Emulator.APU_LengthCounterLUT[Input >> 3];
									this.timer1Period = (this.timer1Period & 0b00011111111) + ((Input & 0b00000111) << 8);
									this.env1Start = true;
									break;
							case 0x4004:
									this.sequencer2Sequence = Emulator.sequenceLookup[Input >> 6];
									this.length2Halt = (Input & 0b00100000) > 0;
									this.env2Loop = (Input & 0b00100000) > 0;
									this.env2Constant = (Input & 0b00010000) > 0;
									this.env2Volume = (Input & 0b00001111);
									break;
							case 0x4005:
									this.sweep2Enabled = (Input & 0b10000000) > 0;
									this.sweep2Period = ((Input & 0b01110000) >> 4);
									this.sweep2Negate = (Input & 0b00001000) > 0;
									this.sweep2Shift = (Input & 0b00000111);
									this.sweep2Reload = true;
									break;
							case 0x4006:
									this.timer2Period = (this.timer2Period & 0b11100000000) + Input;
									break;
							case 0x4007:
									if (this.length2Enabled) this.length2Counter = Emulator.APU_LengthCounterLUT[Input >> 3];
									this.timer2Period = (this.timer2Period & 0b00011111111) + ((Input & 0b00000111) << 8);
									this.env2Start = true;
									break;
							case 0x4008:
									this.linearCounterControl = (Input & 0b10000000) > 0;
									this.linearCounterReloadValue = (Input & 0b01111111);
									this.length3Halt = this.linearCounterControl;
									break;
							case 0x400A:
									this.timer3Period = (this.timer3Period & 0b11100000000) + Input;
									break;
							case 0x400B:
									if (this.length3Enabled) this.length3Counter = Emulator.APU_LengthCounterLUT[Input >> 3];
									this.timer3Period = (this.timer3Period & 0b00011111111) + ((Input & 0b00000111) << 8);
									this.linearCounterReload = true;
									break;
							case 0x400C:
									this.length4Halt = (Input & 0b00100000) > 0
									this.env3Loop = (Input & 0b00100000) > 0
									this.env3Constant = (Input & 0b00010000) > 0
									this.env3Volume = (Input & 0b00001111)
									break;
							case 0x400E:
									this.shiftBit = (Input & 0b10000000) ? 6 : 1;
									this.timer4Period = Emulator.periodLookup[Input & 0b1111];
									break;
							case 0x400F:
									if (this.length4Enabled) this.length4Counter = Emulator.APU_LengthCounterLUT[Input >> 3];
									this.env3Start = true;
									break;
							case 0x4015:
									this.length1Enabled = (Input & 0b00000001) > 0;
									this.length2Enabled = (Input & 0b00000010) > 0;
									this.length3Enabled = (Input & 0b00000100) > 0;
									this.length4Enabled = (Input & 0b00001000) > 0;
									
									if (!this.length1Enabled) this.length1Counter = 0;
									if (!this.length2Enabled) this.length2Counter = 0;
									if (!this.length3Enabled) this.length3Counter = 0;
									if (!this.length4Enabled) this.length4Counter = 0;
									break;
					}
				
					
					// Writing to $4000 through $4015 are APU registers
					switch (Address)
					{
							default:
									this.APU_Register[Address & 0xFF] = Input; break;
							case 0x4003:
									if (this.APU_Status_Pulse1)
									{
											this.APU_LengthCounter_ReloadValuePulse1 = Emulator.APU_LengthCounterLUT[Input >> 3];
											this.APU_LengthCounter_ReloadPulse1 = true;
									}
									this.APU_ChannelTimer_Pulse1 |= ((Input &= 0x7) << 8);
									break;
							case 0x4007:
									if (this.APU_Status_Pulse2)
									{
											this.APU_LengthCounter_ReloadValuePulse2 = Emulator.APU_LengthCounterLUT[Input >> 3];
											this.APU_LengthCounter_ReloadPulse2 = true;
									}
									this.APU_ChannelTimer_Pulse2 |= ((Input &= 0x7) << 8);
									break;
							case 0x400B:
									if (this.APU_Status_Triangle)
									{
											this.APU_LengthCounter_ReloadValueTriangle = Emulator.APU_LengthCounterLUT[Input >> 3];
											this.APU_LengthCounter_ReloadTriangle = true;

									}
									this.APU_ChannelTimer_Triangle |= ((Input &= 0x7) << 8);
									break;
							case 0x400F:
									if (this.APU_Status_Noise)
									{
											this.APU_LengthCounter_ReloadValueNoise = Emulator.APU_LengthCounterLUT[Input >> 3];
											this.APU_LengthCounter_ReloadNoise = true;
									}
									break;

							case 0x4010:
									this.APU_DMC_EnableIRQ = (Input & 0x80) !== 0;
									this.APU_DMC_Loop = (Input & 0x40) !== 0;
									this.APU_DMC_Rate = Emulator.APU_DMCRateLUT[Input & 0xF];
									if (!this.APU_DMC_EnableIRQ)
									{
											this.APU_Status_DMCInterrupt = false;
											this.IRQ_LevelDetector = false;
									}
									break;

							case 0x4011:
									this.APU_DMC_Output = (Input & 0x7F);

									break;

							case 0x4012:
									this.APU_DMC_SampleAddress = (0xC000 | (Input << 6));
									break;

							case 0x4013:
									this.APU_DMC_SampleLength = ((Input << 4) | 1);
									break;

							case 0x4014:    //this.OAM DMA
									this.DoOAMDMA = true;
									this.FirstCycleOfOAMDMA = true;
									this.DMAAddress = 0; // the starting address for the this.OAM DMC is always page aligned.
									this.DMAPage = Input;                        
									break;
							case 0x4015:    //DMC DMA (and other audio channels)

									this.APU_Status_DelayedDMC = (Input & 0x10) !== 0;
									this.APU_Status_Noise = (Input & 0x08) !== 0;
									this.APU_Status_Triangle = (Input & 0x04) !== 0;
									this.APU_Status_Pulse2 = (Input & 0x02) !== 0;
									this.APU_Status_Pulse1 = (Input & 0x01) !== 0;

									this.APU_DelayedDMC4015 = (this.APU_PutCycle ? 3 : 4); // Enable in 1 APU cycles, or 1.5 APU cycles. (it will be decremented later this cycle, so it's really like 2 : 3.

									if (this.APU_Status_DelayedDMC && this.APU_DMC_BytesRemaining === 0)
									{
											// sets up the sample bytes_remaining and sample address.
											this.StartDMCSample();
											// However, the sample will only begin playing if the DMC is currently silent
											if (this.APU_Silent)
											{
													this.DMCDMADelay = 2; // 2 APU cycles
											}
									}

									if (!this.APU_Status_Noise) { this.APU_LengthCounter_Noise = 0; }
									if (!this.APU_Status_Triangle) { this.APU_LengthCounter_Triangle = 0; }
									if (!this.APU_Status_Pulse2) { this.APU_LengthCounter_Pulse2 = 0; }
									if (!this.APU_Status_Pulse1) { this.APU_LengthCounter_Pulse1 = 0; }
									this.APU_Status_DMCInterrupt = false;
									this.IRQ_LevelDetector = false;

									// Explicit abort stuff.
									if (!this.APU_Status_DelayedDMC && ((this.APU_ChannelTimer_DMC === 2 && !this.APU_PutCycle) || (this.APU_ChannelTimer_DMC === this.APU_DMC_Rate && this.APU_PutCycle))) // this will be the APU cycle that fires a DMC DMA
									{
											this.APU_DelayedDMC4015 = (this.APU_PutCycle ? 5 : 6); // Disable in 2.5 APU cycles, or 3 APU cycles.
											// basically, if the DMA has already begun, don't abort it for *this* edge case.
									}

									// Implicit abort stuff.
									if (this.APU_Status_DelayedDMC && ((this.APU_ChannelTimer_DMC === 10 && !this.APU_PutCycle) || (this.APU_ChannelTimer_DMC === 8 && this.APU_PutCycle)))
									{
											// okay, so the series of events is as follows:
											// the Load DMA will occur
											// regardless of the buffer being empty, there will be a 1-cycle DMA that gets aborted 2 cycles after the load DMA ends.
											this.APU_SetImplicitAbortDMC4015 = true; // This will occur in 8 (or 9) cpu cycles
									}

									break;
					}

			}
			else if (Address === 0x4016)
			{
					if (this.TAS_ReadingTAS)
					{
							this.APU_ControllerPortsStrobing = ((Input & 1) !== 0);
					}
					this.APU_ControllerPortsStrobing = ((Input & 1) !== 0);
					if (!this.APU_ControllerPortsStrobing)
					{
							this.APU_ControllerPortsStrobed = false;
					}
			}
			else if (Address === 0x4017)
			{
					this.APU_FrameCounterMode = (Input & 0x80) !== 0;
					this.APU_FrameCounterInhibitIRQ = (Input & 0x40) !== 0;
					if (this.APU_FrameCounterMode)
					{
							this.APU_HalfFrameClock = true;
							this.APU_QuarterFrameClock = true;
					}
					if (this.APU_FrameCounterInhibitIRQ)
					{
							this.APU_Status_FrameInterrupt = false;
							this.IRQ_LevelDetector = false;
					}
					this.APU_FrameCounterReset = ((this.APU_PutCycle ? 3 : 4));
			}
			else if (Address >= 0x6000)
			{
					// mapper chip specific stuff- but also open bus!
					this.MapperStore(Input, Address, this.Cart.MemoryMapper);

			}
			else
			{
					// open bus!
					// this doesn't write anywhere, but it still updates the databus!
			}

			this.dataBus = Input;

	}

	StartDMCSample()
	{
			// This runs when writing to $4015, or if a DPCM sample is looping and needs to restart.
			this.APU_DMC_AddressCounter = this.APU_DMC_SampleAddress;
			this.APU_DMC_BytesRemaining = this.APU_DMC_SampleLength;
	}

	MapperStore(Input, Address, Mapper)
	{
			// Storing to mapper specific registers
			// Address should always be 0x6000 or greater
			switch (Mapper)
			{
					default:
							return;
					case 1:// MMC1
							if (Address < 0x8000) //WRAM not available on MMC1A
							{
									if (((this.Cart.Mapper_1_PRG & 0x10) === 0) /*&& Mapper !== 1*/)
									{
											//Battery backed this.RAM
											this.Cart.PRGRAM[Address & 0x1FFF] = Input;
											return;
									}
									else
									{
											return; //do nothing
									}
							}
							else
							{   // shift the shirftRegister and add the new bit
									this.Cart.Mapper_1_PB = (this.Cart.Mapper_1_ShiftRegister & 1) === 1;
									this.Cart.Mapper_1_ShiftRegister >>= 1;
									this.Cart.Mapper_1_ShiftRegister |= ((Input & 1) << 4);
							}
							if (this.Cart.Mapper_1_PB) // if the '1' that was initiallized in bit 4 is shifted into the bus
							{
									// copy shift register to the desired internal register.
									switch (Address & 0xE000)
									{
											case 0x8000: //control
													this.Cart.Mapper_1_Control = this.Cart.Mapper_1_ShiftRegister;
													break;
											case 0xA000: //CHR0
													this.Cart.Mapper_1_CHR0 = this.Cart.Mapper_1_ShiftRegister;
													break;
											case 0xC000: //CHR1
													this.Cart.Mapper_1_CHR1 = this.Cart.Mapper_1_ShiftRegister;
													break;
											case 0xE000: //PRG
													this.Cart.Mapper_1_PRG = this.Cart.Mapper_1_ShiftRegister;
													break;
									}
									this.Cart.Mapper_1_ShiftRegister = 0b10000;
							}
							if ((Input & 0b10000000) !== 0)
							{
									this.Cart.Mapper_1_ShiftRegister = 0b10000;
									this.Cart.Mapper_1_Control |= 0b01100;
							}
							break;

					case 71:
					case 2: //UxROM
							if (Address >= 0x8000)
							{
									this.Cart.Mapper_2_BankSelect = (Input & 0xF);
							}
							return;
					case 3: //CNROM
							if (Address >= 0x8000)
							{
									this.Cart.Mapper_3_CHRBank = (Input & 0x3);
							}
							return;
					case 4:
					case 118:
					case 119:   //MMC3
							if (Address < 0x8000)
							{   //Battery backed this.RAM
									if ((this.Cart.Mapper_4_PRGRAMProtect & 0xC0) !== 0) // bit 7 enables PRG this.RAM, bit 6 enables writing there.
									{
											this.Cart.PRGRAM[Address & 0x1FFF] = Input;
									}
									return;
							}
							else
							{   //MMC3 actions
									const tempo = (Address & 0xE001);
									switch (tempo)
									{
											case 0x8000:
													this.Cart.Mapper_4_8000 = Input;
													return;
											case 0x8001:
													let mode = (this.Cart.Mapper_4_8000 & 7);
													switch (mode)
													{
															case 0: //this.PPU ($0000 - $07FF) ?+ $1000
																	this.Cart.Mapper_4_CHR_2K0 = (Input & 0xFE);
																	return;
															case 1: //this.PPU ($0800 - $0FFF) ?+ $1000
																	this.Cart.Mapper_4_CHR_2K8 = (Input & 0xFE);
																	return;
															case 2: //this.PPU ($1000 - $13FF) ?- $1000
																	this.Cart.Mapper_4_CHR_1K0 = Input;
																	return;
															case 3: //this.PPU ($1400 - $17FF) ?- $1000
																	this.Cart.Mapper_4_CHR_1K4 = Input;
																	return;
															case 4: //this.PPU ($1800 - $1BFF) ?- $1000
																	this.Cart.Mapper_4_CHR_1K8 = Input;
																	return;
															case 5: //this.PPU ($1C00 - $1FFF) ?- $1000
																	this.Cart.Mapper_4_CHR_1KC = Input;
																	return;
															case 6: //PRG ($8000 - $9FFF) ?+ 0x4000
																	this.Cart.Mapper_4_Bank8C = (Input & (this.Cart.PRG_Size*2-1));
																	return;
															case 7: //PRG ($A000 - $BFFF)
																	this.Cart.Mapper_4_BankA = (Input & (this.Cart.PRG_Size*2-1));
																	return;
													}
													return;
											case 0xA000:
													this.Cart.Mapper_4_NametableMirroring = (Input & 1) === 1;
													return;
											case 0xA001:
													this.Cart.Mapper_4_PRGRAMProtect = Input;
													return;
											case 0xC000:
													this.Cart.Mapper_4_IRQLatch = Input;
													return;
											case 0xC001:
													this.Cart.Mapper_4_IRQCounter = 0xFF;
													this.Cart.Mapper_4_ReloadIRQCounter = true;
													return;
											case 0xE000:
													this.Cart.Mapper_4_EnableIRQ = false;
													this.IRQ_LevelDetector = false;
													return;
											case 0xE001:
													this.Cart.Mapper_4_EnableIRQ = true;
													return;
									}
							}
							break;
					case 7: //AOROM
							if (Address >= 0x8000)
							{
									this.Cart.Mapper_7_BankSelect = Input;
							}
							break;
					case 9: //MMC2
							if (Address < 0xA000)
							{
									// nothing
							}
							else if(Address < 0xB000) // PRG Bank select
							{
									this.Cart.Mapper_9_BankSelect = (Input & 0x0F);
							}
							else if(Address < 0xC000) // CHR0 Bank select
							{
									this.Cart.Mapper_9_CHR0_FD = (Input & 0x1F);
							}
							else if (Address < 0xD000) // CHR0 Bank select
							{
									this.Cart.Mapper_9_CHR0_FE = (Input & 0x1F);
							}
							else if (Address < 0xE000) // CHR1 Bank select
							{
									this.Cart.Mapper_9_CHR1_FD = (Input & 0x1F);
							}
							else if (Address < 0xF000) // CHR1 Bank select
							{
									this.Cart.Mapper_9_CHR1_FE = (Input & 0x1F);
							}
							else // Nametable mirroring
							{
									this.Cart.Mapper_9_NametableMirroring = (Input & 0x1) === 1;
							}
							break;
					case 69://Sunsoft FME-7 (used in Gimmick)
							if (Address >= 0x6000)
							{
									//actions
									if (Address < 0x8000)
									{
											if (this.Cart.Mapper_69_Bank_6_isRAM)
											{
													if (this.Cart.Mapper_69_Bank_6_isRAMEnabled)
													{
															//writing to this.RAM
															this.Cart.PRGRAM[Address & 0x1FFF] = Input;
													} //else, writing to open bus
											} //else it's ROM. writing here does nothing.
									}
									else if (Address < 0xA000)
									{
											this.Cart.Mapper_69_CMD = (Input & 0x0F);
									}
									else if (Address < 0xC000)
									{
											switch (this.Cart.Mapper_69_CMD)
											{
													case 0: this.Cart.Mapper_69_CHR_1K0 = Input; break;
													case 1: this.Cart.Mapper_69_CHR_1K1 = Input; break;
													case 2: this.Cart.Mapper_69_CHR_1K2 = Input; break;
													case 3: this.Cart.Mapper_69_CHR_1K3 = Input; break;
													case 4: this.Cart.Mapper_69_CHR_1K4 = Input; break;
													case 5: this.Cart.Mapper_69_CHR_1K5 = Input; break;
													case 6: this.Cart.Mapper_69_CHR_1K6 = Input; break;
													case 7: this.Cart.Mapper_69_CHR_1K7 = Input; break;
													case 8: this.Cart.Mapper_69_Bank_6 = (Input & 0x3F); this.Cart.Mapper_69_Bank_6_isRAM = (Input & 0x40) !== 0; this.Cart.Mapper_69_Bank_6_isRAMEnabled = (Input & 0x80) !== 0; break;
													case 9: this.Cart.Mapper_69_Bank_8 = (Input & 0x3F); break;
													case 10: this.Cart.Mapper_69_Bank_A = (Input & 0x3F); break;
													case 11: this.Cart.Mapper_69_Bank_C = (Input & 0x3F); break;
													case 12: this.Cart.Mapper_69_NametableMirroring = (Input & 0x3); break;
													case 13: this.Cart.Mapper_69_EnableIRQ = (Input & 0x1) !== 0; this.Cart.Mapper_69_EnableIRQCounterDecrement = (Input & 0x80) !== 0; this.IRQ_LevelDetector = false; break;
													case 14: this.Cart.Mapper_69_IRQCounter = ((this.Cart.Mapper_69_IRQCounter & 0xFF00) | Input); break;
													case 15: this.Cart.Mapper_69_IRQCounter = ((this.Cart.Mapper_69_IRQCounter & 0xFF) | (Input << 8)); break;
											}
									} // else do nothing
							}
							break;
			}
	}

	// these functions are used inside the giant opcode switch statement.

	GetImmediate()
	{
			// this.Fetch the value at the program counter, store it in the DataLatch, and increment the Program Counter.
			this.dl = this.Fetch(this.programCounter);
			this.programCounter = (this.programCounter + 1) & 0xFFFF;
			this.addressBus = this.programCounter;
	}

	GetAddressAbsolute()
	{
			// this.Fetch the value at the PC, and write to either the High byte or Low byte of the 16 bit address bus. Also increment the Program Counter.
			if (this.operationCycle === 1)
			{
					// fetch address low
					this.dl = this.Fetch(this.programCounter);
			}
			else
			{
					// fetch address high
					this.addressBus = (this.dl | (this.Fetch(this.programCounter) << 8));
			}
			this.programCounter = (this.programCounter + 1) & 0xFFFF;
	}

	GetAddressZeroPage()
	{
			// this.Fetch the value at the PC, and this 8 bit value replaces the contents of the 16 bit address bus.
			this.addressBus = this.Fetch(this.programCounter);
			this.programCounter = (this.programCounter + 1) & 0xFFFF;
	}

	GetAddressIndOffX()
	{
			// this.Fetch the value from the PC, then using that value as an 8-bit address on the zero page, add the this.X register, then set the High byte and Low byte of the Address Bus from there.
			switch (this.operationCycle)
			{
					case 1: // fetch pointer address
							this.addressBus = this.Fetch(this.programCounter);
							this.programCounter = (this.programCounter + 1) & 0xFFFF;
							break;
					case 2: // Add this.X
							// dummy read
							this.Fetch(this.addressBus);
							this.addressBus = (this.addressBus + this.X) & 0xFF;
							break;
					case 3: // fetch address low
							this.dl = this.Fetch((this.addressBus) & 0xFF);
							break;
					case 4: // fetch address high
							this.addressBus = (this.dl | (this.Fetch(((this.addressBus + 1) & 0xFF)) << 8));
							break;
			}
	}

	GetAddressIndOffY(TakeExtraCycleOnlyIfPageBoundaryCrossed)
	{
			// Some instructions will always take 4 cycles to determine the address, and others will normally take 3, but take the extra cycle if a page boundary was crossed.

			// either way, the general gist of this function is:
			// this.Fetch the value from the PC. use that 8 bit location on the zero page to fetch the High and Low byte of the new Address Bus location, then add this.Y to that.
			if (TakeExtraCycleOnlyIfPageBoundaryCrossed)
			{
					switch (this.operationCycle)
					{
							case 1: // fetch pointer address
									this.addressBus = this.Fetch(this.programCounter);
									this.programCounter = (this.programCounter + 1) & 0xFFFF;
									break;
							case 2: // fetch address low
									this.dl = this.Fetch((this.addressBus & 0xFF));
									break;
							case 3: // fetch address high, add this.Y to low byte
									this.addressBus = (this.dl | (this.Fetch(((this.addressBus + 1) & 0xFF)) << 8));
									this.temporaryAddress = this.addressBus;
									this.H = (this.addressBus >> 8);
									if (((this.temporaryAddress + this.Y) & 0xFF00) === (this.temporaryAddress & 0xFF00))
									{
											this.operationCycle++; //skip next cycle
									}
									this.addressBus = ((this.addressBus & 0xFF00) | ((this.addressBus + this.Y) & 0xFF));
									break;
							case 4: // increment high byte
									this.dl = this.Fetch(this.addressBus); // dummy read
									this.H = (this.addressBus >> 8);
									this.H = (this.H + 1) & 0xFF; // This is incremented.
									this.addressBus += 0x100;
									this.addressBus &= 0xFFFF;
									break;
					}
			}
			else
			{
					switch (this.operationCycle)
					{
							case 1: // fetch pointer address
									this.addressBus = this.Fetch(this.programCounter);
									this.programCounter = (this.programCounter + 1) & 0xFFFF;
									break;
							case 2: // fetch address low
									this.dl = this.Fetch((this.addressBus & 0xFF));
									break;
							case 3: // fetch address high, add this.Y to low byte
									this.addressBus = (this.dl | (this.Fetch(((this.addressBus + 1) & 0xFF)) << 8));
									this.temporaryAddress = this.addressBus;
									this.addressBus = ((this.addressBus & 0xFF00) | ((this.addressBus + this.Y) & 0xFF));
									break;
							case 4: // increment high byte
									this.dl = this.Fetch(this.addressBus); // dummy read
									this.H = (this.addressBus >> 8);
									this.H = (this.H + 1) & 0xFF; // This is incremented.
									if (((this.temporaryAddress + this.Y) & 0xFF00) !== (this.temporaryAddress & 0xFF00))
									{
											this.addressBus += 0x100; // really, this would just replace the high byte with this.H, but this is less computationally expensive
											this.addressBus &= 0xFFFF;
									}
									break;
					}
			}

	}

	GetAddressZPOffX()
	{
			// this.Fetch the value from the PC, then add this.X to that.
			if (this.operationCycle === 1)
			{
					// fetch address
					this.addressBus = this.Fetch(this.programCounter);
					this.programCounter = (this.programCounter + 1) & 0xFFFF;
			}
			else
			{
					// dummy read, and add this.X
					this.dl = this.Fetch(this.addressBus);
					this.addressBus = (this.addressBus + this.X) & 0xFF;
			}
	}

	GetAddressZPOffY()
	{
			// this.Fetch the value from the PC, then add this.Y to that.
			if (this.operationCycle === 1)
			{
					// fetch address
					this.addressBus = this.Fetch(this.programCounter);
					this.programCounter = (this.programCounter + 1) & 0xFFFF;
			}
			else
			{
					// dummy read, and add this.Y
					this.dl = this.Fetch(this.addressBus);
					this.addressBus = (this.addressBus + this.Y) & 0xFF;
			}
	}

	GetAddressAbsOffX(TakeExtraCycleIfPageBoundaryCrossed)
	{
			// Some instructions will always take 4 cycles to determine the address, and others will normally take 3, but take the extra cycle if a page boundary was crossed.

			// this.Fetch the High and Low byte values from the byte at the PC, then add this.X.
			if (TakeExtraCycleIfPageBoundaryCrossed)
			{
					switch (this.operationCycle)
					{
							case 1: // fetch address low
									this.dl = this.Fetch(this.programCounter);
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 2: // fetch address high, add this.Y to low byte
									this.addressBus = (this.dl | this.Fetch(this.programCounter) << 8);
									this.temporaryAddress = this.addressBus;
									this.H = (this.addressBus >> 8);

									if (((this.temporaryAddress + this.X) & 0xFF00) === (this.temporaryAddress & 0xFF00))
									{
											this.operationCycle++; //skip next cycle
											this.FixHighByte = false;
									}
									else
									{
											this.FixHighByte = true;
									}

									this.addressBus = ((this.addressBus & 0xFF00) | ((this.addressBus + this.X) & 0xFF));
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 3: // increment high byte
									this.dl = this.Fetch(this.addressBus);
									this.H = (this.addressBus >> 8);
									this.H = (this.H + 1) & 0xFF;
									if (this.FixHighByte)
									{
											this.addressBus += 0x100;
											this.addressBus &= 0xFFFF;
									}
									break;
							case 4: // dummy read
									this.dl = this.Fetch(this.addressBus); // read into pd
									break;
					}
			}
			else
			{
					switch (this.operationCycle)
					{
							case 1: // fetch address low
									this.dl = this.Fetch(this.programCounter);
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 2: // fetch address high, add this.Y to low byte
									this.addressBus = (this.dl | this.Fetch(this.programCounter) << 8);
									this.temporaryAddress = this.addressBus;
									this.addressBus = ((this.addressBus & 0xFF00) | ((this.addressBus + this.X) & 0xFF));
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 3: // fix high byte if applicable
									this.dl = this.Fetch(this.addressBus); // read into pd
									this.H = (this.addressBus >> 8);
									this.H = (this.H + 1) & 0xFF;
									if (((this.temporaryAddress + this.X) & 0xFF00) !== (this.temporaryAddress & 0xFF00))
									{
											this.addressBus += 0x100;
											this.addressBus &= 0xFFFF;
									}
									break;
							case 4: // dummy read
									this.dl = this.Fetch(this.addressBus); // read into pd
									break;
					}
			}
	}
	FixHighByte = false;
	GetAddressAbsOffY(TakeExtraCycleIfPageBoundaryCrossed)
	{
			// Some instructions will always take 4 cycles to determine the address, and others will normally take 3, but take the extra cycle if a page boundary was crossed.

			// this.Fetch the High and Low byte values from the byte at the PC, then add this.Y.
			if (TakeExtraCycleIfPageBoundaryCrossed)
			{
					switch (this.operationCycle)
					{
							case 1: // fetch address low
									this.dl = this.Fetch(this.programCounter);
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 2: // fetch address high, add this.Y to low byte
									this.addressBus = (this.dl | this.Fetch(this.programCounter) << 8);
									this.temporaryAddress = this.addressBus;
									this.H = (this.addressBus >> 8);

									if (((this.temporaryAddress + this.Y) & 0xFF00) === (this.temporaryAddress & 0xFF00))
									{
											this.operationCycle++; //skip next cycle
											this.FixHighByte = false;
									}
									else
									{
											this.FixHighByte = true;
									}

									this.addressBus = ((this.addressBus & 0xFF00) | ((this.addressBus + this.Y) & 0xFF));
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 3: // increment high byte
									this.dl = this.Fetch(this.addressBus);
									this.H = (this.addressBus >> 8);
									this.H = (this.H + 1) & 0xFF;
									if (this.FixHighByte)
									{
											this.addressBus += 0x100;
											this.addressBus &= 0xFFFF;
									}
									break;
							case 4: // dummy read
									this.dl = this.Fetch(this.addressBus); // read into databus
									break;
					}
			}
			else
			{
					switch (this.operationCycle)
					{
							case 1: // fetch address low
									this.dl = this.Fetch(this.programCounter);
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 2: // fetch address high, add this.Y to low byte
									this.addressBus = (this.dl | this.Fetch(this.programCounter) << 8);
									this.temporaryAddress = this.addressBus;
									this.addressBus = ((this.addressBus & 0xFF00) | ((this.addressBus + this.Y) & 0xFF));
									this.programCounter = (this.programCounter + 1) & 0xFFFF;

									break;
							case 3: // fix high byte if applicable
									this.dl = this.Fetch(this.addressBus); // read into pd
									this.H = (this.addressBus >> 8);
									this.H = (this.H + 1) & 0xFF;
									if (((this.temporaryAddress + this.Y) & 0xFF00) !== (this.temporaryAddress & 0xFF00))
									{
											this.addressBus += 0x100;
											this.addressBus &= 0xFFFF;
									}
									break;
							case 4: // dummy read
									this.dl = this.Fetch(this.addressBus); // read into pd
									break;
					}
			}
	}

	// This is not every instruction!!!
	// These are just the ones that have frequently repeated logic.
	// Instructions like STA just simply `Store(A, Address);`, which doesn't need a jump somewhere to do that.
	// Many undocumented opcodes have unique behavior that is also jsut handled in the switch statement, instead of jumping to a unique function.

	Op_ORA(Input)
	{
			// Bitwise OR this.A with some value
			this.A |= Input;
			this.flag_Negative = this.A >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;     // if all bits are cleared
	}

	Op_ASL(Input, Address)
	{
			// Arithmetic shift left.
			this.flag_Carry = Input >= 0x80;    // If bit 7 was set before the shift
			Input <<= 1;
			Input &= 0xFF;
			this.Store(Input, Address);         // store the result at the target address
			this.flag_Negative = Input >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = Input === 0x00;     // if all bits are cleared
	}

	Op_ASL_A()
	{
			// Arithemtic shift left the Accumulator
			this.flag_Carry = this.A >= 0x80;    // If bit 7 was set before the shift
			this.A <<= 1;
			this.A &= 0xFF;
			this.flag_Negative = this.A >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;     // if all bits are cleared
	}

	Op_SLO(Input, Address)
	{
			// Undocumented Opcode: equivalent to ASL + ORA
			this.Op_ASL(Input, Address);
			this.Op_ORA(this.dataBus);
	}

	Op_AND(Input)
	{
			// Bitwise AND with this.A
			this.A &= Input;
			this.flag_Negative = this.A >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;     // if all bits are cleared
	}

	Op_ROL(Input, Address)
	{
			// Rotate Left
			let Futureflag_Carry = Input >= 0x80;
			Input <<= 1;
			Input &= 0xFF;
			if (this.flag_Carry)
			{
					Input |= 1; // Put the old carry flag value into bit 0
			}
			this.Store(Input, Address);         // store the result at the target address
			this.flag_Carry = Futureflag_Carry; // if bit 7 of the initial value was set
			this.flag_Negative = Input >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = Input === 0x00;     // if all bits are cleared
	}

	Op_ROL_A()
	{
			// Rotate Left the Accumulator
			let Futureflag_Carry = this.A >= 0x80;
			this.A <<= 1;
			this.A &= 0xFF;
			if (this.flag_Carry)
			{
					this.A |= 1; // Put the old carry flag value into bit 0
			}
			this.flag_Carry = Futureflag_Carry; // if bit 7 of the initial value was set
			this.flag_Negative = this.A >= 0x80;     // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;         // if all bits are cleared
	}

	Op_RLA(Input, Address)
	{
			// Undocumented Opcode: equivalent to ROL + AND
			this.Op_ROL(Input, Address);
			this.Op_AND(this.dataBus);
	}

	Op_EOR(Input)
	{
			// Bitwise Exclusive OR this.A
			this.A ^= Input;
			this.flag_Negative = this.A >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;     // if all bits are cleared
	}

	Op_LSR(Input, Address)
	{
			// Logical Shift Right
			this.flag_Carry = (Input & 1) === 1; // If bit 0 of the initial value is set
			Input >>= 1;
			this.Store(Input, Address);         // store the result at the target address
			this.flag_Negative = Input >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = Input === 0x00;     // if all bits are cleared
	}

	Op_LSR_A()
	{
			// Logical Shift Right the Accumulator
			this.flag_Carry = (this.A & 1) === 1; // If bit 0 of the initial value is set
			this.A >>= 1;
			this.flag_Negative = this.A >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;     // if all bits are cleared
	}

	Op_SRE(Input, Address)
	{
			// Undocumented Opcode: equivalent to LSR + EOR
			this.Op_LSR(Input, Address);
			this.Op_EOR(this.dataBus);
	}

	Op_ADC(Input)
	{
			// Add with Carry
			let Intput = Input + this.A + (this.flag_Carry ? 1 : 0);
			this.flag_Overflow = (~(this.A ^ Input) & (this.A ^ Intput) & 0x80) !== 0;
			this.flag_Carry = Intput > 0xFF;
			this.A = Intput & 0xFF;
			this.flag_Negative = this.A >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;     // if all bits are cleared
	}

	Op_ROR(Input, Address)
	{
			// Rotate Right
			let FutureFlag_Carry = (Input & 1) === 1; // if bit 0 was set before the shift
			Input >>= 1;
			if (this.flag_Carry)
			{
					Input |= 0x80;  // put the old carry flag into bit 7
			}
			this.Store(Input, Address);
			this.flag_Carry = FutureFlag_Carry; // if bit 0 was set before the shift
			this.flag_Negative = Input >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = Input === 0x00;     // if all bits are cleared
	}

	Op_ROR_A()
	{
			let FutureFlag_Carry = (this.A & 1) === 1;
			this.A >>= 1;
			if (this.flag_Carry)
			{
					this.A |= 0x80;  // put the old carry flag into bit 7
			}
			this.flag_Carry = FutureFlag_Carry; // if bit 0 was set before the shift
			this.flag_Negative = this.A >= 0x80;     // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;         // if all bits are cleared
	}

	Op_RRA(Input, Address)
	{
			// Undocumented Opcode: equivalent to ROR + ADC
			this.Op_ROR(Input, Address);
			this.Op_ADC(this.dataBus);
	}

	Op_CMP(Input)
	{
			// Compare this.A
			this.flag_Zero = this.A === Input; // if this.A is equal to the value being compared
			this.flag_Carry = this.A >= Input;// if this.A is greater than the value being compared
			this.flag_Negative = (((this.A - Input) & 0xFF) >= 0x80); // if this.A - the value being compared would leave bit 7 set
	}

	Op_CPY(Input)
	{
			// Compare this.Y
			this.flag_Zero = this.Y === Input; // if this.Y is equal to the value being compared
			this.flag_Carry = this.Y >= Input;// if this.Y is greater than the value being compared
			this.flag_Negative = (((this.Y - Input) & 0xFF) >= 0x80); // if this.Y - the value being compared would leave bit 7 set
	}

	Op_CPX(Input)
	{
			// Compare this.X
			this.flag_Zero = this.X === Input; // if this.X is equal to the value being compared
			this.flag_Carry = this.X >= Input;// if this.X is greater than the value being compared
			this.flag_Negative = (((this.X - Input) & 0xFF) >= 0x80); // if this.X - the value being compared would leave bit 7 set
	}

	Op_SBC(Input)
	{
			// Subtract with Carry
			let Intput = this.A - Input;
			if (!this.flag_Carry)
			{
					Intput -= 1;
			}
			this.flag_Overflow = ((this.A ^ Input) & (this.A ^ Intput) & 0x80) !== 0;
			this.flag_Carry = Intput >= 0;
			this.A = Intput & 0xFF;
			this.flag_Negative = this.A >= 0x80; // if bit 7 of the result is set
			this.flag_Zero = this.A === 0x00;     // if all bits are cleared
	}

	Op_INC(Address)
	{
			// Increment
			this.dl = (this.dl + 1) & 0xFF;   // The value read is currently stored in the PreDecode register
			this.flag_Zero = this.dl === 0;        // if all bits are cleared
			this.flag_Negative = this.dl >= 0x80; // if bit 7 of the result is set
			this.Store(this.dl, Address);

	}

	Op_DEC(Address)
	{
			// Decrement
			this.dl = (this.dl - 1) & 0xFF;  // The value read is currently stored in the PreDecode register
			this.flag_Zero = this.dl === 0;        // if all bits are cleared
			this.flag_Negative = this.dl >= 0x80; // if bit 7 of the result is set
			this.Store(this.dl, Address);

	}

	constructor()
	{
			this.A = 0;  // The this.A, this.X, and this.Y registers are all initialized with 0 when the console boots up.
			this.X = 0;
			this.Y = 0;
		
			// set up this.RAM and this.PPU this.RAM Pattern
			let i = 0;
			while (i < 0x800)
			{
					let j = i & 0x2;
					let swap = (i & 0x1F) >= 0x10;
					if (j < 0x2 === !swap)
					{
							this.PPU[i] = 0xF0;
							this.RAM[i] = 0xF0;
					}
					else
					{
							this.PPU[i] = 0x0F;
							this.RAM[i] = 0x0F;
					}
					i++;
			}

			const BlarggPalette = false; // There's a this.PPU test cartridge that expects a very specific palette when you power on the console.
			if (BlarggPalette)
			{
					//use the palette that Blargg's NES uses
					this.PaletteRAM[0x00] = 0x09;
					this.PaletteRAM[0x01] = 0x01;
					this.PaletteRAM[0x02] = 0x00;
					this.PaletteRAM[0x03] = 0x01;
					this.PaletteRAM[0x04] = 0x00;
					this.PaletteRAM[0x05] = 0x02;
					this.PaletteRAM[0x06] = 0x02;
					this.PaletteRAM[0x07] = 0x0D;
					this.PaletteRAM[0x08] = 0x08;
					this.PaletteRAM[0x09] = 0x10;
					this.PaletteRAM[0x0A] = 0x08;
					this.PaletteRAM[0x0B] = 0x24;
					this.PaletteRAM[0x0C] = 0x00;
					this.PaletteRAM[0x0D] = 0x00;
					this.PaletteRAM[0x0E] = 0x04;
					this.PaletteRAM[0x0F] = 0x2C;
					this.PaletteRAM[0x10] = 0x09;
					this.PaletteRAM[0x11] = 0x01;
					this.PaletteRAM[0x12] = 0x34;
					this.PaletteRAM[0x13] = 0x03;
					this.PaletteRAM[0x14] = 0x00;
					this.PaletteRAM[0x15] = 0x04;
					this.PaletteRAM[0x16] = 0x00;
					this.PaletteRAM[0x17] = 0x14;
					this.PaletteRAM[0x18] = 0x08;
					this.PaletteRAM[0x19] = 0x3A;
					this.PaletteRAM[0x1A] = 0x00;
					this.PaletteRAM[0x1B] = 0x02;
					this.PaletteRAM[0x1C] = 0x00;
					this.PaletteRAM[0x1D] = 0x20;
					this.PaletteRAM[0x1E] = 0x2C;
					this.PaletteRAM[0x1F] = 0x08;
			}
			else // Except my actual console has a different palette than Blargg, so I use this palette instead.
			{
					// use the palette that my NES uses
					this.PaletteRAM[0x00] = 0x00;
					this.PaletteRAM[0x01] = 0x00;
					this.PaletteRAM[0x02] = 0x28;
					this.PaletteRAM[0x03] = 0x00;
					this.PaletteRAM[0x04] = 0x00;
					this.PaletteRAM[0x05] = 0x08;
					this.PaletteRAM[0x06] = 0x00;
					this.PaletteRAM[0x07] = 0x00;
					this.PaletteRAM[0x08] = 0x00;
					this.PaletteRAM[0x09] = 0x01;
					this.PaletteRAM[0x0A] = 0x01;
					this.PaletteRAM[0x0B] = 0x20;
					this.PaletteRAM[0x0C] = 0x00;
					this.PaletteRAM[0x0D] = 0x08;
					this.PaletteRAM[0x0E] = 0x00;
					this.PaletteRAM[0x0F] = 0x02;
					this.PaletteRAM[0x10] = 0x00;
					this.PaletteRAM[0x11] = 0x00;
					this.PaletteRAM[0x12] = 0x00;
					this.PaletteRAM[0x13] = 0x00;
					this.PaletteRAM[0x14] = 0x00;
					this.PaletteRAM[0x15] = 0x02;
					this.PaletteRAM[0x16] = 0x21;
					this.PaletteRAM[0x17] = 0x00;
					this.PaletteRAM[0x18] = 0x00;
					this.PaletteRAM[0x19] = 0x00;
					this.PaletteRAM[0x1A] = 0x00;
					this.PaletteRAM[0x1B] = 0x00;
					this.PaletteRAM[0x1C] = 0x00;
					this.PaletteRAM[0x1D] = 0x10;
					this.PaletteRAM[0x1E] = 0x00;
					this.PaletteRAM[0x1F] = 0x00;
			}

			this.programCounter = 0xFFFF; // Technically, this value is nondeterministic. It also doesn't matter where it is, as it will be initialized in the RESET instruction.
			this.PPU_Scanline = 0;        // The this.PPU begins on dot 0 of scanline 0
			this.PPU_Dot = 7;       // Shouldn't this be 0? I don't know why, but this passes all the tests if this is 7, so...?

			this.PPU_OddFrame = true;    // And this is technically cconsidered an "odd" frame when it comes to even/odd frame timing.

			this.APU_DMC_SampleAddress = 0xC000;
			this.APU_DMC_AddressCounter = 0xC000;

			this.APU_DMC_SampleLength = 1;
			this.APU_DMC_ShifterBitsRemaining = 8;
			this.APU_ChannelTimer_DMC = Emulator.APU_DMCRateLUT[0];
			this.DoReset = true; // This is used to force the first instruction at power on to be the RESET instruction.
			this.PPU_RESET = true;
			
			this.shiftRegister = 1;
	}
}
