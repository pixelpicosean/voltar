const node = require('./node');
const resource = require('./resource');

/**
 * @typedef NodeBlock
 * @property {string} [key]
 * @property {string} [id]
 * @property {any} [attr]
 * @property {any} [prop]
 * @property {any} [_attr]
 * @property {any} [_prop]
 * @property {string} [instance]
 * @property {string} [type]
 * @property {boolean} [extra_process]
 * @property {boolean} [contains_ext]
 */

/**
 * @returns {NodeBlock}
 */
module.exports.convert_block = (block) => {
    if (!block.key) return undefined;

    switch (block.key) {
        case 'gd_scene': {
            return block;
        };
        case 'ext_resource': {
            return block;
        };
        case 'sub_resource': {
            return Object.assign({
                key: 'sub_resource',
            }, resource(block));
        };
        case 'node': {
            return node(block);
        };
        case 'gd_resource': {
            return block;
        };
        case 'resource': {
            return block;
        };
        case 'extra_process': {
            return block;
        } break;
        default: {
            throw `Block with key "${block.key}" is not supported!`;
        };
    }
}
