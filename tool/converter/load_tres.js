const path = require('path');
const fs = require('fs');

const { split_to_blocks } = require('../parser/split_to_blocks');
const { parse_block } = require('../parser/parse_block');


/**
 * @typedef Tres
 * @property {string} key
 * @property {import('../parser/parse_block').TresAttr} attr
 * @property {any} prop
 */

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
 * @param {Object<string, Tres[]>} tres_map
 */
module.exports.load_tres = (root, filename, tres_map) => {
    let normalized_filename = filename.replace(/\\/gm, '/');

    // already loaded?
    if (tres_map[normalized_filename]) return;

    const real_url = normalize_res_real_url(root, filename);
    const text_data = fs.readFileSync(real_url, 'utf8');

    const blocks = split_to_blocks(text_data)
    const sections = blocks.map(parse_block)

    // find ext and load the ones in tres format
    const exts = sections.filter((sec) => sec.key === 'ext_resource')
    exts.forEach((ext) => {
        const res_converter = require(`./res/${ext.attr.type}`);
        if (res_converter.is_tres) {
            this.load_tres(root, ext.attr.path, tres_map);
        } else if (res_converter.extra_process) {
            Object.assign(ext, res_converter.extra_process(ext));
            ext.extra_process = true;
        } else if (res_converter.ignore) {
            ext.attr = null;
            ext.key = null;
            ext.prop = null;
        }
    })

    tres_map[normalized_filename] = sections;
}
