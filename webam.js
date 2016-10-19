// ------- top of file -------
"use strict";
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Globals
var Riff = {};
var SoundFont = {};
/**
 * @license
 * sf2synth.js
 * SoundFont Synthesizer for WebMidiLink
 * https://github.com/gree/sf2synth.js
 *
 * The MIT License
 *
 * Copyright (c) 2013 imaya / GREE Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// From gree/sf2synth.js src/typedef.js ////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/** @typedef {(Array.<number>|Uint8Array)} */
var ByteArray;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// From gree/sf2synth.js src/riff.js ///////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @param {ByteArray} input input buffer.
 * @param {Object=} opt_params option parameters.
 * @constructor
 */
Riff.Parser = function (input, opt_params) {
    opt_params = opt_params || {};
    /** @type {ByteArray} */
    this.input = input;
    /** @type {number} */
    this.ip = opt_params['index'] || 0;
    /** @type {number} */
    this.length = opt_params['length'] || input.length - this.ip;
    /** @type {Array.<Riff.Chunk>} */
    this.chunkList;
    /** @type {number} */
    this.offset = this.ip;
    /** @type {boolean} */
    this.padding =
        opt_params['padding'] !== void 0 ? opt_params['padding'] : true;
    /** @type {boolean} */
    this.bigEndian =
        opt_params['bigEndian'] !== void 0 ? opt_params['bigEndian'] : false;
};
/**
 * @param {string} type
 * @param {number} size
 * @param {number} offset
 * @constructor
 */
Riff.Chunk = function (type, size, offset) {
    /** @type {string} */
    this.type = type;
    /** @type {number} */
    this.size = size;
    /** @type {number} */
    this.offset = offset;
};
Riff.Parser.prototype.parse = function () {
    /** @type {number} */
    var length = this.length + this.offset;
    this.chunkList = [];
    while (this.ip < length) {
        this.parseChunk();
    }
};
Riff.Parser.prototype.parseChunk = function () {
    /** @type {ByteArray} */
    var input = this.input;
    /** @type {number} */
    var ip = this.ip;
    /** @type {number} */
    var size;
    this.chunkList.push(new Riff.Chunk(String.fromCharCode(input[ip++], input[ip++], input[ip++], input[ip++]), (size = this.bigEndian ?
        ((input[ip++] << 24) | (input[ip++] << 16) |
            (input[ip++] << 8) | (input[ip++])) >>> 0 :
        ((input[ip++]) | (input[ip++] << 8) |
            (input[ip++] << 16) | (input[ip++] << 24)) >>> 0), ip));
    ip += size;
    // padding
    if (this.padding && ((ip - this.offset) & 1) === 1) {
        ip++;
    }
    this.ip = ip;
};
/**
 * @param {number} index chunk index.
 * @return {?Riff.Chunk}
 */
Riff.Parser.prototype.getChunk = function (index) {
    /** @type {Riff.Chunk} */
    var chunk = this.chunkList[index];
    if (chunk === void 0) {
        return null;
    }
    return chunk;
};
/**
 * @return {number}
 */
