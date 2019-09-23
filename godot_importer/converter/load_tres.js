const path = require('path');
const fs = require('fs');

const { split_to_blocks } = require('../parser/split_to_blocks');
const { parse_block } = require('../parser/parse_block');


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
 * @param {any} tres_map
 */
module.exports.load_tres = (root, filename, tres_map) => {
    const real_url = normalize_res_real_url(root, filename);
    const text_data = fs.readFileSync(real_url, 'utf8');

    const blocks = split_to_blocks(text_data)
    const sections = blocks.map(parse_block)

    // find ext and load the ones in tres format
    const exts = sections.filter((sec) => sec.key === 'ext_resource')
    exts.forEach((ext) => {
        const res_converter = require(`./res/${ext.attr.type}`);
        if (res_converter.is_tres()) {
            this.load_tres(root, ext.attr.path, tres_map);
        }
    })

    tres_map[filename] = sections;
}
