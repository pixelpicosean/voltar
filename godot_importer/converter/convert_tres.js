const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const {
    Vector2,
    Rect2,
    Color,
    get_function_params,
} = require('../parser/type_converters');

const { split_to_blocks } = require('../parser/split_to_blocks');
const { parse_block } = require('../parser/parse_block');
const { convert_block } = require('./convert_block');


/**
 * @param {string} root
 * @param {string} filename
 * @returns {string}
 */
function normalize_res_real_url(root, filename) {
    return filename.replace('res://', path.normalize(root.endsWith('/') ? root : (root + '/')));
}

/**
 * @param {string} root
 * @param {string} filename
 * @param {any} resource_map
 */
module.exports.convert_tres = (root, filename, resource_map) => {
    const real_url = normalize_res_real_url(root, filename);
    const text_data = fs.readFileSync(real_url, 'utf8');

    let sections = split_to_blocks(text_data)
    sections = sections.map(parse_block)
    sections = sections.map(convert_block)

    let tres_obj = undefined;
    const ext_res_table = {};
    const sub_res_table = {};
    const head = sections.shift();
    for (let i = 0; i < head.attr.load_steps; i++) {
        const sec = sections[i];
        if (sec.key === 'ext_resource') {
            // TODO: convert ext_resource as tres
            // ext_res_table[sec.id] = resource_normalizers[sec.type](sec, meta, parent, resource_map);
            sec;
        } else if (sec.key === 'sub_resource') {
            // sub_res_table[sec.id] = resource_normalizers[sec.type](sec, meta, parent, resource_map);
            // throw 'sub_resource in "tres" is not supported yet';
        } else if (sec.key === 'resource') {
            const prop = sec.prop;
            // TODO: make this a general function
            const keys = Object.keys(prop);
            // Array?
            // format is "number/"
            const slash_idx = keys[0].indexOf('/')
            if (slash_idx >= 0) {
                const num_str = keys[0].substring(0, slash_idx);
                if (Number.isFinite(parseInt(num_str))) {
                    const array = [];
                    for (const k in prop) {
                        const key_list = k.split('/');
                        const index = parseInt(key_list[0]);
                        if (array.length < index + 1) {
                            array.length = index + 1;
                            array[index] = {};
                        }

                        let value = prop[k];
                        if (typeof (value) === 'number') {
                            // do nothing
                        } else if (typeof (value) === 'boolean') {
                            // do nothing
                        } else if (Array.isArray(value)) {
                            if (value.length > 0) {
                            }
                        } else if (_.startsWith(value, 'ExtResource')) {
                            value = ext_res_table[get_function_params(value)];
                        } else if (_.startsWith(value, 'SubResource')) {
                            value = sub_res_table[get_function_params(value)];
                        } else if (_.startsWith(value, 'Vector2')) {
                            value = Vector2(value);
                        } else if (_.startsWith(value, 'Color')) {
                            value = Color(value);
                        } else if (_.startsWith(value, 'Rect2')) {
                            value = Rect2(value);
                        }

                        array[index][key_list[1]] = value;
                    }
                    tres_obj = array;
                } else {
                    // Dictionary?
                    tres_obj = prop;
                }
            }
            // Dictionary?
            else {
                tres_obj = prop;
            }
        }
    }

    // add self to resource_map
    resource_map[filename] = tres_obj;

    return tres_obj;
}
