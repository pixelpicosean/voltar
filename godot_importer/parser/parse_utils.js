const _ = require('lodash');
const {
    remove_first_n_last,
    trim_string,
} = require('../utils');
const { path_modifiers } = require('./registry');

/**
 * @param {string} value
 * @returns {any}
 */
module.exports.Nullable = (value) => (value === 'null' ? undefined : value);

/**
 * @param {string} str
 * @returns {string}
 */
module.exports.string = (str) => {
    if (_.isString(str) && str.length > 0) {
        if (str[0] === '"' && str.length >= 2) {
            return remove_first_n_last(str);
        } else {
            return str;
        }
    }

    return undefined;
};
/**
 * @param {string} url
 * @returns {string}
 */
module.exports.url = (url) => {
    if (_.isString(url) && url.length > 6) {
        if (url[0] === '"') {
            return remove_first_n_last(url);
        } else {
            return url;
        }
    }

    return undefined;
};
/**
 * @param {string} path
 * @returns {string}
 */
module.exports.path = (path) => {
    if (_.isString(path) && path.length > 0) {
        if (path[0] === '"') {
            return remove_first_n_last(path);
        } else {
            return path;
        }
    }

    return undefined;
};
/**
 * @param {string} num
 * @returns {number}
 */
module.exports.int = (num) => {
    if (num === undefined || num === null) {
        return undefined;
    }

    if (typeof(num) === 'string') {
        num = num.replace(/"/g, '');
    }

    return parseInt(num);
};
/**
 * @param {string} num
 * @returns {number}
 */
module.exports.real = (num) => {
    if (num === undefined || num === null) {
        return undefined;
    }

    if (typeof (num) === 'string') {
        num = num.replace(/"/g, '');
    }

    return parseFloat(num);
};
/**
 * @param {string} value
 * @returns {boolean}
 */
module.exports.boolean = (value) => {
    if (typeof (value) === 'boolean') {
        return value;
    }

    if (typeof (value) === 'string') {
        value = value.replace(/"/g, '');
    }
    switch (value) {
        case 'true': {
            return true;
        };
        case 'false': {
            return false;
        };
    }

    return undefined;
};

/**
 * @param {string} src
 * @returns {string[]}
 */
function get_function_params(src) {
    return src.substring(src.indexOf('(') + 1, src.indexOf(')'))
        .split(',')
        .map(p => p.trim());
}
module.exports.get_function_params = get_function_params;

/**
 * @param {string} vec
 * @returns {{ x: number, y: number }}
 */
module.exports.Vector2 = (vec) => {
    if (!vec) {
        return undefined;
    }

    const arr = get_function_params(vec);
    return { x: parseFloat(arr[0]), y: parseFloat(arr[1]) };
};
/**
 * @param {string} color
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
module.exports.Color = (color) => {
    if (!color) {
        return undefined;
    }

    const arr = get_function_params(color);
    return { r: parseFloat(arr[0]), g: parseFloat(arr[1]), b: parseFloat(arr[2]), a: parseFloat(arr[3]) };
};
/**
 * @param {string} rect
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
module.exports.Rect2 = (rect) => {
    if (!rect) {
        return undefined;
    }

    const arr = get_function_params(rect);
    return { x: parseFloat(arr[0]), y: parseFloat(arr[1]), width: parseFloat(arr[2]), height: parseFloat(arr[3]) };
};
/**
 * @param {string} path
 * @returns {string}
 */
module.exports.NodePath = (path) => {
    if (!path) {
        return undefined;
    }

    let result = module.exports.string(get_function_params(path)[0]);

    for (let f of path_modifiers) {
        result = f(result);
    }

    return result;
};

/**
 * @param {string} arr
 * @returns {number[]}
 */
module.exports.PoolIntArray = (arr) => {
    return get_function_params(arr).map(module.exports.int);
};
/**
 * @param {string} arr
 * @returns {number[]}
 */
module.exports.PoolRealArray = (arr) => {
    return get_function_params(arr).map(module.exports.real);
};
/**
 * @param {string} arr
 * @returns {{ x: number, y: number }[]}
 */
module.exports.Vector2Array = (arr) => {
    const vec_strs = arr.replace(/\[|\]/g, '').split('),').map((s, i, a) => (i < a.length - 1) ? `${s})`.trim() : s.trim());
    for (let i = 0; i < vec_strs.length - 1; i++) {
        vec_strs[i] += ')';
    }
    return vec_strs.map(vec => {
        const vec_arr = get_function_params(vec)
            .map(module.exports.real);
        return { x: vec_arr[0], y: vec_arr[1] };
    });
};
/**
 * @param {string} arr
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
module.exports.Rect2Array = (arr) => {
    const rect_strs = arr.replace(/\[|\]/g, '').split('),').map((s, i, a) => (i < a.length - 1) ? `${s})`.trim() : s.trim());
    rect_strs[0] += ')';
    return rect_strs.map(rect => {
        const rect_arr = get_function_params(rect)
            .map(module.exports.real);
        return { x: rect_arr[0], y: rect_arr[1], width: rect_arr[2], height: rect_arr[3] };
    });
};
/**
 * @param {string} arr
 * @returns {{ r: number, g: number, b: number, a: number }[]}
 */
module.exports.ColorArray = (arr) => {
    const color_strs = arr.replace(/\[|\]/g, '').split('),').map((s, i, a) => (i < a.length - 1) ? `${s})`.trim() : s.trim());
    for (let i = 0; i < color_strs.length - 1; i++) {
        color_strs[i] += ' )';
    }
    return color_strs.map(color => {
        const color_arr = get_function_params(color)
            .map(module.exports.real);
        return { r: color_arr[0], g: color_arr[1], b: color_arr[2], a: color_arr[3] };
    });
};

/**
 * @param {string|any[]} value
 * @returns {any[]}
 */
module.exports.GeneralArray = (value) => {
    /** @type {string[]} */
    let arr;

    if (typeof (value) === 'string') {
        // Empty string?
        if (value.length === 0) {
            return [];
        }

        // parse array from a string
        if (value.indexOf('Vector2(') >= 0) {
            return module.exports.Vector2Array(value);
        }
        else if (value.indexOf('Rect2(') >= 0) {
            return module.exports.Rect2Array(value);
        }
        else if (value.indexOf('Color(') >= 0) {
            return module.exports.ColorArray(value);
        }
        else {
            arr = value.replace(/\[|\]/g, '').split(',').map(s => s.trim());
        }
    } else {
        return value;
    }

    // Empty array
    if (arr.length === 1 && arr[0] === '') {
        return [];
    }

    let first_item_str = arr[0];

    // number | boolean | string
    if (first_item_str.indexOf('(') < 0) {
        // boolean
        if (first_item_str.indexOf('true') >= 0 || first_item_str.indexOf('false') >= 0) {
            return arr.map(module.exports.boolean);
        }
        // string
        else if (first_item_str[0] === '"' && _.last(first_item_str) === '"') {
            return arr.map(remove_first_n_last);
        }
        // number
        else if (_.isNumber(parseFloat(first_item_str))) {
            return arr.map(parseFloat);
        }
        // unknown value
        else {
            return arr;
        }
    }

    return arr;
};

/**
 * @param {{ method: string, args: string }[]} arr
 * @returns {{ method: string, args: any[] }[]}
 */
module.exports.MethodArray = (arr) => {
    return arr.map(({ args, method }) => ({
        args: module.exports.GeneralArray(trim_string(args.replace(/,$/, ''))),
        method: method.replace(/"/g, ''),
    }))
};