Riff.Parser.prototype.getNumberOfChunks = function () {
    return this.chunkList.length;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// From gree/sf2synth.js src/sf2.js ////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @param {ByteArray} input
 * @param {Object=} opt_params
 * @constructor
 */
SoundFont.Parser = function (input, opt_params) {
    opt_params = opt_params || {};
    /** @type {ByteArray} */
    this.input = input;
    /** @type {(Object|undefined)} */
    this.parserOption = opt_params['parserOption'];
    /** @type {Array.<Object>} */
    this.presetHeader;
    /** @type {Array.<Object>} */
    this.presetZone;
    /** @type {Array.<Object>} */
    this.presetZoneModulator;
    /** @type {Array.<Object>} */
    this.presetZoneGenerator;
    /** @type {Array.<Object>} */
    this.instrument;
    /** @type {Array.<Object>} */
    this.instrumentZone;
    /** @type {Array.<Object>} */
    this.instrumentZoneModulator;
    /** @type {Array.<Object>} */
    this.instrumentZoneGenerator;
    /** @type {Array.<Object>} */
    this.sampleHeader;
};
SoundFont.Parser.prototype.parse = function () {
    /** @type {Riff.Parser} */
    var parser = new Riff.Parser(this.input, this.parserOption);
    /** @type {?Riff.Chunk} */
    var chunk;
    // parse RIFF chunk
    parser.parse();
    if (parser.chunkList.length !== 1) {
        throw new Error('wrong chunk length');
    }
    chunk = parser.getChunk(0);
    if (chunk === null) {
        throw new Error('chunk not found');
    }
    this.parseRiffChunk(chunk);
    //console.log(this.sampleHeader);
    this.input = null;
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseRiffChunk = function (chunk) {
    /** @type {Riff.Parser} */
    var parser;
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {string} */
    var signature;
    // check parse target
    if (chunk.type !== 'RIFF') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    // check signature
    signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
    if (signature !== 'sfbk') {
        throw new Error('invalid signature:' + signature);
    }
    // read structure
    parser = new Riff.Parser(data, { 'index': ip, 'length': chunk.size - 4 });
    parser.parse();
    if (parser.getNumberOfChunks() !== 3) {
        throw new Error('invalid sfbk structure');
    }
    // INFO-list
    this.parseInfoList(/** @type {!Riff.Chunk} */ (parser.getChunk(0)));
    // sdta-list
    this.parseSdtaList(/** @type {!Riff.Chunk} */ (parser.getChunk(1)));
    // pdta-list
    this.parsePdtaList(/** @type {!Riff.Chunk} */ (parser.getChunk(2)));
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseInfoList = function (chunk) {
    /** @type {Riff.Parser} */
    var parser;
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {string} */
    var signature;
    // check parse target
    if (chunk.type !== 'LIST') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    // check signature
    signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
    if (signature !== 'INFO') {
        throw new Error('invalid signature:' + signature);
    }
    // read structure
    parser = new Riff.Parser(data, { 'index': ip, 'length': chunk.size - 4 });
    parser.parse();
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseSdtaList = function (chunk) {
    /** @type {Riff.Parser} */
    var parser;
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {string} */
    var signature;
    // check parse target
    if (chunk.type !== 'LIST') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    // check signature
    signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
    if (signature !== 'sdta') {
        throw new Error('invalid signature:' + signature);
    }
    // read structure
    parser = new Riff.Parser(data, { 'index': ip, 'length': chunk.size - 4 });
    parser.parse();
    if (parser.chunkList.length !== 1) {
        throw new Error('TODO');
    }
    this.samplingData =
        /** @type {{type: string, size: number, offset: number}} */
        (parser.getChunk(0));
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parsePdtaList = function (chunk) {
    /** @type {Riff.Parser} */
    var parser;
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {string} */
    var signature;
    // check parse target
    if (chunk.type !== 'LIST') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    // check signature
    signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
    if (signature !== 'pdta') {
        throw new Error('invalid signature:' + signature);
    }
    // read structure
    parser = new Riff.Parser(data, { 'index': ip, 'length': chunk.size - 4 });
    parser.parse();
    // check number of chunks
    if (parser.getNumberOfChunks() !== 9) {
        throw new Error('invalid pdta chunk');
    }
    this.parsePhdr(/** @type {Riff.Chunk} */ (parser.getChunk(0)));
    this.parsePbag(/** @type {Riff.Chunk} */ (parser.getChunk(1)));
    this.parsePmod(/** @type {Riff.Chunk} */ (parser.getChunk(2)));
    this.parsePgen(/** @type {Riff.Chunk} */ (parser.getChunk(3)));
    this.parseInst(/** @type {Riff.Chunk} */ (parser.getChunk(4)));
    this.parseIbag(/** @type {Riff.Chunk} */ (parser.getChunk(5)));
    this.parseImod(/** @type {Riff.Chunk} */ (parser.getChunk(6)));
    this.parseIgen(/** @type {Riff.Chunk} */ (parser.getChunk(7)));
    this.parseShdr(/** @type {Riff.Chunk} */ (parser.getChunk(8)));
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parsePhdr = function (chunk) {
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {Array.<Object>} */
    var presetHeader = this.presetHeader = [];
    /** @type {number} */
    var size = chunk.offset + chunk.size;
    // check parse target
    if (chunk.type !== 'phdr') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    while (ip < size) {
        presetHeader.push({
            presetName: String.fromCharCode.apply(null, data.subarray(ip, ip += 20)),
            preset: data[ip++] | (data[ip++] << 8),
            bank: data[ip++] | (data[ip++] << 8),
            presetBagIndex: data[ip++] | (data[ip++] << 8),
            library: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0,
            genre: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0,
            morphology: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0
        });
    }
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parsePbag = function (chunk) {
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {Array.<Object>} */
    var presetZone = this.presetZone = [];
    /** @type {number} */
    var size = chunk.offset + chunk.size;
    // check parse target
    if (chunk.type !== 'pbag') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    while (ip < size) {
        presetZone.push({
            presetGeneratorIndex: data[ip++] | (data[ip++] << 8),
            presetModulatorIndex: data[ip++] | (data[ip++] << 8)
        });
    }
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parsePmod = function (chunk) {
    // check parse target
    if (chunk.type !== 'pmod') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    this.presetZoneModulator = this.parseModulator(chunk);
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parsePgen = function (chunk) {
    // check parse target
    if (chunk.type !== 'pgen') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    this.presetZoneGenerator = this.parseGenerator(chunk);
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseInst = function (chunk) {
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {Array.<Object>} */
    var instrument = this.instrument = [];
    /** @type {number} */
    var size = chunk.offset + chunk.size;
    // check parse target
    if (chunk.type !== 'inst') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    while (ip < size) {
        instrument.push({
            instrumentName: String.fromCharCode.apply(null, data.subarray(ip, ip += 20)),
            instrumentBagIndex: data[ip++] | (data[ip++] << 8)
        });
    }
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseIbag = function (chunk) {
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {Array.<Object>} */
    var instrumentZone = this.instrumentZone = [];
    /** @type {number} */
    var size = chunk.offset + chunk.size;
    // check parse target
    if (chunk.type !== 'ibag') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    while (ip < size) {
        instrumentZone.push({
            instrumentGeneratorIndex: data[ip++] | (data[ip++] << 8),
            instrumentModulatorIndex: data[ip++] | (data[ip++] << 8)
        });
    }
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseImod = function (chunk) {
    // check parse target
    if (chunk.type !== 'imod') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    this.instrumentZoneModulator = this.parseModulator(chunk);
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseIgen = function (chunk) {
    // check parse target
    if (chunk.type !== 'igen') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    this.instrumentZoneGenerator = this.parseGenerator(chunk);
};
/**
 * @param {Riff.Chunk} chunk
 */
SoundFont.Parser.prototype.parseShdr = function (chunk) {
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {Array.<Object>} */
    var samples = this.sample = [];
    /** @type {Array.<Object>} */
    var sampleHeader = this.sampleHeader = [];
    /** @type {number} */
    var size = chunk.offset + chunk.size;
    /** @type {string} */
    var sampleName;
    /** @type {number} */
    var start;
    /** @type {number} */
    var end;
    /** @type {number} */
    var startLoop;
    /** @type {number} */
    var endLoop;
    /** @type {number} */
    var sampleRate;
    /** @type {number} */
    var originalPitch;
    /** @type {number} */
    var pitchCorrection;
    /** @type {number} */
    var sampleLink;
    /** @type {number} */
    var sampleType;
    // check parse target
    if (chunk.type !== 'shdr') {
        throw new Error('invalid chunk type:' + chunk.type);
    }
    while (ip < size) {
        sampleName = String.fromCharCode.apply(null, data.subarray(ip, ip += 20));
        start = ((data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0;
        end = ((data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0;
        startLoop = ((data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0;
        endLoop = ((data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0;
        sampleRate = ((data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0;
        originalPitch = data[ip++];
        pitchCorrection = (data[ip++] << 24) >> 24;
        sampleLink = data[ip++] | (data[ip++] << 8);
        sampleType = data[ip++] | (data[ip++] << 8);
        //*
        var sample = new Int16Array(new Uint8Array(data.subarray(this.samplingData.offset + start * 2, this.samplingData.offset + end * 2)).buffer);
        startLoop -= start;
        endLoop -= start;
        if (sampleRate > 0) {
            var adjust = this.adjustSampleData(sample, sampleRate);
            sample = adjust.sample;
            sampleRate *= adjust.multiply;
            startLoop *= adjust.multiply;
            endLoop *= adjust.multiply;
        }
        samples.push(sample);
        //*/
        sampleHeader.push({
            sampleName: sampleName,
            /*
            start: start,
            end: end,
            */
            startLoop: startLoop,
            endLoop: endLoop,
            sampleRate: sampleRate,
            originalPitch: originalPitch,
            pitchCorrection: pitchCorrection,
            sampleLink: sampleLink,
            sampleType: sampleType
        });
    }
};
SoundFont.Parser.prototype.adjustSampleData = function (sample, sampleRate) {
    /** @type {Int16Array} */
    var newSample;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {number} */
    var j;
    /** @type {number} */
    var multiply = 1;
    // buffer
    while (sampleRate < 22050) {
        newSample = new Int16Array(sample.length * 2);
        for (i = j = 0, il = sample.length; i < il; ++i) {
            newSample[j++] = sample[i];
            newSample[j++] = sample[i];
        }
        sample = newSample;
        multiply *= 2;
        sampleRate *= 2;
    }
    return {
        sample: sample,
        multiply: multiply
    };
};
/**
 * @param {Riff.Chunk} chunk
 * @return {Array.<Object>}
 */
SoundFont.Parser.prototype.parseModulator = function (chunk) {
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {number} */
    var size = chunk.offset + chunk.size;
    /** @type {number} */
    var code;
    /** @type {string} */
    var key;
    /** @type {Array.<Object>} */
    var output = [];
    while (ip < size) {
        // Src  Oper
        // TODO
        ip += 2;
        // Dest Oper
        code = data[ip++] | (data[ip++] << 8);
        key = SoundFont.Parser.GeneratorEnumeratorTable[code];
        if (key === void 0) {
            // Amount
            output.push({
                type: key,
                value: {
                    code: code,
                    amount: data[ip] | (data[ip + 1] << 8) << 16 >> 16,
                    lo: data[ip++],
                    hi: data[ip++]
                }
            });
        }
        else {
            // Amount
            switch (key) {
                case 'keyRange': /* FALLTHROUGH */
                case 'velRange': /* FALLTHROUGH */
                case 'keynum': /* FALLTHROUGH */
                case 'velocity':
                    output.push({
                        type: key,
                        value: {
                            lo: data[ip++],
                            hi: data[ip++]
                        }
                    });
                    break;
                default:
                    output.push({
                        type: key,
                        value: {
                            amount: data[ip++] | (data[ip++] << 8) << 16 >> 16
                        }
                    });
                    break;
            }
        }
        // AmtSrcOper
        // TODO
        ip += 2;
        // Trans Oper
        // TODO
        ip += 2;
    }
    return output;
};
/**
 * @param {Riff.Chunk} chunk
 * @return {Array.<Object>}
 */
SoundFont.Parser.prototype.parseGenerator = function (chunk) {
    /** @type {ByteArray} */
    var data = this.input;
    /** @type {number} */
    var ip = chunk.offset;
    /** @type {number} */
    var size = chunk.offset + chunk.size;
    /** @type {number} */
    var code;
    /** @type {string} */
    var key;
    /** @type {Array.<Object>} */
    var output = [];
    while (ip < size) {
        code = data[ip++] | (data[ip++] << 8);
        key = SoundFont.Parser.GeneratorEnumeratorTable[code];
        if (key === void 0) {
            output.push({
                type: key,
                value: {
                    code: code,
                    amount: data[ip] | (data[ip + 1] << 8) << 16 >> 16,
                    lo: data[ip++],
                    hi: data[ip++]
                }
            });
            continue;
        }
        switch (key) {
            case 'keynum': /* FALLTHROUGH */
            case 'keyRange': /* FALLTHROUGH */
            case 'velRange': /* FALLTHROUGH */
            case 'velocity':
                output.push({
                    type: key,
                    value: {
                        lo: data[ip++],
                        hi: data[ip++]
                    }
                });
                break;
            default:
                output.push({
                    type: key,
                    value: {
                        amount: data[ip++] | (data[ip++] << 8) << 16 >> 16
                    }
                });
                break;
        }
    }
    return output;
};
SoundFont.Parser.prototype.createInstrument = function () {
    /** @type {Array.<Object>} */
    var instrument = this.instrument;
    /** @type {Array.<Object>} */
    var zone = this.instrumentZone;
    /** @type {Array.<Object>} */
    var output = [];
    /** @type {number} */
    var bagIndex;
    /** @type {number} */
    var bagIndexEnd;
    /** @type {Array.<Object>} */
    var zoneInfo;
    /** @type {{generator: Object, generatorInfo: Array.<Object>}} */
    var instrumentGenerator;
    /** @type {{modulator: Object, modulatorInfo: Array.<Object>}} */
    var instrumentModulator;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {number} */
    var j;
    /** @type {number} */
    var jl;
    // instrument -> instrument bag -> generator / modulator
    for (i = 0, il = instrument.length; i < il; ++i) {
        bagIndex = instrument[i].instrumentBagIndex;
        bagIndexEnd = instrument[i + 1] ? instrument[i + 1].instrumentBagIndex : zone.length;
        zoneInfo = [];
        // instrument bag
        for (j = bagIndex, jl = bagIndexEnd; j < jl; ++j) {
            instrumentGenerator = this.createInstrumentGenerator_(zone, j);
            instrumentModulator = this.createInstrumentModulator_(zone, j);
            zoneInfo.push({
                generator: instrumentGenerator.generator,
                generatorSequence: instrumentGenerator.generatorInfo,
                modulator: instrumentModulator.modulator,
                modulatorSequence: instrumentModulator.modulatorInfo
            });
        }
        output.push({
            name: instrument[i].instrumentName,
            info: zoneInfo
        });
    }
    return output;
};
SoundFont.Parser.prototype.createPreset = function () {
    /** @type {Array.<Object>} */
    var preset = this.presetHeader;
    /** @type {Array.<Object>} */
    var zone = this.presetZone;
    /** @type {Array.<Object>} */
    var output = [];
    /** @type {number} */
    var bagIndex;
    /** @type {number} */
    var bagIndexEnd;
    /** @type {Array.<Object>} */
    var zoneInfo;
    /** @type {number} */
    var instrument;
    /** @type {{generator: Object, generatorInfo: Array.<Object>}} */
    var presetGenerator;
    /** @type {{modulator: Object, modulatorInfo: Array.<Object>}} */
    var presetModulator;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {number} */
    var j;
    /** @type {number} */
    var jl;
    // preset -> preset bag -> generator / modulator
    for (i = 0, il = preset.length; i < il; ++i) {
        bagIndex = preset[i].presetBagIndex;
        bagIndexEnd = preset[i + 1] ? preset[i + 1].presetBagIndex : zone.length;
        zoneInfo = [];
        // preset bag
        for (j = bagIndex, jl = bagIndexEnd; j < jl; ++j) {
            presetGenerator = this.createPresetGenerator_(zone, j);
            presetModulator = this.createPresetModulator_(zone, j);
            zoneInfo.push({
                generator: presetGenerator.generator,
                generatorSequence: presetGenerator.generatorInfo,
                modulator: presetModulator.modulator,
                modulatorSequence: presetModulator.modulatorInfo
            });
            instrument =
                presetGenerator.generator['instrument'] !== void 0 ?
                    presetGenerator.generator['instrument'].amount :
                    presetModulator.modulator['instrument'] !== void 0 ?
                        presetModulator.modulator['instrument'].amount :
                        null;
        }
        output.push({
            name: preset[i].presetName,
            info: zoneInfo,
            header: preset[i],
            instrument: instrument
        });
    }
    return output;
};
/**
 * @param {Array.<Object>} zone
 * @param {number} index
 * @returns {{generator: Object, generatorInfo: Array.<Object>}}
 * @private
 */
SoundFont.Parser.prototype.createInstrumentGenerator_ = function (zone, index) {
    var modgen = this.createBagModGen_(zone, zone[index].instrumentGeneratorIndex, zone[index + 1] ? zone[index + 1].instrumentGeneratorIndex : this.instrumentZoneGenerator.length, this.instrumentZoneGenerator);
    return {
        generator: modgen.modgen,
        generatorInfo: modgen.modgenInfo
    };
};
/**
 * @param {Array.<Object>} zone
 * @param {number} index
 * @returns {{modulator: Object, modulatorInfo: Array.<Object>}}
 * @private
 */
SoundFont.Parser.prototype.createInstrumentModulator_ = function (zone, index) {
    var modgen = this.createBagModGen_(zone, zone[index].presetModulatorIndex, zone[index + 1] ? zone[index + 1].instrumentModulatorIndex : this.instrumentZoneModulator.length, this.instrumentZoneModulator);
    return {
        modulator: modgen.modgen,
        modulatorInfo: modgen.modgenInfo
    };
};
/**
 * @param {Array.<Object>} zone
 * @param {number} index
 * @returns {{generator: Object, generatorInfo: Array.<Object>}}
 * @private
 */
SoundFont.Parser.prototype.createPresetGenerator_ = function (zone, index) {
    var modgen = this.createBagModGen_(zone, zone[index].presetGeneratorIndex, zone[index + 1] ? zone[index + 1].presetGeneratorIndex : this.presetZoneGenerator.length, this.presetZoneGenerator);
    return {
        generator: modgen.modgen,
        generatorInfo: modgen.modgenInfo
    };
};
/**
 * @param {Array.<Object>} zone
 * @param {number} index
 * @returns {{modulator: Object, modulatorInfo: Array.<Object>}}
 * @private
 */
SoundFont.Parser.prototype.createPresetModulator_ = function (zone, index) {
    /** @type {{modgen: Object, modgenInfo: Array.<Object>}} */
    var modgen = this.createBagModGen_(zone, zone[index].presetModulatorIndex, zone[index + 1] ? zone[index + 1].presetModulatorIndex : this.presetZoneModulator.length, this.presetZoneModulator);
    return {
        modulator: modgen.modgen,
        modulatorInfo: modgen.modgenInfo
    };
};
/**
 * @param {Array.<Object>} zone
 * @param {number} indexStart
 * @param {number} indexEnd
 * @param zoneModGen
 * @returns {{modgen: Object, modgenInfo: Array.<Object>}}
 * @private
 */
SoundFont.Parser.prototype.createBagModGen_ = function (zone, indexStart, indexEnd, zoneModGen) {
    /** @type {Array.<Object>} */
    var modgenInfo = [];
    /** @type {Object} */
    var modgen = {
        unknown: [],
        'keyRange': {
            hi: 127,
            lo: 0
        }
    }; // TODO
    /** @type {Object} */
    var info;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    for (i = indexStart, il = indexEnd; i < il; ++i) {
        info = zoneModGen[i];
        modgenInfo.push(info);
        if (info.type === 'unknown') {
            modgen.unknown.push(info.value);
        }
        else {
            modgen[info.type] = info.value;
        }
    }
    return {
        modgen: modgen,
        modgenInfo: modgenInfo
    };
};
/**
 * @type {Array.<string>}
 * @const
 */
SoundFont.Parser.GeneratorEnumeratorTable = [
    'startAddrsOffset',
    'endAddrsOffset',
    'startloopAddrsOffset',
    'endloopAddrsOffset',
    'startAddrsCoarseOffset',
    'modLfoToPitch',
    'vibLfoToPitch',
    'modEnvToPitch',
    'initialFilterFc',
    'initialFilterQ',
    'modLfoToFilterFc',
    'modEnvToFilterFc',
    'endAddrsCoarseOffset',
    'modLfoToVolume',
    ,
    'chorusEffectsSend',
    'reverbEffectsSend',
    'pan',
    ,
    , ,
    'delayModLFO',
    'freqModLFO',
    'delayVibLFO',
    'freqVibLFO',
    'delayModEnv',
    'attackModEnv',
    'holdModEnv',
    'decayModEnv',
    'sustainModEnv',
    'releaseModEnv',
    'keynumToModEnvHold',
    'keynumToModEnvDecay',
    'delayVolEnv',
    'attackVolEnv',
    'holdVolEnv',
    'decayVolEnv',
    'sustainVolEnv',
    'releaseVolEnv',
    'keynumToVolEnvHold',
    'keynumToVolEnvDecay',
    'instrument',
    ,
    'keyRange',
    'velRange',
    'startloopAddrsCoarseOffset',
    'keynum',
    'velocity',
    'initialAttenuation',
    ,
    'endloopAddrsCoarseOffset',
    'coarseTune',
    'fineTune',
    'sampleID',
    'sampleModes',
    ,
    'scaleTuning',
    'exclusiveClass',
    'overridingRootKey'
];
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// From gree/sf2synth.js src/sound_font_synth_note.js //////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @param {AudioContext} ctx
 * @param {AudioNode} destination
 * @param {{
 *   channel: number,
 *   key: number,
 *   sample: Uint8Array,
 *   basePlaybackRate: number,
 *   loopStart: number,
 *   loopEnd: number,
 *   volume: number,
 *   panpot: number
 * }} instrument
 * @constructor
 */
SoundFont.SynthesizerNote = function (ctx, destination, instrument) {
    /** @type {AudioContext} */
    this.ctx = ctx;
    /** @type {AudioNode} */
    this.destination = destination;
    /** @type {{
     *   channel: number,
     *   key: number,
     *   sample: Uint8Array,
     *   basePlaybackRate: number,
     *   loopStart: number,
     *   loopEnd: number,
     *   volume: number,
     *   panpot: number
     * }}
     */
    this.instrument = instrument;
    /** @type {number} */
    this.channel = instrument['channel'];
    /** @type {number} */
    this.key = instrument['key'];
    /** @type {number} */
    this.velocity = instrument['velocity'];
    /** @type {Int16Array} */
    this.buffer = instrument['sample'];
    /** @type {number} */
    this.playbackRate = instrument['basePlaybackRate'];
    /** @type {number} */
    this.sampleRate = instrument['sampleRate'];
    /** @type {number} */
    this.volume = instrument['volume'];
    /** @type {number} */
    this.panpot = instrument['panpot'];
    /** @type {number} */
    this.pitchBend = instrument['pitchBend'];
    /** @type {number} */
    this.pitchBendSensitivity = instrument['pitchBendSensitivity'];
    /** @type {number} */
    this.modEnvToPitch = instrument['modEnvToPitch'];
    // state
    /** @type {number} */
    this.startTime = ctx.currentTime;
    /** @type {number} */
    this.computedPlaybackRate = this.playbackRate;
    //---------------------------------------------------------------------------
    // audio node
    //---------------------------------------------------------------------------
    /** @type {AudioBuffer} */
    this.audioBuffer;
    /** @type {AudioBufferSourceNode} */
    this.bufferSource;
    /** @type {AudioPannerNode} */
    this.panner;
    /** @type {AudioGainNode} */
    this.gainOutput;
    //console.log(instrument['modAttack'], instrument['modDecay'], instrument['modSustain'], instrument['modRelease']);
};
SoundFont.SynthesizerNote.prototype.noteOn = function () {
    /** @type {AudioContext} */
    var ctx = this.ctx;
    /** @type {{
     *   channel: number,
     *   key: number,
     *   sample: Uint8Array,
     *   basePlaybackRate: number,
     *   loopStart: number,
     *   loopEnd: number,
     *   volume: number,
     *   panpot: number
     * }} */
    var instrument = this.instrument;
    /** @type {Int16Array} */
    var sample = this.buffer;
    /** @type {AudioBuffer} */
    var buffer;
    /** @type {Float32Array} */
    var channelData;
    /** @type {AudioBufferSourceNode} */
    var bufferSource;
    /** @type {BiquadFilterNode} */
    var filter;
    /** @type {AudioPannerNode} */
    var panner;
    /** @type {AudioGainNode} */
    var output;
    /** @type {AudioGain} */
    var outputGain;
    /** @type {number} */
    var now = this.ctx.currentTime;
    /** @type {number} */
    var volAttack = now + instrument['volAttack'];
    /** @type {number} */
    var modAttack = now + instrument['modAttack'];
    /** @type {number} */
    var volDecay = volAttack + instrument['volDecay'];
    /** @type {number} */
    var modDecay = modAttack + instrument['modDecay'];
    /** @type {number} */
    var loopStart = instrument['loopStart'] / this.sampleRate;
    /** @type {number} */
    var loopEnd = instrument['loopEnd'] / this.sampleRate;
    /** @type {number} */
    var startTime = instrument['start'] / this.sampleRate;
    /** @type {number} */
    var baseFreq;
    /** @type {number} */
    var peekFreq;
    /** @type {number} */
    var sustainFreq;
    sample = sample.subarray(0, sample.length + instrument['end']);
    buffer = this.audioBuffer = ctx.createBuffer(1, sample.length, this.sampleRate);
    channelData = buffer.getChannelData(0);
    channelData.set(sample);
    // buffer source
    bufferSource = this.bufferSource = ctx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = (this.channel !== 9);
    bufferSource.loopStart = loopStart;
    bufferSource.loopEnd = loopEnd;
    this.updatePitchBend(this.pitchBend);
    // audio node
    panner = this.panner = ctx.createPanner();
    output = this.gainOutput = ctx.createGainNode();
    outputGain = output.gain;
    // filter
    filter = this.filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; // modified by midixman
    // panpot
    panner.panningModel = 'equalpower'; // modified by midixman
    panner.setPosition(Math.sin(this.panpot * Math.PI / 2), 0, Math.cos(this.panpot * Math.PI / 2));
    //---------------------------------------------------------------------------
    // Attack, Decay, Sustain
    //---------------------------------------------------------------------------
    outputGain.setValueAtTime(0, now);
    outputGain.linearRampToValueAtTime(this.volume * (this.velocity / 127), volAttack);
    outputGain.linearRampToValueAtTime(this.volume * (1 - instrument['volSustain']), volDecay);
    filter.Q.setValueAtTime(instrument['initialFilterQ'] * Math.pow(10, 200), now);
    baseFreq = amountToFreq(instrument['initialFilterFc']);
    peekFreq = amountToFreq(instrument['initialFilterFc'] + instrument['modEnvToFilterFc']);
    sustainFreq = baseFreq + (peekFreq - baseFreq) * (1 - instrument['modSustain']);
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.frequency.linearRampToValueAtTime(peekFreq, modAttack);
    filter.frequency.linearRampToValueAtTime(sustainFreq, modDecay);
    /**
     * @param {number} val
     * @returns {number}
     */
    function amountToFreq(val) {
        return Math.pow(2, (val - 6900) / 1200) * 440;
    }
    // connect
    bufferSource.connect(filter);
    filter.connect(panner);
    panner.connect(output);
    output.connect(this.destination);
    // fire
    bufferSource.start(0, startTime);
};
SoundFont.SynthesizerNote.prototype.noteOff = function () {
    /** @type {{
     *   channel: number,
     *   key: number,
     *   sample: Uint8Array,
     *   basePlaybackRate: number,
     *   loopStart: number,
     *   loopEnd: number,
     *   volume: number,
     *   panpot: number
     * }} */
    var instrument = this.instrument;
    /** @type {AudioBufferSourceNode} */
    var bufferSource = this.bufferSource;
    /** @type {AudioGainNode} */
    var output = this.gainOutput;
    /** @type {number} */
    var now = this.ctx.currentTime;
    /** @type {number} */
    var volEndTime = now + instrument['volRelease'];
    /** @type {number} */
    var modEndTime = now + instrument['modRelease'];
    if (!this.audioBuffer) {
        return;
    }
    //---------------------------------------------------------------------------
    // Release
    //---------------------------------------------------------------------------
    output.gain.cancelScheduledValues(0);
    output.gain.linearRampToValueAtTime(0, volEndTime);
    bufferSource.playbackRate.cancelScheduledValues(0);
    bufferSource.playbackRate.linearRampToValueAtTime(this.computedPlaybackRate, modEndTime);
    bufferSource.loop = false;
    bufferSource.stop(volEndTime);
    // disconnect
    //*
    setTimeout((function (note) {
        return function () {
            note.bufferSource.disconnect(0);
            note.panner.disconnect(0);
            note.gainOutput.disconnect(0);
        };
    })(this), instrument['volRelease'] * 1000);
    //*/
};
SoundFont.SynthesizerNote.prototype.schedulePlaybackRate = function () {
    var playbackRate = this.bufferSource.playbackRate;
    /** @type {number} */
    var computed = this.computedPlaybackRate;
    /** @type {number} */
    var start = this.startTime;
    /** @type {Object} */
    var instrument = this.instrument;
    /** @type {number} */
    var modAttack = start + instrument['modAttack'];
    /** @type {number} */
    var modDecay = modAttack + instrument['modDecay'];
    /** @type {number} */
    var peekPitch = computed * Math.pow(Math.pow(2, 1 / 12), this.modEnvToPitch * this.instrument['scaleTuning']);
    playbackRate.cancelScheduledValues(0);
    playbackRate.setValueAtTime(computed, start);
    playbackRate.linearRampToValueAtTime(peekPitch, modAttack);
    playbackRate.linearRampToValueAtTime(computed + (peekPitch - computed) * (1 - instrument['modSustain']), modDecay);
};
/**
 * @param {number} pitchBend
 */
SoundFont.SynthesizerNote.prototype.updatePitchBend = function (pitchBend) {
    this.computedPlaybackRate = this.playbackRate * Math.pow(Math.pow(2, 1 / 12), (this.pitchBendSensitivity * (pitchBend / (pitchBend < 0 ? 8192 : 8191))) * this.instrument['scaleTuning']);
    this.schedulePlaybackRate();
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// From gree/sf2synth.js src/sound_font_synth.js ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @constructor
 */
SoundFont.Synthesizer = function (input) {
    /** @type {Uint8Array} */
    this.input = input;
    /** @type {SoundFont.Parser} */
    this.parser;
    /** @type {number} */
    this.bank = 0;
    /** @type {Array.<Array.<Object>>} */
    this.bankSet;
    /** @type {number} */
    this.bufferSize = 1024;
    /** @type {AudioContext} */
    this.ctx = this.getAudioContext();
    /** @type {AudioGainNode} */
    this.gainMaster = this.ctx.createGainNode();
    /** @type {DynamicsCompressorNode} */
    this.compressor = this.ctx.createDynamicsCompressor();
    /** @type {AudioBufferSourceNode} */
    this.bufSrc = this.ctx.createBufferSource();
    /** @type {Array.<number>} */
    this.channelInstrument =
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 10, 11, 12, 13, 14, 15];
    /** @type {Array.<number>} */
    this.channelVolume =
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    /** @type {Array.<number>} */
    this.channelPanpot =
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    /** @type {Array.<number>} */
    this.channelPitchBend =
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.channelPitchBendSensitivity =
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    /** @type {Array.<Array.<SoundFont.SynthesizerNote>>} */
    this.currentNoteOn = [
        [], [], [], [], [], [], [], [],
        [], [], [], [], [], [], [], []
    ];
    /** @type {number} */
    this.baseVolume = 1 / 0x8000;
    /** @type {number} */
    this.masterVolume = 16384;
    /** @type {HTMLTableElement} */
    this.table;
};
/**
 * @returns {AudioContext}
 */
SoundFont.Synthesizer.prototype.getAudioContext = function () {
    /** @type {AudioContext} */
    var ctx;
    /* Modified by midixman:
    if (goog.global['AudioContext'] !== void 0) {
      ctx = new goog.global['AudioContext']();
    } else if (goog.global['webkitAudioContext'] !== void 0) {
      ctx = new goog.global['webkitAudioContext']();
    } else if (goog.global['mozAudioContext'] !== void 0) {
      ctx = new goog.global['mozAudioContext']();
    } else {
      throw new Error('Web Audio not supported');
    }
    */
    ctx = new AudioContext();
    if (ctx.createGainNode === void 0) {
        ctx.createGainNode = ctx.createGain;
    }
    return ctx;
};
/**
 * @type {Array.<string>}
 * @const
 */
SoundFont.Synthesizer.ProgramNames = [
    "Acoustic Piano",
    "Bright Piano",
    "Electric Grand Piano",
    "Honky-tonk Piano",
    "Electric Piano",
    "Electric Piano 2",
    "Harpsichord",
    "Clavi",
    "Celesta",
    "Glockenspiel",
    "Musical box",
    "Vibraphone",
    "Marimba",
    "Xylophone",
    "Tubular Bell",
    "Dulcimer",
    "Drawbar Organ",
    "Percussive Organ",
    "Rock Organ",
    "Church organ",
    "Reed organ",
    "Accordion",
    "Harmonica",
    "Tango Accordion",
    "Acoustic Guitar (nylon)",
    "Acoustic Guitar (steel)",
    "Electric Guitar (jazz)",
    "Electric Guitar (clean)",
    "Electric Guitar (muted)",
    "Overdriven Guitar",
    "Distortion Guitar",
    "Guitar harmonics",
    "Acoustic Bass",
    "Electric Bass (finger)",
    "Electric Bass (pick)",
    "Fretless Bass",
    "Slap Bass 1",
    "Slap Bass 2",
    "Synth Bass 1",
    "Synth Bass 2",
    "Violin",
    "Viola",
    "Cello",
    "Double bass",
    "Tremolo Strings",
    "Pizzicato Strings",
    "Orchestral Harp",
    "Timpani",
    "String Ensemble 1",
    "String Ensemble 2",
    "Synth Strings 1",
    "Synth Strings 2",
    "Voice Aahs",
    "Voice Oohs",
    "Synth Voice",
    "Orchestra Hit",
    "Trumpet",
    "Trombone",
    "Tuba",
    "Muted Trumpet",
    "French horn",
    "Brass Section",
    "Synth Brass 1",
    "Synth Brass 2",
    "Soprano Sax",
    "Alto Sax",
    "Tenor Sax",
    "Baritone Sax",
    "Oboe",
    "English Horn",
    "Bassoon",
    "Clarinet",
    "Piccolo",
    "Flute",
    "Recorder",
    "Pan Flute",
    "Blown Bottle",
    "Shakuhachi",
    "Whistle",
    "Ocarina",
    "Lead 1 (square)",
    "Lead 2 (sawtooth)",
    "Lead 3 (calliope)",
    "Lead 4 (chiff)",
    "Lead 5 (charang)",
    "Lead 6 (voice)",
    "Lead 7 (fifths)",
    "Lead 8 (bass + lead)",
    "Pad 1 (Fantasia)",
    "Pad 2 (warm)",
    "Pad 3 (polysynth)",
    "Pad 4 (choir)",
    "Pad 5 (bowed)",
    "Pad 6 (metallic)",
    "Pad 7 (halo)",
    "Pad 8 (sweep)",
    "FX 1 (rain)",
    "FX 2 (soundtrack)",
    "FX 3 (crystal)",
    "FX 4 (atmosphere)",
    "FX 5 (brightness)",
    "FX 6 (goblins)",
    "FX 7 (echoes)",
    "FX 8 (sci-fi)",
    "Sitar",
    "Banjo",
    "Shamisen",
    "Koto",
    "Kalimba",
    "Bagpipe",
    "Fiddle",
    "Shanai",
    "Tinkle Bell",
    "Agogo",
    "Steel Drums",
    "Woodblock",
    "Taiko Drum",
    "Melodic Tom",
    "Synth Drum",
    "Reverse Cymbal",
    "Guitar Fret Noise",
    "Breath Noise",
    "Seashore",
    "Bird Tweet",
    "Telephone Ring",
    "Helicopter",
    "Applause",
    "Gunshot"
];
SoundFont.Synthesizer.prototype.init = function () {
    /** @type {number} */
    var i;
    this.parser = new SoundFont.Parser(this.input);
    this.bankSet = this.createAllInstruments();
    for (i = 0; i < 16; ++i) {
        this.programChange(i, i);
        this.volumeChange(i, 0x64);
        this.panpotChange(i, 0x40);
        this.pitchBend(i, 0x00, 0x40); // 8192
        this.pitchBendSensitivity(i, 2);
    }
};
/**
 * @param {Uint8Array} input
 */
SoundFont.Synthesizer.prototype.refreshInstruments = function (input) {
    this.input = input;
    this.parser = new SoundFont.Parser(input);
    this.bankSet = this.createAllInstruments();
};
SoundFont.Synthesizer.prototype.createAllInstruments = function () {
    /** @type {SoundFont.Parser} */
    var parser = this.parser;
    parser.parse();
    /** @type {Array} TODO */
    var presets = parser.createPreset();
    /** @type {Array} TODO */
    var instruments = parser.createInstrument();
    /** @type {Object} */
    var banks = [];
    /** @type {Array.<Array.<Object>>} */
    var bank;
    /** @type {Object} TODO */
    var preset;
    /** @type {Object} */
    var instrument;
    /** @type {number} */
    var presetNumber;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {number} */
    var j;
    /** @type {number} */
    var jl;
    for (i = 0, il = presets.length; i < il; ++i) {
        preset = presets[i];
        presetNumber = preset.header.preset;
        if (typeof preset.instrument !== 'number') {
            continue;
        }
        instrument = instruments[preset.instrument];
        if (instrument.name.replace(/\0*$/, '') === 'EOI') {
            continue;
        }
        // select bank
        if (banks[preset.header.bank] === void 0) {
            banks[preset.header.bank] = [];
        }
        bank = banks[preset.header.bank];
        bank[presetNumber] = [];
        bank[presetNumber].name = preset.name;
        for (j = 0, jl = instrument.info.length; j < jl; ++j) {
            this.createNoteInfo(parser, instrument.info[j], bank[presetNumber]);
        }
    }
    return banks;
};
SoundFont.Synthesizer.prototype.createNoteInfo = function (parser, info, preset) {
    var generator = info.generator;
    /** @type {number} */
    var sampleId;
    /** @type {Object} */
    var sampleHeader;
    /** @type {number} */
    var volAttack;
    /** @type {number} */
    var volDecay;
    /** @type {number} */
    var volSustain;
    /** @type {number} */
    var volRelease;
    /** @type {number} */
    var modAttack;
    /** @type {number} */
    var modDecay;
    /** @type {number} */
    var modSustain;
    /** @type {number} */
    var modRelease;
    /** @type {number} */
    var tune;
    /** @type {number} */
    var scale;
    /** @type {number} */
    var freqVibLFO;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    if (generator['keyRange'] === void 0 || generator['sampleID'] === void 0) {
        return;
    }
    volAttack = this.getModGenAmount(generator, 'attackVolEnv', -12000);
    volDecay = this.getModGenAmount(generator, 'decayVolEnv', -12000);
    volSustain = this.getModGenAmount(generator, 'sustainVolEnv');
    volRelease = this.getModGenAmount(generator, 'releaseVolEnv', -12000);
    modAttack = this.getModGenAmount(generator, 'attackModEnv', -12000);
    modDecay = this.getModGenAmount(generator, 'decayModEnv', -12000);
    modSustain = this.getModGenAmount(generator, 'sustainModEnv');
    modRelease = this.getModGenAmount(generator, 'releaseModEnv', -12000);
    tune = (this.getModGenAmount(generator, 'coarseTune') +
        this.getModGenAmount(generator, 'fineTune') / 100);
    scale = this.getModGenAmount(generator, 'scaleTuning', 100) / 100;
    freqVibLFO = this.getModGenAmount(generator, 'freqVibLFO');
    for (i = generator['keyRange'].lo, il = generator['keyRange'].hi; i <= il; ++i) {
        if (preset[i]) {
            continue;
        }
        sampleId = this.getModGenAmount(generator, 'sampleID');
        sampleHeader = parser.sampleHeader[sampleId];
        preset[i] = {
            'sample': parser.sample[sampleId],
            'sampleRate': sampleHeader.sampleRate,
            'basePlaybackRate': Math.pow(Math.pow(2, 1 / 12), (i -
                this.getModGenAmount(generator, 'overridingRootKey', sampleHeader.originalPitch) +
                tune + (sampleHeader.pitchCorrection / 100)) * scale),
            'modEnvToPitch': this.getModGenAmount(generator, 'modEnvToPitch') / 100,
            'scaleTuning': scale,
            'start': this.getModGenAmount(generator, 'startAddrsCoarseOffset') * 32768 +
                this.getModGenAmount(generator, 'startAddrsOffset'),
            'end': this.getModGenAmount(generator, 'endAddrsCoarseOffset') * 32768 +
                this.getModGenAmount(generator, 'endAddrsOffset'),
            'loopStart': (
            //(sampleHeader.startLoop - sampleHeader.start) +
            (sampleHeader.startLoop) +
                this.getModGenAmount(generator, 'startloopAddrsCoarseOffset') * 32768 +
                this.getModGenAmount(generator, 'startloopAddrsOffset')),
            'loopEnd': (
            //(sampleHeader.endLoop - sampleHeader.start) +
            (sampleHeader.endLoop) +
                this.getModGenAmount(generator, 'endloopAddrsCoarseOffset') * 32768 +
                this.getModGenAmount(generator, 'endloopAddrsOffset')),
            'volAttack': Math.pow(2, volAttack / 1200),
            'volDecay': Math.pow(2, volDecay / 1200),
            'volSustain': volSustain / 1000,
            'volRelease': Math.pow(2, volRelease / 1200),
            'modAttack': Math.pow(2, modAttack / 1200),
            'modDecay': Math.pow(2, modDecay / 1200),
            'modSustain': modSustain / 1000,
            'modRelease': Math.pow(2, modRelease / 1200),
            'initialFilterFc': this.getModGenAmount(generator, 'initialFilterFc', 13500),
            'modEnvToFilterFc': this.getModGenAmount(generator, 'modEnvToFilterFc'),
            'initialFilterQ': this.getModGenAmount(generator, 'initialFilterQ'),
            'freqVibLFO': freqVibLFO ? Math.pow(2, freqVibLFO / 1200) * 8.176 : void 0
        };
    }
};
/**
 * @param {Object} generator
 * @param {string} enumeratorType
 * @param {number=} opt_default
 * @returns {number}
 */
SoundFont.Synthesizer.prototype.getModGenAmount = function (generator, enumeratorType, opt_default) {
    if (opt_default === void 0) {
        opt_default = 0;
    }
    return generator[enumeratorType] ? generator[enumeratorType].amount : opt_default;
};
SoundFont.Synthesizer.prototype.start = function () {
    this.bufSrc.connect(this.gainMaster);
    this.gainMaster.connect(this.ctx.destination);
    this.bufSrc.start(0);
    this.setMasterVolume(16383);
};
SoundFont.Synthesizer.prototype.setMasterVolume = function (volume) {
    this.masterVolume = volume;
    this.gainMaster.gain.value = this.baseVolume * (volume / 16384);
};
SoundFont.Synthesizer.prototype.stop = function () {
    this.bufSrc.disconnect(0);
    this.gainMaster.disconnect(0);
    this.compressor.disconnect(0);
};
/**
 * @type {!Array.<string>}
 * @const
 */
SoundFont.Synthesizer.TableHeader = ['Instrument', 'Vol', 'Pan', 'Bend', 'Range'];
SoundFont.Synthesizer.prototype.drawSynth = function () {
    /** @type {HTMLTableElement} */
    var table = this.table =
        /** @type {HTMLTableElement} */ (document.createElement('table'));
    /** @type {HTMLTableSectionElement} */
    var head = 
    /** @type {HTMLTableSectionElement} */ (document.createElement('thead'));
    /** @type {HTMLTableSectionElement} */
    var body = 
    /** @type {HTMLTableSectionElement} */
    (document.createElement('tbody'));
    /** @type {HTMLTableRowElement} */
    var tableLine;
    /** @type {NodeList} */
    var notes;
    /** @type {number} */
    var i;
    /** @type {number} */
    var j;
    head.appendChild(this.createTableLine(SoundFont.Synthesizer.TableHeader, true));
    for (i = 0; i < 16; ++i) {
        tableLine = this.createTableLine(SoundFont.Synthesizer.TableHeader.length + 128, false);
        body.appendChild(tableLine);
        if (i !== 9) {
            var select = document.createElement('select');
            var option;
            for (j = 0; j < 128; ++j) {
                option = document.createElement('option');
                option.textContent = SoundFont.Synthesizer.ProgramNames[j];
                select.appendChild(option);
            }
            tableLine.querySelector('td:nth-child(1)').appendChild(select);
            select.addEventListener('change', (function (synth, channel) {
                return function (event) {
                    synth.programChange(channel, event.target.selectedIndex);
                };
            })(this, i), false);
            select.selectedIndex = this.channelInstrument[i];
        }
        else {
            tableLine.querySelector('td:first-child').textContent = '[ RHYTHM TRACK ]';
        }
        notes = tableLine.querySelectorAll('td:nth-last-child(-n+128)');
        for (j = 0; j < 128; ++j) {
            notes[j].addEventListener('mousedown', (function (synth, channel, key) {
                return function (event) {
                    event.preventDefault();
                    synth.drag = true;
                    synth.noteOn(channel, key, 127);
                };
            })(this, i, j));
            notes[j].addEventListener('mouseover', (function (synth, channel, key) {
                return function (event) {
                    event.preventDefault();
                    if (synth.drag) {
                        synth.noteOn(channel, key, 127);
                    }
                };
            })(this, i, j));
            notes[j].addEventListener('mouseout', (function (synth, channel, key) {
                return function (event) {
                    event.preventDefault();
                    synth.noteOff(channel, key, 0);
                };
            })(this, i, j));
            notes[j].addEventListener('mouseup', (function (synth, channel, key) {
                return function (event) {
                    event.preventDefault();
                    synth.drag = false;
                    synth.noteOff(channel, key, 0);
                };
            })(this, i, j));
        }
    }
    table.appendChild(head);
    table.appendChild(body);
    return table;
};
SoundFont.Synthesizer.prototype.removeSynth = function () {
    var table = this.table;
    if (table) {
        table.parentNode.removeChild(table);
        this.table = null;
    }
};
/**
 * @param {!(Array.<string>|number)} array
 * @param {boolean} isTitleLine
 * @returns {HTMLTableRowElement}
 */
SoundFont.Synthesizer.prototype.createTableLine = function (array, isTitleLine) {
    /** @type {HTMLTableRowElement} */
    var tr = (document.createElement('tr'));
    /** @type {HTMLTableCellElement} */
    var cell;
    /** @type {boolean} */
    var isArray = array instanceof Array;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il = isArray ? array.length : (array);
    for (i = 0; i < il; ++i) {
        cell =
            /** @type {HTMLTableCellElement} */
            (document.createElement(isTitleLine ? 'th' : 'td'));
        cell.textContent = (isArray && array[i] !== void 0) ? array[i] : '';
        tr.appendChild(cell);
    }
    return tr;
};
/**
 * @param {number} channel NoteOn するチャンネル.
 * @param {number} key NoteOn するキー.
 * @param {number} velocity 強さ.
 */
SoundFont.Synthesizer.prototype.noteOn = function (channel, key, velocity) {
    /** @type {Object} */
    var bank = this.bankSet[channel === 9 ? 128 : this.bank];
    /** @type {Object} */
    var instrument = bank[this.channelInstrument[channel]];
    /** @type {Object} */
    var instrumentKey;
    /** @type {SoundFont.SynthesizerNote} */
    var note;
    if (this.table) {
        this.table.querySelector('tbody > ' +
            'tr:nth-child(' + (channel + 1) + ') > ' +
            'td:nth-child(' + (SoundFont.Synthesizer.TableHeader.length + key + 1) + ')').classList.add('note-on');
    }
    if (!instrument) {
        // TODO
        console.warn(// modified by midixman
        "instrument not found: bank=%s instrument=%s channel=%s", channel === 9 ? 128 : this.bank, this.channelInstrument[channel], channel);
        return;
    }
    instrumentKey = instrument[key];
    if (!(instrumentKey)) {
        // TODO
        console.warn(// modified by midixman
        "instrument not found: bank=%s instrument=%s channel=%s key=%s", channel === 9 ? 128 : this.bank, this.channelInstrument[channel], channel, key);
        return;
    }
    var panpot = this.channelPanpot[channel] - 64;
    panpot /= panpot < 0 ? 64 : 63;
    // create note information
    instrumentKey['channel'] = channel;
    instrumentKey['key'] = key;
    instrumentKey['velocity'] = velocity;
    instrumentKey['panpot'] = panpot;
    instrumentKey['volume'] = this.channelVolume[channel] / 127;
    instrumentKey['pitchBend'] = this.channelPitchBend[channel] - 8192;
    instrumentKey['pitchBendSensitivity'] = this.channelPitchBendSensitivity[channel];
    // note on
    note = new SoundFont.SynthesizerNote(this.ctx, this.gainMaster, instrumentKey);
    note.noteOn();
    this.currentNoteOn[channel].push(note);
};
/**
 * @param {number} channel NoteOff するチャンネル.
 * @param {number} key NoteOff するキー.
 * @param {number} velocity 強さ.
 */
SoundFont.Synthesizer.prototype.noteOff = function (channel, key, velocity) {
    /** @type {Object} */
    var bank = this.bankSet[channel === 9 ? 128 : this.bank];
    /** @type {Object} */
    var instrument = bank[this.channelInstrument[channel]];
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {Array.<SoundFont.SynthesizerNote>} */
    var currentNoteOn = this.currentNoteOn[channel];
    /** @type {SoundFont.SynthesizerNote} */
    var note;
    if (this.table) {
        this.table.querySelector('tbody > ' +
            'tr:nth-child(' + (channel + 1) + ') > ' +
            'td:nth-child(' + (key + SoundFont.Synthesizer.TableHeader.length + 1) + ')').classList.remove('note-on');
    }
    if (!instrument) {
        return;
    }
    for (i = 0, il = currentNoteOn.length; i < il; ++i) {
        note = currentNoteOn[i];
        if (note.key === key) {
            note.noteOff();
            currentNoteOn.splice(i, 1);
            --i;
            --il;
        }
    }
};
/**
 * @param {number} channel 音色を変更するチャンネル.
 * @param {number} instrument 音色番号.
 */
SoundFont.Synthesizer.prototype.programChange = function (channel, instrument) {
    if (this.table) {
        if (channel !== 9) {
            this.table.querySelector('tbody > tr:nth-child(' + (channel + 1) + ') > td:first-child > select').selectedIndex = instrument;
        }
    }
    // リズムトラックは無視する
    if (channel === 9) {
        return;
    }
    this.channelInstrument[channel] = instrument;
};
/**
 * @param {number} channel 音量を変更するチャンネル.
 * @param {number} volume 音量(0-127).
 */
SoundFont.Synthesizer.prototype.volumeChange = function (channel, volume) {
    if (this.table) {
        this.table.querySelector('tbody > tr:nth-child(' + (channel + 1) + ') > td:nth-child(2)').textContent = volume;
    }
    this.channelVolume[channel] = volume;
};
/**
 * @param {number} channel panpot を変更するチャンネル.
 * @param {number} panpot panpot(0-127).
 */
SoundFont.Synthesizer.prototype.panpotChange = function (channel, panpot) {
    if (this.table) {
        this.table.querySelector('tbody > tr:nth-child(' + (channel + 1) + ') > td:nth-child(3)').textContent = panpot;
    }
    this.channelPanpot[channel] = panpot;
};
/**
 * @param {number} channel panpot を変更するチャンネル.
 * @param {number} lowerByte
 * @param {number} higherByte
 */
SoundFont.Synthesizer.prototype.pitchBend = function (channel, lowerByte, higherByte) {
    /** @type {number} */
    var bend = (lowerByte & 0x7f) | ((higherByte & 0x7f) << 7);
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {Array.<SoundFont.SynthesizerNote>} */
    var currentNoteOn = this.currentNoteOn[channel];
    /** @type {number} */
    var calculated = bend - 8192;
    if (this.table) {
        this.table.querySelector('tbody > tr:nth-child(' + (channel + 1) + ') > td:nth-child(4)').textContent = calculated;
    }
    for (i = 0, il = currentNoteOn.length; i < il; ++i) {
        currentNoteOn[i].updatePitchBend(calculated);
    }
    this.channelPitchBend[channel] = bend;
};
/**
 * @param {number} channel pitch bend sensitivity を変更するチャンネル.
 * @param {number} sensitivity
 */
SoundFont.Synthesizer.prototype.pitchBendSensitivity = function (channel, sensitivity) {
    if (this.table) {
        this.table.querySelector('tbody > tr:nth-child(' + (channel + 1) + ') > td:nth-child(5)').textContent = sensitivity;
    }
    this.channelPitchBendSensitivity[channel] = sensitivity;
};
/**
 * @param {number} channel 音を消すチャンネル.
 */
SoundFont.Synthesizer.prototype.allSoundOff = function (channel) {
    /** @type {Array.<SoundFont.SynthesizerNote>} */
    var currentNoteOn = this.currentNoteOn[channel];
    while (currentNoteOn.length > 0) {
        this.noteOff(channel, currentNoteOn[0].key, 0);
    }
};
/**
 * @param {number} channel リセットするチャンネル
 */
SoundFont.Synthesizer.prototype.resetAllControl = function (channel) {
    this.pitchBend(channel, 0x00, 0x40); // 8192
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// From gree/sf2synth.js src/wml.js ////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @constructor
 */
SoundFont.WebMidiLink = function () {
    /** @type {Array.<number>} */
    this.RpnMsb = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    /** @type {Array.<number>} */
    this.RpnLsb = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    /** @type {boolean} */
    this.ready;
    /** @type {SoundFont.Synthesizer} */
    this.synth;
    /** @type {function(ArrayBuffer)} */
    this.loadCallback;
    /** @type {Function} */
    this.messageHandler = this.onmessage.bind(this);
    window.addEventListener('DOMContentLoaded', function () {
        this.ready = true;
    }.bind(this), false);
};
SoundFont.WebMidiLink.prototype.setup = function (url) {
    if (!this.ready) {
        window.addEventListener('DOMContentLoaded', function onload() {
            window.removeEventListener('DOMContentLoaded', onload, false);
            this.load(url);
        }.bind(this), false);
    }
    else {
        this.load(url);
    }
};
SoundFont.WebMidiLink.prototype.load = function (url) {
    /** @type {XMLHttpRequest} */
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.addEventListener('load', function (ev) {
        /** @type {XMLHttpRequest} */
        var xhr = ev.target;
        this.onload(xhr.response);
        if (typeof this.loadCallback === 'function') {
            this.loadCallback(xhr.response);
        }
    }.bind(this), false);
    xhr.send();
};
/**
 * @param {ArrayBuffer} response
 */
SoundFont.WebMidiLink.prototype.onload = function (response) {
    /** @type {Uint8Array} */
    var input = new Uint8Array(response);
    this.loadSoundFont(input);
};
/**
 * @param {Uint8Array} input
 */
SoundFont.WebMidiLink.prototype.loadSoundFont = function (input) {
    /** @type {SoundFont.Synthesizer} */
    var synth;
    if (!this.synth) {
        synth = this.synth = new SoundFont.Synthesizer(input);
        document.body.appendChild(synth.drawSynth());
        synth.init();
        synth.start();
        window.addEventListener('message', this.messageHandler, false);
    }
    else {
        synth = this.synth;
        synth.refreshInstruments(input);
    }
    // link ready
    if (window.opener) {
        window.opener.postMessage("link,ready", '*');
    }
    else if (window.parent !== window) {
        window.parent.postMessage("link,ready", '*');
    }
};
/**
 * @param {Event} ev
 */
SoundFont.WebMidiLink.prototype.onmessage = function (ev) {
    var msg = ev.data.split(',');
    var type = msg.shift();
    var command;
    switch (type) {
        // Addition by midixman
        case 'process-tick':
            break;
        case 'midi':
            this.processMidiMessage(msg.map(function (hex) {
                return parseInt(hex, 16);
            }));
            break;
        case 'link':
            command = msg.shift();
            switch (command) {
                case 'reqpatch':
                    // TODO: dummy data
                    if (window.opener) {
                        window.opener.postMessage("link,patch", '*');
                    }
                    else if (window.parent !== window) {
                        window.parent.postMessage("link,patch", '*');
                    }
                    break;
                case 'setpatch':
                    // TODO: NOP
                    break;
                default:
                    console.error('unknown link message:', command); // modified by midixman
                    break;
            }
            break;
        default:
            console.error('unknown message type: ' + type); // modified by midixman
    }
};
/**
 * @param {function(ArrayBuffer)} callback
 */
SoundFont.WebMidiLink.prototype.setLoadCallback = function (callback) {
    this.loadCallback = callback;
};
/**
 * @param {Array.<number>} message
 */
SoundFont.WebMidiLink.prototype.processMidiMessage = function (message) {
    /** @type {number} */
    var channel = message[0] & 0x0f;
    /** @type {SoundFont.Synthesizer} */
    var synth = this.synth;
    switch (message[0] & 0xf0) {
        case 0x80:
            synth.noteOff(channel, message[1], message[2]);
            break;
        case 0x90:
            if (message[2] > 0) {
                synth.noteOn(channel, message[1], message[2]);
            }
            else {
                synth.noteOff(channel, message[1], 0);
            }
            break;
        case 0xB0:
            switch (message[1]) {
                case 0x06:
                    switch (this.RpnMsb[channel]) {
                        case 0:
                            switch (this.RpnLsb[channel]) {
                                case 0:
                                    synth.pitchBendSensitivity(channel, message[2]);
                                    break;
                            }
                            break;
                    }
                    break;
                case 0x07:
                    synth.volumeChange(channel, message[2]);
                    break;
                case 0x0A:
                    synth.panpotChange(channel, message[2]);
                    break;
                case 0x78:
                    synth.allSoundOff(channel);
                    break;
                case 0x79:
                    synth.resetAllControl(channel);
                    break;
                case 0x20:
                    //console.log("bankselect:", channel, message[2]);
                    break;
                case 0x64:
                    this.RpnMsb[channel] = message[2];
                    break;
                case 0x65:
                    this.RpnLsb[channel] = message[2];
                    break;
                default:
            }
            break;
        case 0xC0:
            synth.programChange(channel, message[1]);
            break;
        case 0xE0:
            synth.pitchBend(channel, message[1], message[2]);
            break;
        case 0xf0:
            // ID number
            switch (message[1]) {
                case 0x7e:
                    // TODO
                    break;
                case 0x7f:
                    var device = message[2];
                    // sub ID 1
                    switch (message[3]) {
                        case 0x04:
                            // sub ID 2
                            switch (message[4]) {
                                case 0x01:
                                    synth.setMasterVolume(message[5] + (message[6] << 7));
                                    break;
                            }
                            break;
                    }
                    break;
            }
            break;
        default:
            break;
    }
};
var MidiPort = (function () {
    function MidiPort(device, port) {
        if (port === void 0) { port = null; }
        this.device = device;
        this.port = port;
    }
    return MidiPort;
}());
var WmlDevice = (function () {
    function WmlDevice(id) {
        this.id = id;
        this.manufacturer = 'gree/sf2synth.js';
        this.name = "Yuta Imaya's WebMidiLink";
        this.type = 'output';
        this.version = '3c792f4 Jun 3, 2013';
    }
    return WmlDevice;
}());
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var WebAudioMidi = (function () {
    function WebAudioMidi(callbackFunc, soundfontUrl, opt) {
        var _this = this;
        if (opt === void 0) { opt = null; }
        this._conlog = false; // flag whether console log is printed or not
        this._mAcc = null; // MIDI Access
        this._failureMsg = ''; // message of failure to obtain MIDI Access
        this._wml = null; // Web MIDI Link
        this._aCtx = null; // Audio Context (for currentTime)
        this.clock = null; // WAAClock
        this._dfltOutIdx = -1; // default index of out port (negative means the last one)
        this._thruOutIdx = 0; // index of out port for MIDI thru
        this._dfltNoteOnVel = 80; // default note off velocity
        this._dfltNoteOffVel = 64; // default note off velocity
        this.outDevices = []; // output devices
        this.inDevices = []; // input devices
        this.outPorts = []; // output ports: WML is always the last one
        this.inPorts = []; // input ports
        if (opt && opt.conlog)
            this._conlog = true;
        this.clog('WebAudioMidi is being created...');
        // Web MIDI API
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
                alert('No real MIDI output ports. (Sound will be generated via SoundFont.)');
            if (_this._aCtx)
                callbackFunc();
        }, function (msg) {
            alert('Failed to get MIDI access: ' + msg);
            _this._failureMsg = msg;
            if (_this._aCtx)
                callbackFunc();
        });
        // Web Audio API
        this._wml = new SoundFont.WebMidiLink();
        this._wml.setLoadCallback(function (arraybufer) {
            _this.clog('WebMidiLink ready!');
            _this._aCtx = _this._wml.synth.ctx;
            _this.putWmlIntoLastPort();
            _this.clock = new WAAClock(_this._aCtx);
            _this.clock.start();
            if (_this._mAcc || _this.failureMsg)
                callbackFunc();
        });
        this._wml.setup(soundfontUrl);
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
        this.send([0x90 + channel, note, velocity], delay, outIndex);
    };
    WebAudioMidi.prototype.noteOff = function (channel, note, delay, outIndex, velocity) {
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        if (velocity === void 0) { velocity = this._dfltNoteOffVel; }
        // delay in milliseconds
        this.send([0x80 + channel, note, velocity], delay, outIndex);
    };
    WebAudioMidi.prototype.chordOn = function (channel, notes, velocity, delay, outIndex) {
        if (velocity === void 0) { velocity = this._dfltNoteOnVel; }
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        // delay in milliseconds
        for (var _i = 0, notes_1 = notes; _i < notes_1.length; _i++) {
            var n = notes_1[_i];
            this.send([0x90 + channel, n, velocity], delay, outIndex);
        }
    };
    WebAudioMidi.prototype.chordOff = function (channel, notes, delay, outIndex, velocity) {
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        if (velocity === void 0) { velocity = this._dfltNoteOffVel; }
        // delay in milliseconds
        for (var _i = 0, notes_2 = notes; _i < notes_2.length; _i++) {
            var n = notes_2[_i];
            this.send([0x80 + channel, n, velocity], delay, outIndex);
        }
    };
    WebAudioMidi.prototype.programChange = function (channel, program, delay, outIndex) {
        if (delay === void 0) { delay = 0; }
        if (outIndex === void 0) { outIndex = this._dfltOutIdx; }
        this.send([0xC0 + channel, program], delay, outIndex);
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
        this.testKeyToNote();
        alert('WebAM tests completed. (See console log or Ctrl+Shift+J in Chrome.)');
        this._conlog = conlog;
    };
    WebAudioMidi.prototype.testNoteToKey = function () {
        this.clog('Test noteToKey():');
        for (var _i = 0, _a = [0, 21, 60, 108, 127]; _i < _a.length; _i++) {
            var n = _a[_i];
            this.clog('\t', n, '->', this.noteToKey(n));
        }
    };
    WebAudioMidi.prototype.testKeyToNote = function () {
        this.clog('Test keyToNote():');
        for (var _i = 0, _a = ['C-1', 'f#2', 'c4', 'bb7', 'G9']; _i < _a.length; _i++) {
            var k = _a[_i];
            this.clog('\t', k, '->', this.keyToNote(k));
        }
    };
    WebAudioMidi.prototype.soundTestPercussion = function (delay) {
        if (delay === void 0) { delay = 1000; }
        for (var n = 27, i = 0; n <= 87; ++n, ++i) {
            this.noteOn(9, n, 127, i * delay);
            this.noteOff(9, n, (i + 0.9) * delay);
        }
    };
    WebAudioMidi.prototype.soundTestPrograms = function (delay) {
        if (delay === void 0) { delay = 1000; }
        for (var p = 0, i = 0; p < 128; ++p, ++i) {
            this.programChange(0, p, i * delay);
            this.noteOn(0, 60, 127, i * delay);
            this.noteOff(0, 60, (i + 0.9) * delay);
        }
    };
    //================================================================================================
    // Private Methods
    WebAudioMidi.prototype.clog = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (this._conlog)
            console.log('WAM: ' + args.join(' '));
    };
    WebAudioMidi.prototype.storeDevices = function () {
        var _this = this;
        // The index is the key or ID
        this._mAcc.outputs.forEach(function (device, key) {
            _this.outDevices[key] = device;
        });
        this._mAcc.inputs.forEach(function (device, key) {
            _this.inDevices[key] = device;
        });
    };
    WebAudioMidi.prototype.putDevicesIntoPorts = function () {
        var idx = this.outDevices.length;
        if (this.outPorts[0])
            this.outPorts[idx] = this.outPorts[0];
        if (this._dfltOutIdx < 0)
            this._dfltOutIdx = idx;
        for (var d in this.outDevices)
            this.outPorts[d] = new MidiPort(this.outDevices[d], this._mAcc.outputs.get(d));
        for (var d in this.inDevices)
            this.inPorts[d] = new MidiPort(this.inDevices[d]);
    };
    WebAudioMidi.prototype.putWmlIntoLastPort = function () {
        var idx = this.outDevices.length;
        var d = new WmlDevice(idx.toString());
        this.outPorts[idx] = new MidiPort(d, null);
        if (this._dfltOutIdx < 0)
            this._dfltOutIdx = idx;
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
    WebAudioMidi.prototype.send = function (msg, delay, outIndex) {
        var _this = this;
        // delay in milliseconds
        this.clog('Sending [' + msg + '] delay ' + delay + ' msec to index ' + outIndex);
        var port = this.outPorts[outIndex].port;
        if (port) {
            var timeStamp = window.performance.now() + delay;
            port.send(msg, timeStamp);
            this.clog('timeStamp = ' + timeStamp + ' msec');
        }
        else {
            var startTime = this._aCtx.currentTime + (delay / 1000);
            this.clock.setTimeout(function () { _this._wml.processMidiMessage(msg); }, delay / 1000);
            this.clog('startTime = ' + startTime + ' sec');
        }
    };
    return WebAudioMidi;
}());
// ------- end of file -------
