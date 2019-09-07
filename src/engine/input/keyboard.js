export const Keyboard = {
    /**
     * @type {Object.<string, boolean>}}
     * @private
     */
    pressed_keys: {},
    manager: null,

    _init(manager) {
        this.manager = manager;

        window.addEventListener('keydown', this._keydown.bind(this));
        window.addEventListener('keyup', this._keyup.bind(this));
        window.addEventListener('blur', this._reset_keys.bind(this));
    },

    /**
     * Check if key is pressed down.
     *
     * @param {string} key  Name of the key to check
     * @return {Boolean}  Whether this key is pressed down
     */
    down(key) {
        return !!this.pressed_keys[key];
    },

    /**
     * @param {KeyboardEvent} event   Keydown event
     * @private
     */
    _keydown(event) {
        if (!KEYS[event.keyCode]) {
            // Unknown key
            KEYS[event.keyCode.toString()] = event.keyCode;
        }

        if (this.pressed_keys[KEYS[event.keyCode]]) {
            return;
        }

        if (!this.pressed_keys[KEYS[event.keyCode]]) {
            this.pressed_keys[KEYS[event.keyCode]] = true;
            this.manager._keydown(KEYS[event.keyCode], this.down('SHIFT'), this.down('CTRL'), this.down('ALT'));
        }
    },

    /**
     * @param {KeyboardEvent} event   Key up event
     * @private
     */
    _keyup(event) {
        if (this.pressed_keys[KEYS[event.keyCode]]) {
            this.pressed_keys[KEYS[event.keyCode]] = false;
            this.manager._keyup(KEYS[event.keyCode]);
        }
    },

    _process(delta) { },

    _reset_keys() {
        for (var key in this.pressed_keys) {
            this.pressed_keys[key] = false;
        }
    },
}

/**
 * List of available keys.
 *
 * @type {Object.<number, string>}
 */
export const KEYS = {
    8: 'BACKSPACE',
    9: 'TAB',
    13: 'ENTER',
    16: 'SHIFT',
    17: 'CTRL',
    18: 'ALT',
    19: 'PAUSE',
    20: 'CAPS_LOCK',
    27: 'ESC',
    32: 'SPACE',
    33: 'PAGE_UP',
    34: 'PAGE_DOWN',
    35: 'END',
    36: 'HOME',
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN',
    44: 'PRINT_SCREEN',
    45: 'INSERT',
    46: 'DELETE',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9',
    65: 'A',
    66: 'B',
    67: 'C',
    68: 'D',
    69: 'E',
    70: 'F',
    71: 'G',
    72: 'H',
    73: 'I',
    74: 'J',
    75: 'K',
    76: 'L',
    77: 'M',
    78: 'N',
    79: 'O',
    80: 'P',
    81: 'Q',
    82: 'R',
    83: 'S',
    84: 'T',
    85: 'U',
    86: 'V',
    87: 'W',
    88: 'X',
    89: 'Y',
    90: 'Z',
    96: 'NUM_0',
    97: 'NUM_1',
    98: 'NUM_2',
    99: 'NUM_3',
    100: 'NUM_4',
    101: 'NUM_5',
    102: 'NUM_6',
    103: 'NUM_7',
    104: 'NUM_8',
    105: 'NUM_9',
    106: 'NUM_MULTIPLY',
    107: 'NUM_PLUS',
    109: 'NUM_MINUS',
    110: 'NUM_PERIOD',
    111: 'NUM_DIVISION',
    112: 'F1',
    113: 'F2',
    114: 'F3',
    115: 'F4',
    116: 'F5',
    117: 'F6',
    118: 'F7',
    119: 'F8',
    120: 'F9',
    121: 'F10',
    122: 'F11',
    123: 'F12',
    186: 'SEMICOLON',
    187: 'PLUS',
    189: 'MINUS',
    192: 'GRAVE_ACCENT',
    222: 'SINGLE_QUOTE',
};
