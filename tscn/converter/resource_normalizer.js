const { get_function_params } = require('../parser/type_converters');

/**
 * @param {string} key
 */
function normalize_res_key(key) {
    if (key.startsWith('SubResource')) {
        return `@sub#${get_function_params(key)[0]}`;
    } else if (key.startsWith('ExtResource')) {
        return `@ext#${get_function_params(key)[0]}`;
    }
    return key;
}

/**
 * @param {any} obj
 */
function normalize_resource_object(obj) {
    for (const k in obj) {
        const value = obj[k];
        if (typeof (value) === 'string') {
            obj[k] = normalize_res_key(value);
        } else if (typeof (value) === 'object') {
            if (Array.isArray(value)) {
                normalize_resource_array(value);
            } else {
                normalize_resource_object(value);
            }
        }
    }
}

/**
 * @param {any[]} arr
 */
function normalize_resource_array(arr) {
    for (let i = 0; i < arr.length; i++) {
        const value = arr[i];
        if (typeof (value) === 'string') {
            arr[i] = normalize_res_key(value);
        } else if (typeof (value) === 'object') {
            normalize_resource_object(value);
        }
    }
}

module.exports.normalize_res_key = normalize_res_key;
module.exports.normalize_resource_object = normalize_resource_object;
module.exports.normalize_resource_array = normalize_resource_array;
