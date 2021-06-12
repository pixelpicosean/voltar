export class AudioServer {
    static get_singleton() { return singleton }

    constructor() {
        if (!singleton) singleton = this;
    }
}

let singleton: AudioServer = null;
