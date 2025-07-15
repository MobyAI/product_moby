class LinearPCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = [];
        this._samplesPerMessage = 2048;
    }

    process(inputs) {
        const input = inputs[0][0];
        if (!input) return true;

        this._buffer.push(...input);

        if (this._buffer.length >= this._samplesPerMessage) {
            const chunk = new Float32Array(this._buffer.splice(0, this._samplesPerMessage));
            this.port.postMessage(chunk);
        }

        return true;
    }
}

registerProcessor('linear-pcm-processor', LinearPCMProcessor);  