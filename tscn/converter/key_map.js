const SPKEY = (1 << 24);

const GD_KeyList = {
    'ESCAPE': SPKEY | 0x01,
    'TAB': SPKEY | 0x02,
    'BACKTAB': SPKEY | 0x03,
    'BACKSPACE': SPKEY | 0x04,
    'ENTER': SPKEY | 0x05,
    'KP_ENTER': SPKEY | 0x06,
    'INSERT': SPKEY | 0x07,
    'DELETE': SPKEY | 0x08,
    'PAUSE': SPKEY | 0x09,
    'PRINT': SPKEY | 0x0A,
    'SYSREQ': SPKEY | 0x0B,
    'CLEAR': SPKEY | 0x0C,
    'HOME': SPKEY | 0x0D,
    'END': SPKEY | 0x0E,
    'LEFT': SPKEY | 0x0F,
    'UP': SPKEY | 0x10,
    'RIGHT': SPKEY | 0x11,
    'DOWN': SPKEY | 0x12,
    'PAGEUP': SPKEY | 0x13,
    'PAGEDOWN': SPKEY | 0x14,
    'SHIFT': SPKEY | 0x15,
    'CONTROL': SPKEY | 0x16,
    'META': SPKEY | 0x17,
    'ALT': SPKEY | 0x18,
    'CAPSLOCK': SPKEY | 0x19,
    'NUMLOCK': SPKEY | 0x1A,
    'SCROLLLOCK': SPKEY | 0x1B,
    'F1': SPKEY | 0x1C,
    'F2': SPKEY | 0x1D,
    'F3': SPKEY | 0x1E,
    'F4': SPKEY | 0x1F,
    'F5': SPKEY | 0x20,
    'F6': SPKEY | 0x21,
    'F7': SPKEY | 0x22,
    'F8': SPKEY | 0x23,
    'F9': SPKEY | 0x24,
    'F10': SPKEY | 0x25,
    'F11': SPKEY | 0x26,
    'F12': SPKEY | 0x27,
    'F13': SPKEY | 0x28,
    'F14': SPKEY | 0x29,
    'F15': SPKEY | 0x2A,
    'F16': SPKEY | 0x2B,
    'NUM_MULTIPLY': SPKEY | 0x81,
    'NUM_DIVIDE': SPKEY | 0x82,
    'NUM_SUBTRACT': SPKEY | 0x83,
    'NUM_PERIOD': SPKEY | 0x84,
    'NUM_ADD': SPKEY | 0x85,
    'NUM_0': SPKEY | 0x86,
    'NUM_1': SPKEY | 0x87,
    'NUM_2': SPKEY | 0x88,
    'NUM_3': SPKEY | 0x89,
    'NUM_4': SPKEY | 0x8A,
    'NUM_5': SPKEY | 0x8B,
    'NUM_6': SPKEY | 0x8C,
    'NUM_7': SPKEY | 0x8D,
    'NUM_8': SPKEY | 0x8E,
    'NUM_9': SPKEY | 0x8F,
    'SUPER_L': SPKEY | 0x2C,
    'SUPER_R': SPKEY | 0x2D,
    'MENU': SPKEY | 0x2E,
    'HYPER_L': SPKEY | 0x2F,
    'HYPER_R': SPKEY | 0x30,
    'HELP': SPKEY | 0x31,
    'DIRECTION_L': SPKEY | 0x32,
    'DIRECTION_R': SPKEY | 0x33,
    'BACK': SPKEY | 0x40,
    'FORWARD': SPKEY | 0x41,
    'STOP': SPKEY | 0x42,
    'REFRESH': SPKEY | 0x43,
    'VOLUMEDOWN': SPKEY | 0x44,
    'VOLUMEMUTE': SPKEY | 0x45,
    'VOLUMEUP': SPKEY | 0x46,
    'BASSBOOST': SPKEY | 0x47,
    'BASSUP': SPKEY | 0x48,
    'BASSDOWN': SPKEY | 0x49,
    'TREBLEUP': SPKEY | 0x4A,
    'TREBLEDOWN': SPKEY | 0x4B,
    'MEDIAPLAY': SPKEY | 0x4C,
    'MEDIASTOP': SPKEY | 0x4D,
    'MEDIAPREVIOUS': SPKEY | 0x4E,
    'MEDIANEXT': SPKEY | 0x4F,
    'MEDIARECORD': SPKEY | 0x50,
    'HOMEPAGE': SPKEY | 0x51,
    'FAVORITES': SPKEY | 0x52,
    'SEARCH': SPKEY | 0x53,
    'STANDBY': SPKEY | 0x54,
    'OPENURL': SPKEY | 0x55,
    'LAUNCHMAIL': SPKEY | 0x56,
    'LAUNCHMEDIA': SPKEY | 0x57,
    'LAUNCH0': SPKEY | 0x58,
    'LAUNCH1': SPKEY | 0x59,
    'LAUNCH2': SPKEY | 0x5A,
    'LAUNCH3': SPKEY | 0x5B,
    'LAUNCH4': SPKEY | 0x5C,
    'LAUNCH5': SPKEY | 0x5D,
    'LAUNCH6': SPKEY | 0x5E,
    'LAUNCH7': SPKEY | 0x5F,
    'LAUNCH8': SPKEY | 0x60,
    'LAUNCH9': SPKEY | 0x61,
    'LAUNCHA': SPKEY | 0x62,
    'LAUNCHB': SPKEY | 0x63,
    'LAUNCHC': SPKEY | 0x64,
    'LAUNCHD': SPKEY | 0x65,
    'LAUNCHE': SPKEY | 0x66,
    'LAUNCHF': SPKEY | 0x67,

    'UNKNOWN': SPKEY | 0xFFFFFF,

    /* PRINTABLE LATIN 1 CODES */

    'SPACE': 0x0020,
    'EXCLAM': 0x0021,
    'QUOTEDBL': 0x0022,
    'NUMBERSIGN': 0x0023,
    'DOLLAR': 0x0024,
    'PERCENT': 0x0025,
    'AMPERSAND': 0x0026,
    'APOSTROPHE': 0x0027,
    'PARENLEFT': 0x0028,
    'PARENRIGHT': 0x0029,
    'ASTERISK': 0x002A,
    'PLUS': 0x002B,
    'COMMA': 0x002C,
    'MINUS': 0x002D,
    'PERIOD': 0x002E,
    'SLASH': 0x002F,
    '0': 0x0030,
    '1': 0x0031,
    '2': 0x0032,
    '3': 0x0033,
    '4': 0x0034,
    '5': 0x0035,
    '6': 0x0036,
    '7': 0x0037,
    '8': 0x0038,
    '9': 0x0039,
    'COLON': 0x003A,
    'SEMICOLON': 0x003B,
    'LESS': 0x003C,
    'EQUAL': 0x003D,
    'GREATER': 0x003E,
    'QUESTION': 0x003F,
    'AT': 0x0040,
    'A': 0x0041,
    'B': 0x0042,
    'C': 0x0043,
    'D': 0x0044,
    'E': 0x0045,
    'F': 0x0046,
    'G': 0x0047,
    'H': 0x0048,
    'I': 0x0049,
    'J': 0x004A,
    'K': 0x004B,
    'L': 0x004C,
    'M': 0x004D,
    'N': 0x004E,
    'O': 0x004F,
    'P': 0x0050,
    'Q': 0x0051,
    'R': 0x0052,
    'S': 0x0053,
    'T': 0x0054,
    'U': 0x0055,
    'V': 0x0056,
    'W': 0x0057,
    'X': 0x0058,
    'Y': 0x0059,
    'Z': 0x005A,
    'BRACKETLEFT': 0x005B,
    'BACKSLASH': 0x005C,
    'BRACKETRIGHT': 0x005D,
    'ASCIICIRCUM': 0x005E,
    'UNDERSCORE': 0x005F,
    'QUOTELEFT': 0x0060,
    'BRACELEFT': 0x007B,
    'BAR': 0x007C,
    'BRACERIGHT': 0x007D,
    'ASCIITILDE': 0x007E,
    'NOBREAKSPACE': 0x00A0,
    'EXCLAMDOWN': 0x00A1,
    'CENT': 0x00A2,
    'STERLING': 0x00A3,
    'CURRENCY': 0x00A4,
    'YEN': 0x00A5,
    'BROKENBAR': 0x00A6,
    'SECTION': 0x00A7,
    'DIAERESIS': 0x00A8,
    'COPYRIGHT': 0x00A9,
    'ORDFEMININE': 0x00AA,
    'GUILLEMOTLEFT': 0x00AB,
    'NOTSIGN': 0x00AC,
    'HYPHEN': 0x00AD,
    'REGISTERED': 0x00AE,
    'MACRON': 0x00AF,
    'DEGREE': 0x00B0,
    'PLUSMINUS': 0x00B1,
    'TWOSUPERIOR': 0x00B2,
    'THREESUPERIOR': 0x00B3,
    'ACUTE': 0x00B4,
    'MU': 0x00B5,
    'PARAGRAPH': 0x00B6,
    'PERIODCENTERED': 0x00B7,
    'CEDILLA': 0x00B8,
    'ONESUPERIOR': 0x00B9,
    'MASCULINE': 0x00BA,
    'GUILLEMOTRIGHT': 0x00BB,
    'ONEQUARTER': 0x00BC,
    'ONEHALF': 0x00BD,
    'THREEQUARTERS': 0x00BE,
    'QUESTIONDOWN': 0x00BF,
    'AGRAVE': 0x00C0,
    'AACUTE': 0x00C1,
    'ACIRCUMFLEX': 0x00C2,
    'ATILDE': 0x00C3,
    'ADIAERESIS': 0x00C4,
    'ARING': 0x00C5,
    'AE': 0x00C6,
    'CCEDILLA': 0x00C7,
    'EGRAVE': 0x00C8,
    'EACUTE': 0x00C9,
    'ECIRCUMFLEX': 0x00CA,
    'EDIAERESIS': 0x00CB,
    'IGRAVE': 0x00CC,
    'IACUTE': 0x00CD,
    'ICIRCUMFLEX': 0x00CE,
    'IDIAERESIS': 0x00CF,
    'ETH': 0x00D0,
    'NTILDE': 0x00D1,
    'OGRAVE': 0x00D2,
    'OACUTE': 0x00D3,
    'OCIRCUMFLEX': 0x00D4,
    'OTILDE': 0x00D5,
    'ODIAERESIS': 0x00D6,
    'MULTIPLY': 0x00D7,
    'OOBLIQUE': 0x00D8,
    'UGRAVE': 0x00D9,
    'UACUTE': 0x00DA,
    'UCIRCUMFLEX': 0x00DB,
    'UDIAERESIS': 0x00DC,
    'YACUTE': 0x00DD,
    'THORN': 0x00DE,
    'SSHARP': 0x00DF,

    'DIVISION': 0x00F7,
    'YDIAERESIS': 0x00FF,
};

/**
 * @type {Object<number, string>}
 */
const GD_ScancodeNameMap = {};

for (const name in GD_KeyList) {
    GD_ScancodeNameMap[GD_KeyList[name]] = name;
}

const KeyList = {
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

/**
 * @param {number} scancode
 */
module.exports.gd_scancode_to_voltar = function(scancode) {
    const name = GD_ScancodeNameMap[scancode];
    if (name && KeyList[name]) {
        return KeyList[name];
    }
    return -1;
}
