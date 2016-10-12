// ------- top of file -------

interface CallbackFunc {
  (): void;
}

interface WebamOptions {
  sysex?:    boolean;
  software?: boolean;
  conlog?:   boolean;
}

interface MIDIOptions {
  sysex?:    boolean;
  software?: boolean;
}

class MidiPort {
  constructor(readonly device: any, readonly port: any = null) {
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class WebAudioMidi {
  private _conlog: boolean = false; // flag whether console log is printed or not

  private _mAcc      : any    = null; // MIDI Access
  private _failureMsg: string = '';   // message of failure to obtain MIDI Access

  private _dfltOutIdx    : number = 0;  // default index of out port
  private _thruOutIdx    : number = 0;  // index of out port for MIDI thru
  private _dfltNoteOnVel : number = 80; // default note off velocity
  private _dfltNoteOffVel: number = 64; // default note off velocity

  private outDevices: any[] = [];    // output devices
  private inDevices : any[] = [];    // input devices

  private outPorts: MidiPort[] = []; // output ports
  private inPorts : MidiPort[] = []; // input ports

  constructor(callBack: CallbackFunc, opt: WebamOptions = null) {
    if (opt && opt.conlog)
      this._conlog = true;

    this.clog('WebAudioMidi is created...');
    let midiOpt: MIDIOptions = {};
    if (opt && opt.sysex) {
      midiOpt.sysex = true;
      this.clog('sysex is requested...');
    }
    if (opt && opt.software) {
      midiOpt.software = true;
      this.clog('software is requested...');
    }

    (<any>navigator).requestMIDIAccess(midiOpt).then(
      (midiAccess: any) => {
	this.clog('MIDI ready!');
	this._mAcc = midiAccess;
	this.storeDevices();
	this.putDevicesIntoPorts();
	this.startLoggingMidiInput();
	if (this.outPorts.length === 0)
	  alert('No MIDI output ports! (No sound will be produced.)');
	callBack();
      },
      (msg: string) => {
	alert('Failed to get MIDI access: ' + msg);
	this._failureMsg = msg;
	callBack();
      });
  }

  //----------------------------------------------------------------------------

  get mAcc(): any {
    return this._mAcc;
  }
  get failureMsg(): string {
    return this._failureMsg;
  }

  get dfltOutIdx(): number {
    return this._dfltOutIdx;
  }
  set dfltOutIdx(num: number) {
    this._dfltOutIdx = num;
  }
  get dfltNoteOnVel(): number {
    return this._dfltNoteOnVel;
  }
  set dfltNoteOnVel(num: number) {
    this._dfltNoteOnVel = num;
  }
  get dfltNoteOffVel(): number {
    return this._dfltNoteOffVel;
  }
  set dfltNoteOffVel(num: number) {
    this._dfltNoteOffVel = num;
  }
  //----------------------------------------------------------------------------

  noteOn(channel: number, note: number, velocity: number = this._dfltNoteOnVel, delay: number = 0,
	 outIndex: number = this._dfltOutIdx): void {
	   // delay in milliseconds
	   this.outPorts[outIndex].port.send([0x90 + channel, note, velocity], window.performance.now() + delay);
	 }
  noteOff(channel: number, note: number, delay: number = 0, outIndex: number = this._dfltOutIdx,
	  velocity: number = this._dfltNoteOffVel): void {
	    // delay in milliseconds
	    this.outPorts[outIndex].port.send([0x80 + channel, note, velocity], window.performance.now() + delay);
	  }
  chordOn(channel: number, notes: number[], velocity: number = this._dfltNoteOnVel, delay: number = 0,
	  outIndex: number = this._dfltOutIdx): void {
	    // delay in milliseconds
	    for (let n of notes)
	      this.outPorts[outIndex].port.send([0x90 + channel, n, velocity], window.performance.now() + delay);
	  }
  chordOff(channel: number, notes: number[], delay: number = 0, outIndex: number = this._dfltOutIdx,
	   velocity: number = this._dfltNoteOffVel): void {
	     // delay in milliseconds
	     for (let n of notes)
	       this.outPorts[outIndex].port.send([0x80 + channel, n, velocity], window.performance.now() + delay);
	   }
  programChange(channel: number, program: number, delay: number = 0, outIndex: number = this._dfltOutIdx): void {
    this.outPorts[outIndex].port.send([0xC0 + channel, program], window.performance.now() + delay);
  }

  //----------------------------------------------------------------------------

  noteToKey(num: number): string {
    // C4 is the "middle C": C-1(0), ..., A0(21), ..., C4(60), ..., C8(108), ..., G9(127)
    const keys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    return keys[num % 12] + Math.floor(num / 12 - 1);
  }
  keyToNote(key: string): number {
    // Upper/lower A - G, potentially # or b, and a number (with C4 as the "middle C")
    const note = [0, 2, 4, 5, 7, 9, 11];
    let num: number = key.charCodeAt(0);
    if (65 <= num && num <= 71) // A ... G
      num = note[(num - 4) % 7];
    else if (97 <= num && num <= 103) // a ... g
      num = note[(num - 1) % 7];
    else {
      alert('Error in input for keyToNote()');
      return -1;
    }
    if (key.charAt(1) == '#')
      num++;
    else if (key.charAt(1) == 'b')
      num--;
    return num + 12 * (parseInt(/\-?\d+/.exec(key)[0]) + 1);
  }

  //----------------------------------------------------------------------------

  listMIDIAccessProperties(excludedType: string = ''): string {
    let str: string = 'MIDIAccess:\n';

    if (! this._mAcc) {
      str += '\t' + this._failureMsg;
      return str;
    }

    for (let p in this._mAcc)
      if (typeof this._mAcc[p] !== excludedType)
	str += '\t' + p + ' (' + (typeof this._mAcc[p]) + '): "' + this._mAcc[p] + '"\n';

    str += 'MIDIAccess.outputs:\n';
    for(let p in this._mAcc.outputs)
      if (typeof this._mAcc.outputs[p] !== excludedType)
	str += '\t' + p + ' (' + (typeof this._mAcc.outputs[p]) + '): "' + this._mAcc.outputs[p] + '"\n';

    this._mAcc.outputs.forEach(function(output, key) {
      str += 'MIDIOutput ' + key + ':\n';
      for(let p in output)
	if (typeof output[p] !== excludedType)
	  str += '\t' + p + ' (' + (typeof output[p]) + '): "' + output[p] + '"\n';
    });

    str += 'MIDIAccess.inputs:\n';
    for(let p in this._mAcc.inputs)
      if (typeof this._mAcc.inputs[p] !== excludedType)
	str += '\t' + p + ' (' + (typeof this._mAcc.inputs[p]) + '): "' + this._mAcc.inputs[p] + '"\n';

    this._mAcc.inputs.forEach(function(input, key) {
      str += 'MIDIInput ' + key + ':\n';
      for(let p in input)
	if (typeof input[p] !== excludedType)
	  str += '\t' + p + ' (' + (typeof input[p]) + '): "' + input[p] + '"\n';
    });

    return str;
  }
  listOutPorts(excludedType: string = ''): string {
    let str: string = '';
    for (let r in this.outPorts) {
      str += 'Out Port ' + r + ' (MIDIOutput):\n';
      let output: any = this.outPorts[r].device;
      for(let p in output)
	if (typeof output[p] !== excludedType)
	  str += '\t' + p + ' (' + (typeof output[p]) + '): "' + output[p] + '"\n';
    }
    if (! str)
      str = '(No MIDI out ports!)';
    return str;
  }
  listInPorts(excludedType: string = ''): string {
    let str: string = '';
    for (let r in this.inPorts) {
      str += 'In Port ' + r + ' (MIDIInput):\n';
      let input: any = this.inPorts[r].device;
      for(let p in input)
	if (typeof input[p] !== excludedType)
	  str += '\t' + p + ' (' + (typeof input[p]) + '): "' + input[p] + '"\n';
    }
    if (! str)
      str = '(No MIDI in ports!)';
    return str;
  }

  //================================================================================================
  // Tests
  runTests() {
    let conlog = this._conlog;
    this._conlog = true;
    this.testNoteToKey();
    this.testkeyToNote();
    alert('WebAM tests completed. (See console log or Ctrl + Shift + J in Chrome.)');
    this._conlog = conlog;
  }
  testNoteToKey() {
    this.clog('Test noteToKey():');
    for (let n of [0, 21, 60, 108, 127]) {
      this.clog('\t', n, '->', this.noteToKey(n));
    }
  }
  testkeyToNote() {
    this.clog('Test keyToNote():');
    for (let k of ['C-1', 'f#2', 'c4', 'bb7', 'G9']) {
      this.clog('\t', k, '->', this.keyToNote(k));
    }
  }

  //================================================================================================
  // Private Methods

  private storeDevices(): void {
    this._mAcc.outputs.forEach((device, key) => {
      this.outDevices[key] = device;
    });
    this._mAcc.inputs.forEach((device, key) => {
      this.inDevices[key] = device;
    });
  }
  private putDevicesIntoPorts(): void {
    for (let d in this.outDevices)
      this.outPorts[d] = new MidiPort(this.outDevices[d], this._mAcc.outputs.get(d));
    for (let d in this.inDevices)
      this.inPorts[d] = new MidiPort(this.inDevices[d]);
  }
  private startLoggingMidiInput(deviceId: number = -1): void {
    if (deviceId < 0)
      this._mAcc.inputs.forEach((input) => {input.onmidimessage = (event) => {
	if (! (event.type === 'midimessage' && event.data != '248' && event.data != '254'))
	  return;
	this.outPorts[this._thruOutIdx].port.send(event.data);
	let str: string = '';
	str += this.midiEventStr(event);
	this.clog(str);
      };});
    else
      this.inPorts[deviceId].device.onmidimessage = (event) => {
	if (! (event.type === 'midimessage' && event.data != '248' && event.data != '254'))
	  return;
	this.outPorts[this._thruOutIdx].port.send(event.data);
	let str: string = '';
	str += this.midiEventStr(event);
	this.clog(str);
      };
  }
  private midiEventStr(event: any): string {
    return 'MIDI message received at ' + event.receivedTime + ' (' + (event.receivedTime - event.timeStamp) + ') for port ' +
      event.target.id + ' (' + event.target.name + ') with timeStamp ' + event.timeStamp + ' (' + event.data.length +
      ' bytes): ' + event.data;
  }
  private clog(...args) {
    if (this._conlog)
      console.log('WAM: ' + args.join(' '));
  }
}

// ------- end of file -------
