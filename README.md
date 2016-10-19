# WebAM
WebAM is "**Web** **A**udio and **M**IDI" in TypeScript/JavaScript; currently the emphasis is on General MIDI interactive playback using _SoundFont_ (__.sf2__) files (and it is not intended to play General MIDI files!)

Currently the timing is provided via [WAAClock](https://github.com/sebpiq/WAAClock) and the SoundFont processing is based on [sf2synth.js](https://github.com/gree/sf2synth.js) (with some fixes).

## Files
The source code of WebAM is __webam.ts__.
To incorporate it in an HTML file, a JavaScript file has been created with

    tsc webam.ts -t es5

with _tsc v2.0.3_ and taking the last line
```js
exports.WebAudioMidi = WebAudioMidi;
```
out from the resulting __webam.js__.
An HTML file (__index.html__) has been provided as an example.  WebAM was tested using only the _Chrome_ browser (Version 54.0.2840.59  m (64-bit) on Windows PC and other versions on Android devices).

## How to Use
In your HTML:
```js
<script src="WAAClock-latest.js"></script>
<script src="webam.js"></script>
```

In your script:
```js
let wam = new WebAudioMidi(callback, 'sf/Chaos_V20.sf2');
function callback() {
  wam.runTests();
  ...
}
```

You have to provide a General MIDI SoundFont file, and in this example, the file is _Chaos_V20.sf2_ which is located in the directory _sf_.

Instead of using the _delay_ argument in the functions (see the API for Sound Generation methods), you can also use [WAAClock](https://github.com/sebpiq/WAAClock) directly for the timings:
```js
let clock = new WAAClock(new AudioContext);
clock.start();
clock.setTimeout(function() {wam.noteOn (0, 60);}, 1);
clock.setTimeout(function() {wam.noteOff(0, 60);}, 2);
```
The latest was [WAAClock-latest.js](https://github.com/sebpiq/WAAClock/blob/master/dist/WAAClock-latest.js) as of Oct 12, 2016 (release 0.5).

## Examples
- [From index.html](https://midixman.github.io/)

## Installation in Windows
In Windows you can use WebAM using the Web MIDI API part (instead of Web Audio API) by installing [CoolSoft VirtualMIDISynth](http://coolsoft.altervista.org/en/virtualmidisynth); some explanation is provided at [Enabling Sound in Windows](http://www.drawmusic.com/howtowrite/Enabling-Sound-Windows/).  Hopefully, the Windows built-in _Microsoft GS Wavetable SW Synth_ will be re-enabled by Google some time in the future as discussed in "[Web MIDI Does Not Work on 43.0.2357.130](https://bugs.chromium.org/p/chromium/issues/detail?id=503270)".

Without any MIDI devices connected, WebAM will show a notification in the beginning like "No real MIDI output ports. (Sound will be generated via SoundFont.)".

## SoundFont Files
For WebAM to work on any device under Chrome browser, we have to provide a General MIDI SoundFont file.  Here, we have used _Chaos_V20.sf2_ (11.9 MB).  In [Enabling Sound in Windows](http://www.drawmusic.com/howtowrite/Enabling-Sound-Windows/), they use _TimGM6mb.sf2_ (5.9 MB) which is one of the smallest General MIDI SoundFont files.  [sf2synth.js](https://github.com/gree/sf2synth.js), the current basis for the WebAM's Web Audio API part, uses _A320U.sf2_ (9.5 MB).

_Chaos_V20.sf2_ was chosen because it is relatively small (some General MIDI SoundFont file sizes are about 1 TB!) and in my opinion, it has the best percussion sounds relative to its size.  You may experiment with other General MIDI SoundFont files by searching them in the Internet.

## API
### Creation

```js
let wam = new WebAudioMidi(callbackFunction, soundfontURL, optional WebamOptions options);
dictionary WebamOptions {
  boolean sysex;
  boolean software;
  boolean conlog;
};
```

_callbackFunction_ is a function that WebAM will call(back) once it is ready.

_soundfontURL_ is the URL for the SoundFont file.

In the optioanl _WebamOptions_, "`sysex`" and "`software`" correspond to those in Section 4.2 of Web MIDI API W3C Editor's Draft 09 June 2016 (http://webaudio.github.io/web-midi-api/), whereas "`conlog`" specifies whether WebAM prints to the console log.  All these by default are `false`.

Example:
```js
let wam = new WebAudioMidi(callback, 'sf/Chaos_V20.sf2', {software: true, conlog: true});
```

### Member Accesses
```js
// Read-only
mAcc      : any    // MIDIAccess object in Web MIDI API
failureMsg: string // if mAcc is null, provides the failure message

// Read and write
dfltOutIdx    : number // default output port index (-1); negative means the last one
dfltNoteOnVel : number // default note on velocity  (80)
dfltNoteOffVel: number // default note off velocity (64)
```

### List Methods
```js
listMIDIAccessProperties(optional string excludedType): string // list MIDI Access properties
listOutPorts(optional string excludedType): string             // list output ports
listInPorts(optional string excludedType): string              // list input ports
```

All the methods above return a string.  The properties that are of type _excludedType_ will not be listed.

Example:
```js
console.log(wam.listMIDIAccessProperties('function'));
```

### Utility Methods
```js
noteToKey(number): string // 60 -> 'C4'
keyToNote(string): number // 'bb7' -> 106
```

In `noteToKey()`, it is assumed that the input is within the 0 to 127 range.  In `keyToNote()`, it is assumed that the first character is __A__ to __G__ (either upper or lower case), possibly followed by some '__#__' (which represents sharp) or '__b__' (which represents flat), and ended by an integer (which can be negative).

### Sound Generation Methods
```js
noteOn  (channel, note,    velocity = wam.dfltNoteOnVel, delay = 0, outIndex = wam.dfltOutIdx): void
noteOff (channel, note,    delay = 0, outIndex = wam.dfltOutIdx, velocity = wam.dfltNoteOffVel): void

chordOn (channel, notes[], velocity = wam.dfltNoteOnVel, delay = 0, outIndex = wam.dfltOutIdx): void
chordOff(channel, notes[], delay = 0, outIndex = wam.dfltOutIdx, velocity = wam.dfltNoteOffVel): void

programChange(channel, program, delay = 0, outIndex = wam.dfltOutIdx): void
```

In all the methods above, the _delay_ is in milliseconds and all the arguments are numbers (or arrays of numbers).

# License
Copyright &copy; 2016 William D. Tjokroaminata All Rights Reserved.  
Licensed under the MIT License.
