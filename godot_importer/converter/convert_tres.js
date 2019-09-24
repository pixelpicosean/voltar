const _ = require('lodash');

const { get_function_params } = require('../parser/type_converters');
const { convert_block } = require('./convert_block');


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

/**
 * @param {{ key: string, attr: any, prop: any }[]} blocks
 */
module.exports.convert_tres = (blocks) => {
    const sections = blocks.map(convert_block)

    const head = sections.shift();

    if (head.key === 'gd_resource') {
        // FIXME: do we have sub/ext resource inside a tres resource?
        const converter = require(`./res/${head.attr.type}`);
        return converter({
            attr: head.attr,
            prop: sections[0].prop,
        });
    } else if (head.key === 'gd_scene') {
        const ext = {};
        const sub = {};
        const nodes = [];

        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            if (sec.key === 'ext_resource') {
                const converter = require(`./res/${sec.attr.type}`);
                if (typeof (converter.get_resource_path) === 'function') {
                    ext[sec.attr.id] = converter.get_resource_path(sec);
                } else {
                    ext[sec.attr.id] = sec.attr.path;
                }
            } else if (sec.key === 'sub_resource') {
                sub[sec.id] = sec;
                sec.key = undefined;
                sec.id = undefined;
            } else if (sec.key === 'node') {
                sec._prop = undefined;
                sec.key = undefined;
                normalize_resource_object(sec);
                nodes.push(sec);
            }
        }

        return {
            type: 'PackedScene',
            ext,
            sub,
            nodes,
        };
    } else {
        throw `TRES of type "${head.key}" is not supported`;
    }
}
