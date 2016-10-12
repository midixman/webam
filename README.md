# WebAM
Web Audio and MIDI in TypeScript/JavaScript

## Files
The source code of WebAM is webam.ts.
To incorporate it in an HTML file, a JavaScript file has been created with

    tsc webam.ts -t es5

and taking the last line (exports.WebAudioMidi = WebAudioMidi;) out from the resulting webam.js.
An HTML file (index.html) has been provided as an example.  WebAM was tested using only the Chrome browser (Version 53.0.2785.143 m (64-bit) on Windows PC).

## How to Use

```js
let wam = new WebAudioMidi(callback);
function callback() {
  wam.runTests();
}
```

## Installation on Windows
Before WebAM is completed, on Windows you can use WebAM by using the Web MIDI API part (instead of Web Audio API) by installing [CoolSoft VirtualMIDISynth](http://coolsoft.altervista.org/en/virtualmidisynth); some explanation is provided at [Enabling Sound in Windows](http://www.drawmusic.com/howtowrite/Enabling-Sound-Windows/).  Hopefully, the Windows built-in Microsoft GS Wavetable SW Synth will be re-enabled some time in the future as discussed in [Web MIDI Does Not Work on 43.0.2357.130](https://bugs.chromium.org/p/chromium/issues/detail?id=503270).

## API
### Creation

```js
let wam = new WebAudioMidi(callbackFunction, optional WebamOptions options);
dictionary WebamOptions {
  boolean sysex;
  boolean software;
  boolean conlog;
};
```

"sysex" and "software" correspond to those in Section 4.2 of Web MIDI API W3C Editor's Draft 09 June 2016 (http://webaudio.github.io/web-midi-api/).  "conlog" specifies whether WebAM prints to the console log.  All these by default are false.

Example
```js
let wam = new WebAudioMidi(callback, {software: true, conlog: true});
```

### Member Accesses
```js
// Read-only
mAcc       // MIDIAccess object in Web MIDI API
failureMsg // if mAcc is null, provides the failure message

// Read and write
dfltOutIdx     // default output port index (0)
dfltNoteOnVel  // default note on velocity  (80)
dfltNoteOffVel // default note off velocity (64)
```

### List Methods
```js
listMIDIAccessProperties(optional string excludedType) // list MIDI Access properties
listOutPorts(optional string excludedType)             // list output ports
listInPorts(optional string excludedType)              // list input ports
```

All the methods above return a string.  The properties that are of type "excludedType" will not be listed.

Example
```js
console.log(wam.listMIDIAccessProperties('function'));
```

### Utility Methods
```js
noteToKey(number) // 60 -> 'C4'
keyToNote(string) // 'bb7' -> 106
```

In noteToKey(), it is assumed that the input is within the 0 to 127 range.  In keyToNote(), it is assumed that the first character is A to G (either upper or lower case), followed by some '#' (which represents sharp) or 'b' (which represents flat), and ended by an integer (which can be negative).

### Music Methods
```js
noteOn  (channel, note,    velocity = wam.dfltNoteOnVel, delay = 0, outIndex = wam.dfltOutIdx)
noteOff (channel, note,    delay = 0, outIndex = wam.dfltOutIdx, velocity = wam.dfltNoteOffVel)

chordOn (channel, notes[], velocity = wam.dfltNoteOnVel, delay = 0, outIndex = wam.dfltOutIdx)
chordOff(channel, notes[], delay = 0, outIndex = wam.dfltOutIdx, velocity = wam.dfltNoteOffVel)

programChange(channel, program, delay = 0, outIndex = wam.dfltOutIdx)
```

In all the methods above, the delay is in milliseconds and all the arguments are numbers (or arrays of numbers).

Copyright &copy; 2016 William D. Tjokroaminata All Rights Reserved.
Licensed under the MIT License.
