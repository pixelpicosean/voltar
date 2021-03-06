const _ = require('lodash');

const {
    remove_first,
    remove_first_n_last,
} = require('./utils');

module.exports.SubResource = (value) => value;
module.exports.ExtResource = (value) => value;

/**
 * @param {any} value
 * @returns {any}
 */
module.exports.Nullable = (value) => {
    if (value === null) {
        return undefined;
    }
    if (typeof (value) === 'string') {
        return (value === 'null') ? undefined : value
    }
}

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
 * @param {any} num
 * @returns {number}
 */
module.exports.int = (num) => {
    if (typeof (num) === 'number') {
        return Math.floor(num);
    }

    if (typeof (num) === 'string') {
        num = num.replace(/"/g, '');
        return parseInt(num, 10);
    }

    return undefined;
};
/**
 * @param {any} num
 * @returns {number}
 */
module.exports.real = (num) => {
    if (typeof (num) === 'number') {
        return num;
    }

    if (typeof (num) === 'string') {
        num = num.replace(/"/g, '');
        return parseFloat(num);
    }

    return undefined;
};
/**
 * @param {any} value
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
 * @param {string} key
 */
function get_array_index_and_prop_key(key) {
    const index = parseInt(key.substring(0, key.indexOf('/')), 10);
    const prop_key = key.substring(key.indexOf('/') + 1);
    if (Number.isFinite(index)) {
        return { index, prop_key };
    }
    return {};
}
module.exports.get_array_index_and_prop_key = get_array_index_and_prop_key;

/**
 * @param {any} vec
 * @returns {{ x: number, y: number }}
 */
module.exports.Vector2 = (vec) => {
    if (typeof (vec) === 'object') {
        return {
            x: module.exports.real(vec.x),
            y: module.exports.real(vec.y),
        }
    }

    if (typeof (vec) === 'string') {
        const arr = get_function_params(vec);
        return {
            x: parseFloat(arr[0]),
            y: parseFloat(arr[1]),
        };
    }

    return undefined;
};
/**
 * @param {any} vec
 * @returns {{ x: number, y: number, z: number }}
 */
module.exports.Vector3 = (vec) => {
    if (typeof (vec) === 'object') {
        return {
            x: module.exports.real(vec.x),
            y: module.exports.real(vec.y),
            z: module.exports.real(vec.z),
        }
    }

    if (typeof (vec) === 'string') {
        const arr = get_function_params(vec);
        return {
            x: parseFloat(arr[0]),
            y: parseFloat(arr[1]),
            z: parseFloat(arr[2]),
        };
    }

    return undefined;
};
/**
 * @param {any} color
 * @returns {{ r: number, g: number, b: number, a: number }}
 */
module.exports.Color = (color) => {
    if (typeof (color) === 'object') {
        return {
            r: module.exports.real(color.r),
            g: module.exports.real(color.g),
            b: module.exports.real(color.b),
            a: module.exports.real(color.a),
        }
    }

    if (typeof (color) === 'string') {
        const arr = get_function_params(color);
        return {
            r: parseFloat(arr[0]),
            g: parseFloat(arr[1]),
            b: parseFloat(arr[2]),
            a: parseFloat(arr[3]),
        };
    }

    return undefined;
};
/**
 * @param {any} rect
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
module.exports.Rect2 = (rect) => {
    if (typeof (rect) === 'object') {
        return {
            x: parseFloat(rect.x),
            y: parseFloat(rect.y),
            width: parseFloat(rect.width),
            height: parseFloat(rect.height),
        };
    }

    if (typeof (rect) === 'string') {
        const arr = get_function_params(rect);
        return {
            x: parseFloat(arr[0]),
            y: parseFloat(arr[1]),
            width: parseFloat(arr[2]),
            height: parseFloat(arr[3]),
        };
    }

    return undefined;
};
/**
 * @param {any} xform
 * @returns {number[]}
 */
module.exports.Transform2D = (xform) => {
    if (_.isArray(xform)) {
        return xform;
    }

    if (typeof (xform) === 'string') {
        const arr = get_function_params(xform);
        return arr.map(str => parseFloat(str));
    }

    return undefined;
};
/**
 * @param {any} xform
 * @returns {number[]}
 */
module.exports.Transform = (xform) => {
    if (_.isArray(xform)) {
        return xform;
    }

    if (typeof (xform) === 'string') {
        const arr = get_function_params(xform);
        return arr.map(str => parseFloat(str));
    }

    return undefined;
};
/**
 * @param {any} line
 * @returns {Object<string, any> & { type: string }}
 */
module.exports.Object = (line) => {
    if (typeof (line) !== 'string') {
        return line;
    }

    const trimmed_line = line.trim();
    const function_name = trimmed_line.substring(0, trimmed_line.indexOf('('));
    const param_str = remove_first_n_last(trimmed_line.substring(function_name.length).trim()).trim();

    // object type is the word before first ","
    const object_type = param_str.substring(0, param_str.indexOf(',')).trim();

    const properties_str = param_str.substring(param_str.indexOf(',') + 1).trim();
    const naive_split_arr = properties_str.split(/\s*,\s*/);
    const correct_param_arr = [];
    for (let i = 0; i < naive_split_arr.length - 1; i++) {
        if (
            (naive_split_arr[i].indexOf('(') >= 0 && naive_split_arr[i].indexOf(')') < 0) // "(" is not closed
            &&
            naive_split_arr[i + 1].indexOf(')') >= 0 // found the close ")" in next line
        ) {
            // merge these 2 lines
            correct_param_arr.push(`${naive_split_arr[i]}, ${naive_split_arr[i + 1]}`);
            i += 1;
        } else {
            correct_param_arr.push(naive_split_arr[i]);
        }
    }

    const obj = { type: object_type };
    for (const pair of correct_param_arr) {
        const pair_arr = pair.split(':');
        const key = remove_first_n_last(pair_arr[0]);
        const value_res = module.exports.parse_as_primitive(pair_arr[1]);
        if (value_res.is_valid) {
            obj[key] = value_res.value;
        } else {
            const src = pair_arr[1];
            // a special data structure?
            if (src.indexOf('(') >= 0 && src.indexOf(')') >= 0) {
                const vec = module.exports.Vector2(src);
                if (vec !== undefined) {
                    obj[key] = vec;
                    continue;
                }
                const color = module.exports.Color(src);
                if (color !== undefined) {
                    obj[key] = color;
                    continue;
                }
                const rect = module.exports.Rect2(src);
                if (rect !== undefined) {
                    obj[key] = rect;
                    continue;
                }
                const arr = module.exports.GeneralArray(src);
                if (arr !== undefined) {
                    obj[key] = arr;
                    continue;
                }
            }
            // we don't know what it is
            else {
                obj[key] = src;
            }
        }
    }

    return obj;
}
/**
 * @param {string} node_path
 * @returns {string}
 */
module.exports.NodePath = (node_path) => {
    if (typeof (node_path) === 'string') {
        let path_str = '';
        if (node_path.trim().startsWith('NodePath')) {
            path_str = get_function_params(node_path.trim())[0];
        } else {
            path_str = node_path.trim();
        }
        if (
            (path_str.startsWith('"') && path_str.endsWith('"'))
            ||
            (path_str.startsWith("'") && path_str.endsWith("'"))
        ) {
            path_str = remove_first_n_last(path_str);
        }
        if (path_str.endsWith(':')) {
            path_str = path_str.substr(0, path_str.length - 1);
        }
        return path_str;
    }
    return undefined;
};

/**
 * @param {any} arr
 * @returns {string[]}
 */
module.exports.PoolStringArray = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map((value) => module.exports.string(value));
        result.__meta__ = {
            func: 'PoolStringArray',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        let result = get_function_params(arr).map(module.exports.string);
        result.__meta__ = {
            func: 'PoolStringArray',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {number[]}
 */
module.exports.PoolIntArray = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map((value) => module.exports.int(value));
        result.__meta__ = {
            func: 'PoolIntArray',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        let result = get_function_params(arr).map(module.exports.int);
        result.__meta__ = {
            func: 'PoolIntArray',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {number[]}
 */
module.exports.PoolRealArray = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map((value) => module.exports.real(value));
        result.__meta__ = {
            func: 'PoolRealArray',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        let result = get_function_params(arr).map(module.exports.real);
        result.__meta__ = {
            func: 'PoolRealArray',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {{ r: number, g: number, b: number, a: number }[]}
 */
module.exports.PoolColorArray = (arr) => {
    if (Array.isArray(arr)) {
        // already valid data
        if (typeof (arr[0]) === 'object' && typeof (arr[0].r) === 'number') {
            return arr;
        }
        // array of numbers
        else if (typeof (arr[0]) === 'number') {
            const result = [];
            for (let i = 0; i < arr.length; i += 4) {
                result.push({
                    r: arr[i + 0],
                    g: arr[i + 1],
                    b: arr[i + 2],
                    a: arr[i + 3],
                })
            }
            result.__meta__ = {
                func: 'PoolColorArray',
            }
            return result;
        }
    }

    if (typeof (arr) === 'string') {
        const number_arr = get_function_params(arr).map(module.exports.real);
        let result = module.exports.PoolColorArray(number_arr);
        result.__meta__ = {
            func: 'PoolColorArray',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {{ x: number, y: number }[]}
 */
module.exports.Vector2Array = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map(v => parseFloat(v));
        result.__meta__ = {
            func: 'Vector2Array',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        const result = get_function_params(arr).map(v => parseFloat(v));
        result.__meta__ = {
            func: 'Vector2Array',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {number[]}
 */
module.exports.Vector3Array = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map(v => parseFloat(v));
        result.__meta__ = {
            func: 'Vector3Array',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        const result = get_function_params(arr).map(v => parseFloat(v));
        result.__meta__ = {
            func: 'Vector3Array',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {number[]}
 */
module.exports.FloatArray = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map(v => parseFloat(v));
        result.__meta__ = {
            func: 'FloatArray',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        const result = get_function_params(arr).map(v => parseFloat(v));
        result.__meta__ = {
            func: 'FloatArray',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {number[]}
 */
module.exports.IntArray = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map(v => parseInt(v, 10));
        result.__meta__ = {
            func: 'IntArray',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        const result = get_function_params(arr).map(v => parseInt(v, 10));
        result.__meta__ = {
            func: 'IntArray',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
module.exports.Rect2Array = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map((value) => module.exports.Rect2(value));
        result.__meta__ = {
            func: 'Rect2Array',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        const rect_strs = arr.replace(/\[|\]/g, '').split('),').map((s, i, a) => (i < a.length - 1) ? `${s})`.trim() : s.trim());
        rect_strs[0] += ')';
        let result = rect_strs.map(rect => {
            const rect_arr = get_function_params(rect)
                .map(module.exports.real);
            return { x: rect_arr[0], y: rect_arr[1], width: rect_arr[2], height: rect_arr[3] };
        });

        result.__meta__ = {
            func: 'Rect2Array',
        }
        return result;
    }

    return undefined;
};
/**
 * @param {any} arr
 * @returns {{ r: number, g: number, b: number, a: number }[]}
 */
module.exports.ColorArray = (arr) => {
    if (Array.isArray(arr)) {
        let result = arr.map((value) => module.exports.Color(value));
        result.__meta__ = {
            func: 'MethodArray',
        }
        return result;
    }

    if (typeof (arr) === 'string') {
        const color_strs = arr.replace(/\[|\]/g, '').split('),').map((s, i, a) => (i < a.length - 1) ? `${s})`.trim() : s.trim());
        for (let i = 0; i < color_strs.length - 1; i++) {
            color_strs[i] += ' )';
        }
        let result = color_strs.map(color => {
            const color_arr = get_function_params(color)
                .map(module.exports.real);
            return { r: color_arr[0], g: color_arr[1], b: color_arr[2], a: color_arr[3] };
        });
        result.__meta__ = {
            func: 'ColorArray',
        }
        return result;
    }

    return undefined;
};

/**
 * @param {any} value
 * @param {{ value_type: string }} [r_meta]
 * @returns {any[]}
 */
module.exports.GeneralArray = (value, r_meta) => {
    if (Array.isArray(value)) {
        /** @type {Array} */
        const array = value;

        if (r_meta) {
            r_meta.value_type = "any";

            // guess type of array elements
            let i = 0;
            let first = array[0];
            while (first === null && i < array.length) {
                first = array[i++];
            }

            if (first.x !== undefined && first.y !== undefined) {
                if (first.width !== undefined && first.height !== undefined) {
                    r_meta.value_type = "Rect2";
                } else if (first.z !== undefined) {
                    if (first.w !== undefined) {
                        r_meta.value_type = "Quat";
                    } else {
                        r_meta.value_type = "Vector3";
                    }
                } else {
                    r_meta.value_type = "Vector2";
                }
            } else if (first.r !== undefined && first.g !== undefined && first.b !== undefined && first.a !== undefined) {
                r_meta.value_type = "Color";
            }
        }
        return value;
    }

    if (typeof (value) === 'string') {
        // Empty string?
        if (value.length === 0) {
            if (r_meta) r_meta.value_type = "any";
            return [];
        }

        const arr_content = value.replace(/\[|\]/g, '').trim();

        // split content into logical partitions
        const segments = [];
        const stack = [];
        const frags = arr_content.split(',').map(s => s.trim())
        for (let i = 0; i < frags.length; i++) {
            const frag = frags[i];
            if (frag.indexOf('(') >= 0 && frag.indexOf(')') >= 0) {
                segments.push(frag);
            }
            else if (frag.indexOf('(') >= 0) {
                stack.push({
                    func: frag.substring(0, frag.indexOf('(')).trim(),
                    value: [
                        frag.substring(frag.indexOf('(') + 1).trim(),
                    ],
                })
            }
            else if (frag.indexOf(')') >= 0) {
                stack[stack.length - 1].value.push(frag.substring(0, frag.indexOf(')')).trim());
                const seg = stack.pop();
                const func = module.exports[seg.func];
                const param = seg.value.join(',');
                let value = param;
                if (func) {
                    value = func(`${seg.func}( ${param} )`);

                    if (r_meta) r_meta.value_type = func;
                }
                segments.push(value);
            }
            else {
                // so we are inside a segment
                if (stack.length > 0) {
                    stack[stack.length - 1].value.push(frag);
                }
                // so this is just a segment
                else {
                    // string
                    if (frag.indexOf('"') >= 0 || frag.indexOf("'") >= 0) {
                        // remove quote at beginning and end if exist
                        if (
                            (frag.startsWith('"') && frag.endsWith('"'))
                            ||
                            (frag.startsWith("'") && frag.endsWith("'"))
                        ) {
                            segments.push(frag.substr(1, frag.length - 2))
                        } else {
                            segments.push(frag);
                        }

                        if (r_meta) r_meta.value_type = "string";
                    }
                    else if (Number.isFinite(parseFloat(frag))) {
                        segments.push(parseFloat(frag));
                        if (r_meta) r_meta.value_type = "number";
                    }
                    else if (frag === 'true' || frag === 'false') {
                        if (frag === 'true') {
                            segments.push(true);
                        }
                        else if (frag === 'false') {
                            segments.push(false);
                        }

                        if (r_meta) r_meta.value_type = "boolean";
                    }
                    else if (frag === 'null') {
                        segments.push(null);
                    }
                    else {
                        console.error(`invalid value: ${frag}`);
                    }
                }
            }
        }

        return segments;
    }

    if (r_meta) r_meta.value_type = "undefined";
    return undefined;
};

/**
 * @param {any} arr
 * @returns {{ method: string, args: any[] }[]}
 */
module.exports.MethodArray = (arr) => {
    if (Array.isArray(arr)) {
        return arr;
    }

    let result = arr.map(({ args, method }) => ({
        args: module.exports.GeneralArray(args),
        method: method.replace(/"/g, ''),
    }))
    result.__meta__ = {
        func: 'MethodArray',
    }
    return result;
};

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
module.exports.parse_as_primitive = (str) => {
    // Make sure the string is trimmed
    str = str.trimLeft();

    // Remove trailing coma if any
    if (str[str.length - 1] === ',') {
        str = str.substring(0, str.length - 1);
    }

    if (str === 'null') {
        return { type: 'null', value: null, is_valid: true };
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
            return { type: 'number', value: parseInt(str, 10), is_valid: true };
        }
    }

    // string?
    let last_c = str[str.length - 1];
    let str_1 = str;
    if (last_c !== ' ' && last_c !== '\n') {
        str_1 = str.trimRight();
    }
    if (str_1[0] === '"' && str_1[str_1.length - 1] === '"') {
        return { type: 'string', value: remove_first_n_last(str_1), is_valid: true };
    }

    // multi-line string?
    if (str[0] === '"' && str[str.length - 1] !== '"') {
        return { type: 'multi_line_string', value: remove_first(str), is_valid: false };
    }

    // not a primitive, just return the raw value
    return { type: 'unknown', value: str, is_valid: false };
};
