// ------- top of file -------
"use strict";
var MidiPort = (function () {
    function MidiPort(device, port) {
        if (port === void 0) { port = null; }
        this.device = device;
        this.port = port;
    }
    return MidiPort;
}());
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var WebAudioMidi = (function () {
    function WebAudioMidi(callBack, opt) {
        var _this = this;
        if (opt === void 0) { opt = null; }
        this._conlog = false; // flag whether console log is printed or not
        this._mAcc = null; // MIDI Access
        this._failureMsg = ''; // message of failure to obtain MIDI Access
        this._dfltOutIdx = 0; // default index of out port
        this._thruOutIdx = 0; // index of out port for MIDI thru
        this._dfltNoteOnVel = 80; // default note off velocity
        this._dfltNoteOffVel = 64; // default note off velocity
        this.outDevices = []; // output devices
        this.inDevices = []; // input devices
        this.outPorts = []; // output ports
        this.inPorts = []; // input ports
        if (opt && opt.conlog)
            this._conlog = true;
        this.clog('WebAudioMidi is created...');
        var midiOpt = {};
        if (opt && opt.sysex) {
            midiOpt.sysex = true;
            this.clog('sysex is requested...');
        }
        if (opt && opt.software) {
            midiOpt.software = true;
            this.clog('software is requested...');
        }
        navigator.requestMIDIAccess(midiOpt).then(function (midiAccess) {
            _this.clog('MIDI ready!');
            _this._mAcc = midiAccess;
            _this.storeDevices();
            _this.putDevicesIntoPorts();
            _this.startLoggingMidiInput();
            if (_this.outPorts.length === 0)
                alert('No MIDI output ports! (No sound will be produced.)');
            callBack();
        }, function (msg) {
            alert('Failed to get MIDI access: ' + msg);
            _this._failureMsg = msg;
            callBack();
        });
    }
    Object.defineProperty(WebAudioMidi.prototype, "mAcc", {
        //----------------------------------------------------------------------------
        get: function () {
            return this._mAcc;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebAudioMidi.prototype, "failureMsg", {
        get: function () {
            return this._failureMsg;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebAudioMidi.prototype, "dfltOutIdx", {
        get: function () {
            return this._dfltOutIdx;
        },
        set: function (num) {
            this._dfltOutIdx = num;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebAudioMidi.prototype, "dfltNoteOnVel", {
        get: function () {
            return this._dfltNoteOnVel;
        },
        set: function (num) {
            this._dfltNoteOnVel = num;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebAudioMidi.prototype, "dfltNoteOffVel", {
        get: function () {
            return this._dfltNoteOffVel;
        },
        set: function (num) {
            this._dfltNoteOffVel = num;
        },
        enumerable: true,
        configurable: true
    });
    //----------------------------------------------------------------------------
    WebAudioMidi.prototype.noteOn = function (channel, note, velocity, delay, outIndex) {
        if (velocity === void 0) { velocity = this._dfltNoteOnVel; }
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        // delay in milliseconds
        this.outPorts[outIndex].port.send([0x90 + channel, note, velocity], window.performance.now() + delay);
    };
    WebAudioMidi.prototype.noteOff = function (channel, note, delay, outIndex, velocity) {
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        if (velocity === void 0) { velocity = this._dfltNoteOffVel; }
        // delay in milliseconds
        this.outPorts[outIndex].port.send([0x80 + channel, note, velocity], window.performance.now() + delay);
    };
    WebAudioMidi.prototype.chordOn = function (channel, notes, velocity, delay, outIndex) {
        if (velocity === void 0) { velocity = this._dfltNoteOnVel; }
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        // delay in milliseconds
        for (var _i = 0, notes_1 = notes; _i < notes_1.length; _i++) {
            var n = notes_1[_i];
            this.outPorts[outIndex].port.send([0x90 + channel, n, velocity], window.performance.now() + delay);
        }
    };
    WebAudioMidi.prototype.chordOff = function (channel, notes, delay, outIndex, velocity) {
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        if (velocity === void 0) { velocity = this._dfltNoteOffVel; }
        // delay in milliseconds
        for (var _i = 0, notes_2 = notes; _i < notes_2.length; _i++) {
            var n = notes_2[_i];
            this.outPorts[outIndex].port.send([0x80 + channel, n, velocity], window.performance.now() + delay);
        }
    };
    WebAudioMidi.prototype.programChange = function (channel, program, delay, outIndex) {
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        this.outPorts[outIndex].port.send([0xC0 + channel, program], window.performance.now() + delay);
    };
    //----------------------------------------------------------------------------
    WebAudioMidi.prototype.noteToKey = function (num) {
        // C4 is the "middle C": C-1(0), ..., A0(21), ..., C4(60), ..., C8(108), ..., G9(127)
        var keys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        return keys[num % 12] + Math.floor(num / 12 - 1);
    };
    WebAudioMidi.prototype.keyToNote = function (key) {
        // Upper/lower A - G, potentially # or b, and a number (with C4 as the "middle C")
        var note = [0, 2, 4, 5, 7, 9, 11];
        var num = key.charCodeAt(0);
        if (65 <= num && num <= 71)
            num = note[(num - 4) % 7];
        else if (97 <= num && num <= 103)
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
    };
    //----------------------------------------------------------------------------
    WebAudioMidi.prototype.listMIDIAccessProperties = function (excludedType) {
        if (excludedType === void 0) { excludedType = ''; }
        var str = 'MIDIAccess:\n';
        if (!this._mAcc) {
            str += '\t' + this._failureMsg;
            return str;
        }
        for (var p in this._mAcc)
            if (typeof this._mAcc[p] !== excludedType)
                str += '\t' + p + ' (' + (typeof this._mAcc[p]) + '): "' + this._mAcc[p] + '"\n';
        str += 'MIDIAccess.outputs:\n';
        for (var p in this._mAcc.outputs)
            if (typeof this._mAcc.outputs[p] !== excludedType)
                str += '\t' + p + ' (' + (typeof this._mAcc.outputs[p]) + '): "' + this._mAcc.outputs[p] + '"\n';
        this._mAcc.outputs.forEach(function (output, key) {
            str += 'MIDIOutput ' + key + ':\n';
            for (var p in output)
                if (typeof output[p] !== excludedType)
                    str += '\t' + p + ' (' + (typeof output[p]) + '): "' + output[p] + '"\n';
        });
        str += 'MIDIAccess.inputs:\n';
        for (var p in this._mAcc.inputs)
            if (typeof this._mAcc.inputs[p] !== excludedType)
                str += '\t' + p + ' (' + (typeof this._mAcc.inputs[p]) + '): "' + this._mAcc.inputs[p] + '"\n';
        this._mAcc.inputs.forEach(function (input, key) {
            str += 'MIDIInput ' + key + ':\n';
            for (var p in input)
                if (typeof input[p] !== excludedType)
                    str += '\t' + p + ' (' + (typeof input[p]) + '): "' + input[p] + '"\n';
        });
        return str;
    };
    WebAudioMidi.prototype.listOutPorts = function (excludedType) {
        if (excludedType === void 0) { excludedType = ''; }
        var str = '';
        for (var r in this.outPorts) {
            str += 'Out Port ' + r + ' (MIDIOutput):\n';
            var output = this.outPorts[r].device;
            for (var p in output)
                if (typeof output[p] !== excludedType)
                    str += '\t' + p + ' (' + (typeof output[p]) + '): "' + output[p] + '"\n';
        }
        if (!str)
            str = '(No MIDI out ports!)';
        return str;
    };
    WebAudioMidi.prototype.listInPorts = function (excludedType) {
        if (excludedType === void 0) { excludedType = ''; }
        var str = '';
        for (var r in this.inPorts) {
            str += 'In Port ' + r + ' (MIDIInput):\n';
            var input = this.inPorts[r].device;
            for (var p in input)
                if (typeof input[p] !== excludedType)
                    str += '\t' + p + ' (' + (typeof input[p]) + '): "' + input[p] + '"\n';
        }
        if (!str)
            str = '(No MIDI in ports!)';
        return str;
    };
    //================================================================================================
    // Tests
    WebAudioMidi.prototype.runTests = function () {
        var conlog = this._conlog;
        this._conlog = true;
        this.testNoteToKey();
        this.testkeyToNote();
        alert('WebAM tests completed. (See console log or Ctrl + Shift + J in Chrome.)');
        this._conlog = conlog;
    };
    WebAudioMidi.prototype.testNoteToKey = function () {
        this.clog('Test noteToKey():');
        for (var _i = 0, _a = [0, 21, 60, 108, 127]; _i < _a.length; _i++) {
            var n = _a[_i];
            this.clog('\t', n, '->', this.noteToKey(n));
        }
    };
    WebAudioMidi.prototype.testkeyToNote = function () {
        this.clog('Test keyToNote():');
        for (var _i = 0, _a = ['C-1', 'f#2', 'c4', 'bb7', 'G9']; _i < _a.length; _i++) {
            var k = _a[_i];
            this.clog('\t', k, '->', this.keyToNote(k));
        }
    };
    //================================================================================================
    // Private Methods
    WebAudioMidi.prototype.storeDevices = function () {
        var _this = this;
        this._mAcc.outputs.forEach(function (device, key) {
            _this.outDevices[key] = device;
        });
        this._mAcc.inputs.forEach(function (device, key) {
            _this.inDevices[key] = device;
        });
    };
    WebAudioMidi.prototype.putDevicesIntoPorts = function () {
        for (var d in this.outDevices)
            this.outPorts[d] = new MidiPort(this.outDevices[d], this._mAcc.outputs.get(d));
        for (var d in this.inDevices)
            this.inPorts[d] = new MidiPort(this.inDevices[d]);
    };
    WebAudioMidi.prototype.startLoggingMidiInput = function (deviceId) {
        var _this = this;
        if (deviceId === void 0) { deviceId = -1; }
        if (deviceId < 0)
            this._mAcc.inputs.forEach(function (input) {
                input.onmidimessage = function (event) {
                    if (!(event.type === 'midimessage' && event.data != '248' && event.data != '254'))
                        return;
                    _this.outPorts[_this._thruOutIdx].port.send(event.data);
                    var str = '';
                    str += _this.midiEventStr(event);
                    _this.clog(str);
                };
            });
        else
            this.inPorts[deviceId].device.onmidimessage = function (event) {
                if (!(event.type === 'midimessage' && event.data != '248' && event.data != '254'))
                    return;
                _this.outPorts[_this._thruOutIdx].port.send(event.data);
                var str = '';
                str += _this.midiEventStr(event);
                _this.clog(str);
            };
    };
    WebAudioMidi.prototype.midiEventStr = function (event) {
        return 'MIDI message received at ' + event.receivedTime + ' (' + (event.receivedTime - event.timeStamp) + ') for port ' +
            event.target.id + ' (' + event.target.name + ') with timeStamp ' + event.timeStamp + ' (' + event.data.length +
            ' bytes): ' + event.data;
    };
    WebAudioMidi.prototype.clog = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (this._conlog)
            console.log('WAM: ' + args.join(' '));
    };
    return WebAudioMidi;
}());
// ------- end of file -------
