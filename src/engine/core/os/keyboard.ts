const is_mac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const KEY_CODE_MASK = ((1 << 25) - 1); ///< Apply this mask to any keycode to remove modifiers.
export const KEY_MODIFIER_MASK = (0xFF << 24); ///< Apply this mask to isolate modifiers.
export const KEY_MASK_SHIFT = (1 << 25);
export const KEY_MASK_ALT = (1 << 26);
export const KEY_MASK_META = (1 << 27);
export const KEY_MASK_CTRL = (1 << 28);

export const KEY_MASK_CMD = is_mac ? KEY_MASK_META : KEY_MASK_CTRL;

export const KEY_MASK_KPAD = (1 << 29);
export const KEY_MASK_GROUP_SWITCH = (1 << 30);

/**
 * List of available keys.
 */
export const KEYS: { [key: string]: number } = {
    'BACKSPACE': 8,
    'TAB': 9,
    'ENTER': 13,
    'SHIFT': 16,
    'CTRL': 17,
    'ALT': 18,
    'PAUSE': 19,
    'CAPS_LOCK': 20,
    'ESC': 27,
    'SPACE': 32,
    'PAGE_UP': 33,
    'PAGE_DOWN': 34,
    'END': 35,
    'HOME': 36,
    'LEFT': 37,
    'UP': 38,
    'RIGHT': 39,
    'DOWN': 40,
    'PRINT_SCREEN': 44,
    'INSERT': 45,
    'DELETE': 46,
    '0': 48,
    '1': 49,
    '2': 50,
    '3': 51,
    '4': 52,
    '5': 53,
    '6': 54,
    '7': 55,
    '8': 56,
    '9': 57,
    'A': 65,
    'B': 66,
    'C': 67,
    'D': 68,
    'E': 69,
    'F': 70,
    'G': 71,
    'H': 72,
    'I': 73,
    'J': 74,
    'K': 75,
    'L': 76,
    'M': 77,
    'N': 78,
    'O': 79,
    'P': 80,
    'Q': 81,
    'R': 82,
    'S': 83,
    'T': 84,
    'U': 85,
    'V': 86,
    'W': 87,
    'X': 88,
    'Y': 89,
    'Z': 90,
    'NUM_0': 96,
    'NUM_1': 97,
    'NUM_2': 98,
    'NUM_3': 99,
    'NUM_4': 100,
    'NUM_5': 101,
    'NUM_6': 102,
    'NUM_7': 103,
    'NUM_8': 104,
    'NUM_9': 105,
    'NUM_MULTIPLY': 106,
    'NUM_PLUS': 107,
    'NUM_MINUS': 109,
    'NUM_PERIOD': 110,
    'NUM_DIVISION': 111,
    'F1': 112,
    'F2': 113,
    'F3': 114,
    'F4': 115,
    'F5': 116,
    'F6': 117,
    'F7': 118,
    'F8': 119,
    'F9': 120,
    'F10': 121,
    'F11': 122,
    'F12': 123,
    'SEMICOLON': 186,
    'PLUS': 187,
    'MINUS': 189,
    'GRAVE_ACCENT': 192,
    'SINGLE_QUOTE': 222,
    'META': 91, // webkit left command
};

const ScancodeToKeys = Object.keys(KEYS).reduce((map, name) => {
    map[KEYS[name]] = name;
    return map;
}, {} as { [value: number]: string });
ScancodeToKeys[93] = 'META'; // webkit right command
ScancodeToKeys[224] = 'META'; // firefox command

export function keycode_get_string(p_code: number) {
    let codestr = '';
    if (p_code & KEY_MASK_SHIFT) {
        codestr += 'SHIFT+';
    }
    if (p_code & KEY_MASK_ALT) {
        codestr += 'ALT+';
    }
    if (p_code & KEY_MASK_CTRL) {
        codestr += 'CTRL+';
    }
    if (p_code & KEY_MASK_META) {
        codestr += 'META+';
    }
    p_code &= KEY_CODE_MASK;

    codestr += ScancodeToKeys[p_code];

    return codestr;
}

export function find_keycode_name(p_code: number) {
    return ScancodeToKeys[p_code];
}
