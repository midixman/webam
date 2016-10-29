WebAM
================================================================================================================================
WebAM is "**Web** **A**udio and **M**IDI" in [TypeScript](https://www.typescriptlang.org/)/JavaScript; currently the emphasis is on [General MIDI](https://en.wikipedia.org/wiki/General_MIDI) interactive playback using [_SoundFont_](https://en.wikipedia.org/wiki/SoundFont) (__.sf2__) files (and for now it is not intended to play [General MIDI files](https://www.cs.cmu.edu/~music/cmsip/readings/Standard-MIDI-file-format-updated.pdf)!)

Currently the timing is provided via [WAAClock](https://github.com/sebpiq/WAAClock), and the SoundFont processing is based on [sf2synth.js](https://github.com/gree/sf2synth.js) (with several fixes).  The API tries to follow that in [MIDI.js](https://github.com/mudcube/MIDI.js/).

The basic technologies for WebAM are described in [Web MIDI API](https://webaudio.github.io/web-midi-api/) and [Web Audio API](https://webaudio.github.io/web-audio-api/).

**_NOTE: This software is still under major developments (alpha version) with no release number yet!_**

## Files
The source code of WebAM is __webam.ts__.
To incorporate it in an HTML file, a JavaScript file has been created with

    tsc webam.ts -t es5

with _tsc v2.0.3_ and taking out the "exports" line
```js
exports.WebAudioMidi = WebAudioMidi;
```
and `data.handleId`
```js
this.frmReq = (window.requestAnimationFrame(function () {
    _this.scheduleFrame();
})).data.handleId;
```
from the resulting __webam.js__.  An HTML file (__index.html__) has been provided as an example.  WebAM was tested so far using only the _Chrome_ browser (primarily version 54.0.2840.71 m (64-bit) on Windows PC and other versions on Android devices).

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
  wam.runTests(); // an example
  ...
}
```

You have to provide a General MIDI SoundFont file, and in this example, the file is __Chaos_V20.sf2__ (which can be obtained from [Some GM SoundFonts at SynthFont website](http://www.synthfont.com/soundfonts.html)) which is located in the directory __sf__.

Instead of using the _delay_ argument in the functions (see the API for Sound Generation methods), you can also use [WAAClock](https://github.com/sebpiq/WAAClock) directly for the timings; for example:
```js
let clock = new WAAClock(new AudioContext);
clock.start();
clock.setTimeout(function() {wam.noteOn (0, 60);}, 1);
clock.setTimeout(function() {wam.noteOff(0, 60);}, 2);
```
The latest was [WAAClock-latest.js](https://github.com/sebpiq/WAAClock/blob/master/dist/WAAClock-latest.js) as of Oct 12, 2016 (release 0.5).

## Examples
* [From the included index.html](https://midixman.github.io/)
* [From the included MusicEngine.html](https://midixman.github.io/MusicEngine.html)

**_NOTE: Because requestAnimationFrame is used for the MusicEngine, the WebAM browser tab has to be in focus for it to play normally.  (It cannot be in the background.)_**

## Similar Projects
* [SimpleSoundFontSynthHost](https://github.com/notator/SimpleSoundFontSynthHost)
* [Resident Sf2 Synth](https://github.com/notator/residentSf2Synth)

## Installation in Windows
In Windows you can use WebAM using the Web MIDI API part (instead of Web Audio API) by installing [CoolSoft VirtualMIDISynth](http://coolsoft.altervista.org/en/virtualmidisynth); some explanations are provided at [Enabling Sound in Windows at DrawMusic website](http://www.drawmusic.com/howtowrite/Enabling-Sound-Windows/).  Hopefully, the Windows built-in _Microsoft GS Wavetable SW Synth_ will be re-enabled by Google at some time in the future as discussed in "[Web MIDI Does Not Work on 43.0.2357.130](https://bugs.chromium.org/p/chromium/issues/detail?id=503270)".

Without any MIDI devices connected, WebAM will show a notification in the beginning, such as "No real MIDI output ports. (Sounds will be generated via SoundFont.)".

## SoundFont Files
For WebAM to work on any device under Chrome browser, you have to provide a General MIDI SoundFont file.  Here, we have used __Chaos_V20.sf2__ (11.9 MB).  In [Enabling Sound in Windows](http://www.drawmusic.com/howtowrite/Enabling-Sound-Windows/), they use __TimGM6mb.sf2__ (5.9 MB) which is one of the smallest General MIDI SoundFont files.  [sf2synth.js](https://github.com/gree/sf2synth.js), the current basis for the WebAM's Web Audio API part, uses __A320U.sf2__ (9.5 MB).

__Chaos_V20.sf2__ was selected because it is relatively small (some General MIDI SoundFont file sizes are about 1 TB!) and in my opinion, it has the best percussion sounds relative to its size.  You may experiment with other General MIDI SoundFont files by searching them in the Internet.

The SoundFont file format is described in "[SoundFont Technical Specification, Version 2.04, February 3, 2006](http://www.synthfont.com/sfspec24.pdf)".  A white paper by Dave Rossum is available as "[The SoundFont 2.0 File Format](http://freepats.zenvoid.org/sf2/sf20white.pdf)".

## API
### Creation

```js
let wam = new WebAudioMidi(callbackFunction, soundfontURL, optional WebamOptions options);

dictionary WebamOptions {
  optional boolean sysex;
  optional boolean software;
  optional boolean conolog;
  optional boolean engine;
}
```

_callbackFunction_ is a function that WebAM will call(back) once it is ready.

_soundfontURL_ is the URL for the SoundFont file.

In the optional _WebamOptions_, "`sysex`" and "`software`" correspond to those in Section 4.2 of Web MIDI API W3C Editor's Draft 09 June 2016 (http://webaudio.github.io/web-midi-api/), whereas "`conolog`" specifies whether WebAM prints to the console log.  If "`engine`" is `true` then WebAM also creates a _MusicEngine_ (see next section).  All these by default are `false`.

Example:
```js
let wam = new WebAudioMidi(callback, 'sf/Chaos_V20.sf2', {software: true, conolog: true});
```

### Member Accesses
```js
// Read-only
mAccess   : any         // MIDIAccess object in Web MIDI API
failureMsg: string      // if mAccess is null, provides the failure message
audioCtx  : any         // AudioContext object in Web Audio API
wClock    : any         // built-in WAAClock

musicEngn : MusicEngine // music engine

// Read and write
conolog       : boolean // whether WebAM prints to the console log
sconolog      : boolean // whether WebAM prints to the console log for sending (MIDI) data; by default it is false

dfltOutIdx    : number  // default output port index      (-1); negative means the last one
dfltNoteOnVel : number  // default MIDI note on velocity  (80)
dfltNoteOffVel: number  // default MIDI note off velocity (64)
dfltChnl      : number  // default MIDI channel           (0)
```

### List Methods
```js
listMIDIAccessProperties(optional string excludedType): string // list MIDI Access properties
listOutPorts            (optional string excludedType): string // list output ports
listInPorts             (optional string excludedType): string // list input ports
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
noteOn  (channel, note,    velocity = wam.dfltNoteOnVel, delay = 0, outIndex = wam.dfltOutIdx) : void
noteOff (channel, note,    delay = 0, outIndex = wam.dfltOutIdx, velocity = wam.dfltNoteOffVel): void

chordOn (channel, notes[], velocity = wam.dfltNoteOnVel, delay = 0, outIndex = wam.dfltOutIdx) : void
chordOff(channel, notes[], delay = 0, outIndex = wam.dfltOutIdx, velocity = wam.dfltNoteOffVel): void

programChange(channel, program, delay = 0, outIndex = wam.dfltOutIdx): void
```

In all the methods above, the _delay_ is in milliseconds and all the arguments are numbers (or arrays of numbers).

For any general MIDI message, you can also use
```js
send(message, delay = 0, outIndex = wam.dfltOutIdx): void
```
or
```js
sendAt(message, at = wam.audioCtx.currentTime, outIndex: number = wam.dfltOutIdx): void
```
While the _delay_ (relative time) is in milliseconds, the _at_ (absolute time) is in seconds!  Therefore, for example, the `noteOn(c, n, v, d, o)` method is identical to `send([0x90 + c, n, v], d, o)` and `sendAt([0x90 + c, n, v], wam.audioCtx.currentTime + d/1000, o)`.


Music Engine
================================================================================================================================
If you want tighter timings (or if you don't want to manage timings by yourself), the _WebamOptions_ also includes `engine`, which if is set to `true`, then WebAM also creates a _MusicEngine_:
```js
let wam = new WebAudioMidi(callback, 'sf/Chaos_V20.sf2', {engine: true});
let me = wam.musicEngn;
```

Or, we can combine them into a single line:
```js
let me = (new WebAudioMidi(callback, 'sf/Chaos_V20.sf2', {engine: true})).musicEngn;
```

The event scheduling in the music engine is based on the article "[A Tale of Two Clocks - Scheduling Web Audio with Precision](https://www.html5rocks.com/en/tutorials/audio/scheduling/)" by Chris Wilson.

However, if _MusicEngine_ is included, and you want to use WebAM Sound Generation methods, you will have to start the clock manually first:
```js
wam.wClock.start();
```
before you call those methods.

Because `requestAnimationFrame()` is used in _MusicEngine_ to provide the timeouts, one drawback is that the WebAM browser tab has to be in focus for it to play normally (i.e., it cannot be in the background). 

## API

### Member Accesses
```js
// Read-only
webAM: WebAudioMidi // WebAM object

// Read and write
conolog: boolean // whether MusicEngine prints to the console log

quanPerQuarterNote: number // quantizationn per quarter note (24)
lookaheadTime     : number // lookahead time (sec)

tempo      : number // in bpm (beats per minute); must be greater than zero; can be fraction
numerator  : number // numerator in time signature (how many beats in each measure)
denominator: number // denominator in time signature (note value for each beat)
```

### The "Tune" Structure
To play something with _MusicEngine_, you have to create a "_tune_", and _load( )_ it.  A _tune_ is an object which consists of arbitrary number of tracks, as described below:
```js
load(TuneInterface tune): void

dictionary TuneInterface {
  optional number tempo;       // in bpm (by default 120)
  optional number numerator;   // numerator in time signature (by default 4)
  optional number denominator; // denominator in time signature (by default 4)

  TrackInterface tracks[];     // array of TrackInterface
}

dictionary TrackInterface {
  optional number  program;     // General MIDI program number (0 - 127)
  optional number  channel;     // MIDI channel (by default wam.dfltChnl)
  optional boolean pitchChange; // TBD: for transpose and octave (by default true)
  optional number  outIndex;    // output port index (by default wam.dfltOutIdx)
  optional number  repeat;      // how many times this track will be repeated if shorter than other tracks
                                // if less than 1, it implies it will be repeated for the whole tune length

  NoteInterface    notes[];     // array of NoteInterface
}

array NodeInterface [
  number note,
  optional number duration,
  optional number velocity
]
```
A _NoteInterface_ is an array which must have at least one member (_note_) and at most three members (with _duration_ and _velocity_):
* The _note_ represents a MIDI note (0 - 127).  If it is negative, it means it is a rest (or silence).
* The _duration_ represents the duration of the note in [note value](https://en.wikipedia.org/wiki/Note_value), such as 1/4, 1/8, or 1/2.  If it is omitted, by default it is equal to 1/4 (quarter note).
* The _velocity_ represents a MIDI velocity (0 - 127).  If it is omitted, by default it is equal to `wam.dfltNoteOnVel`.  And a _velocity_ of `0` also represents a rest.

Example:
```js
me.load({tempo: 120, tracks:
         [{channel: 0, notes: [[60], [64], [65], [67]], program: 53},
          {channel: 9, notes: [[36], [-1]], repeat: -1},
          {channel: 9, notes: [[-1], [38]], repeat: -1},
          {channel: 9, notes: [[42, 1/8]],  repeat: -1},
          {channel: 2, notes: [[36, 1/8], [48, 1/8]], repeat: -1, program: 32},
         ]});
```

### Transport Methods
```js
start(times = 1): void // from Stop state to Play state
pause()         : void // from Play state to Pause state
resume()        : void // from Pause state to Play state
stop()          : void // go to Stop state
```
In the `start()` method, the _times_ argument specifies how many times the _tune_ will be played.

Future Developments
================================================================================================================================
* It seems that music in Java/Clojure has progressed much more significantly; therefore the _string_ input notation for the Music Engine _tune_ may try to follow that in [JFugue](http://www.jfugue.org/), [semitone](https://github.com/benwbooth/semitone), [Alda](http://blog.djy.io/making-midi-sound-awesome-in-a-clojure-program/), and/or [Overtone](http://overtone.github.io/).
* It has been the original objective of this effort is to make the sound outputs to be identical as those of [CoolSoft VirtualMIDISynth](http://coolsoft.altervista.org/en/virtualmidisynth). [sf2synth.js](https://github.com/gree/sf2synth.js) is a great first attempt, but if you compare them in Windows, the sound outputs of them are different (VirtualMIDISynth sounds better). Hopefully, [Web Audio API](https://webaudio.github.io/web-audio-api/) contains the complete API that makes it possible to tweak the JavaScript codes so that the two sound identical.  (The drawbacks of VirtualMIDISynth are first, it has to be installed manually by the user, and second, it works only in Windows, whereas WebAM will work on any Chrome browser without any further installations.)

Other References
================================================================================================================================
* Wikipedia provides [comparison of free software for audio](https://en.wikipedia.org/wiki/Comparison_of_free_software_for_audio).
* YouTube provides some background in computer music in [Programming Music with Overtone - Sam Aaron](https://www.youtube.com/watch?v=imoWGsipe4k).
* Wikipedia also provides [musical notation](https://en.wikipedia.org/wiki/Musical_notation), [List of musical symbols](https://en.wikipedia.org/wiki/List_of_musical_symbols) and [ABC notation](https://en.wikipedia.org/wiki/ABC_notation).

License
================================================================================================================================
Copyright &copy; 2016 William D. Tjokroaminata All Rights Reserved.  
Licensed under the MIT License.
