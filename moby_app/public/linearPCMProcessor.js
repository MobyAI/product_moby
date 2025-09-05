class LinearPCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.decimationFactor = 3; // 48kHz → 16kHz
        this.sampleBuffer = [];
        this.frameSize = 320; // 20ms at 16kHz

        // Simple low-pass filter coefficients (Butterworth)
        this.filterState = { x1: 0, x2: 0, y1: 0, y2: 0 };
    }

    // Simple 2nd-order low-pass filter (cutoff ~7kHz)
    lowPassFilter(sample) {
        // Butterworth coefficients for ~7kHz cutoff at 48kHz
        const a0 = 0.0495;
        const a1 = 0.099;
        const a2 = 0.0495;
        const b1 = -1.1619;
        const b2 = 0.3699;

        const output = a0 * sample + a1 * this.filterState.x1 +
            a2 * this.filterState.x2 - b1 * this.filterState.y1 -
            b2 * this.filterState.y2;

        this.filterState.x2 = this.filterState.x1;
        this.filterState.x1 = sample;
        this.filterState.y2 = this.filterState.y1;
        this.filterState.y1 = output;

        return output;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const samples = input[0];

        for (let i = 0; i < samples.length; i++) {
            // Apply low-pass filter
            const filtered = this.lowPassFilter(samples[i]);

            // Decimate: keep every 3rd sample
            if (i % this.decimationFactor === 0) {
                this.sampleBuffer.push(filtered);
            }
        }

        // Emit 20ms frames (320 samples at 16kHz)
        while (this.sampleBuffer.length >= this.frameSize) {
            const frame = this.sampleBuffer.splice(0, this.frameSize);
            const int16Array = this.floatTo16BitPCM(frame);

            this.port.postMessage({
                type: 'audio',
                data: int16Array.buffer,
                sampleRate: 16000
            });
        }

        return true;
    }

    floatTo16BitPCM(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }
}

registerProcessor('linear-pcm-processor', LinearPCMProcessor);