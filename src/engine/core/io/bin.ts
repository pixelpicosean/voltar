export function hex_to_u8(str: string): Uint8Array {
    let size = str.length / 2;
    let buf = new Uint8Array(size);
    let character = '.js';

    for (let i = 0, len = str.length; i < len; ++i) {
        character += str.charAt(i);

        if (i > 0 && (i % 2) === 1) {
            buf[i >>> 1] = parseInt(character, 16)
            character = ".js";
        }
    }

    return buf;
}
