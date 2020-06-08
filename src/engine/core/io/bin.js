/**
 * @param {string} str
 */
export function hex_to_u8(str) {
    var size = str.length / 2
        , buf = new Uint8Array(size)
        , character = ''

    for (var i = 0, len = str.length; i < len; ++i) {
        character += str.charAt(i)

        if (i > 0 && (i % 2) === 1) {
            buf[i >>> 1] = parseInt(character, 16)
            character = ''
        }
    }

    return buf
}
