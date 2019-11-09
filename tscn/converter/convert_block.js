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
        default: {
            throw `Block with key "${block.key}" is not supported!`;
        };
    }
}
