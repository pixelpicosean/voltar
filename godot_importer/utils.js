/**
 * @param {string} str
 * @returns {string}
 */
const remove_first = module.exports.remove_first = (str) => str.substring(1, str.length);

/**
 * @param {string} str
 * @returns {string}
 */
const remove_last = module.exports.remove_last = (str) => str.substring(0, str.length - 1);

/**
 * @param {string} str
 * @returns {string}
 */
const remove_first_n_last = module.exports.remove_first_n_last = (str) => str.substring(1, str.length - 1);

/**
 * @param {string} str
 * @returns {string}
 */
const trim_string = module.exports.trim_string = (str) => str.trim();

/**
 * @typedef ParseResult
 * @prop {string} type
 * @prop {any} value
 * @prop {boolean} is_valid
 */
/**
 * @param {string} str
 * @returns {ParseResult}
 */
const parse_as_primitive = module.exports.parse_as_primitive = (str) => {
    // Make sure the string is trimmed
    str = str.trim();

    // Remove trailing coma if any
    if (str[str.length - 1] === ',') {
        str = str.substring(0, str.length - 1);
    }

    // boolean?
    if (str === 'true') {
        return { type: 'boolean', value: true, is_valid: true };
    }
    if (str === 'false') {
        return { type: 'boolean', value: false, is_valid: true };
    }

    // number?
    let num = parseFloat(str);
    if (!Number.isNaN(num)) {
        // float?
        if (str.indexOf('.') >= 0) {
            return { type: 'number', value: num, is_valid: true };
        }
        // int?
        else {
            return { type: 'number', value: parseInt(str), is_valid: true };
        }
    }

    // string?
    if (str[0] === '"' && str[str.length - 1] === '"') {
        return { type: 'string', value: remove_first_n_last(str), is_valid: true };
    }

    // multi-line string?
    if (str[0] === '"' && str[str.length - 1] !== '"') {
        return { type: 'multi_line_string', value: remove_first(str), is_valid: false };
    }

    // not a primitive, just return the raw value
    return { type: 'unknown', value: str, is_valid: false };
};
