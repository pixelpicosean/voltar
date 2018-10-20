const _ = require('lodash');
const {
    remove_first_n_last,
    trim_string,
} = require('../utils');
const { path_modifiers } = require('./registry');

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
module.exports.int = (num) => {
    if (!num) {
        return undefined;
    }

    if (typeof(num) === 'string') {
        num = num.replace(/"/g, '');
    }
    return parseInt(num);
};
module.exports.real = (num) => {
    if (!num) {
        return undefined;
    }

    if (typeof (num) === 'string') {
        num = num.replace(/"/g, '');
    }
    return parseFloat(num);
};
module.exports.boolean = (value) => {
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

function get_function_params(src) {
    return src.substring(src.indexOf('(') + 1, src.indexOf(')'))
        .split(',')
        .map(p => p.trim());
}
module.exports.get_function_params = get_function_params;

module.exports.Vector2 = (vec) => {
    if (!vec) {
        return undefined;
    }

    const arr = get_function_params(vec);
    return { x: parseFloat(arr[0]), y: parseFloat(arr[1]) };
};
module.exports.Color = (color) => {
    if (!color) {
        return undefined;
    }

    const arr = get_function_params(color);
    return { r: parseFloat(arr[0]), g: parseFloat(arr[1]), b: parseFloat(arr[2]), a: parseFloat(arr[3]) };
};
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

module.exports.PoolRealArray = (arr) => {
    return get_function_params(arr).map(module.exports.real);
};
module.exports.Vector2Array = (arr) => {
    const vec_strs = arr.replace(/\[|\]/g, '').split('),').map(s => s.trim());
    for (let i = 0; i < vec_strs.length - 1; i++) {
        vec_strs[i] += ')';
    }
    return vec_strs.map(vec => {
        const vec_arr = get_function_params(vec)
            .map(module.exports.real);
        return { x: vec_arr[0], y: vec_arr[1] };
    });
};
module.exports.Rect2Array = (arr) => {
    const rect_strs = arr.replace(/\[|\]/g, '').split('),').map(s => s.trim());
    rect_strs[0] += ')';
    return rect_strs.map(rect => {
        const rect_arr = get_function_params(rect)
            .map(module.exports.real);
        return { x: rect_arr[0], y: rect_arr[1], width: rect_arr[2], height: rect_arr[3] };
    });
};
module.exports.ColorArray = (arr) => {
    const color_strs = arr.replace(/\[|\]/g, '').split('),').map(s => s.trim());
    color_strs[0] += ')';
    return color_strs.map(color => {
        const color_arr = get_function_params(color)
            .map(module.exports.real);
        return { r: color_arr[0], g: color_arr[1], b: color_arr[2], a: color_arr[3] };
    });
};

module.exports.GeneralArray = (arr) => {
    const item_strs = arr.replace(/\[|\]/g, '').split(',').map(s => s.trim());

    // Empty array
    if (item_strs.length === 1 && item_strs[0] === '') {
        return [];
    }

    let first_item_str = item_strs[0];

    // number | boolean | string
    if (first_item_str.indexOf('(') < 0) {
        // boolean
        if (first_item_str.indexOf('true') >= 0 || first_item_str.indexOf('false') >= 0) {
            return item_strs.map(module.exports.boolean);
        }
        // string
        else if (first_item_str[0] === '"' && _.last(first_item_str) === '"') {
            return item_strs.map(remove_first_n_last);
        }
        // number
        else if (_.isNumber(parseFloat(first_item_str))) {
            return item_strs.map(parseFloat);
        }
        // unknown value
        else {
            return item_strs;
        }
    }
    // Vector2 | Color | Rect2
    else {
        if (first_item_str.indexOf('Vector2') >= 0) {
            return module.exports.Vector2Array(arr);
        } else if (first_item_str.indexOf('Rect2') >= 0) {
            return module.exports.Rect2Array(arr);
        } else if (first_item_str.indexOf('Color') >= 0) {
            return module.exports.ColorArray(arr);
        }
    }
};

module.exports.MethodArray = (arr) => {
    return arr.map(({ args, method }) => ({
        args: module.exports.GeneralArray(trim_string(args.replace(/,$/, ''))),
        method: method.replace(/"/g, ''),
    }))
};
