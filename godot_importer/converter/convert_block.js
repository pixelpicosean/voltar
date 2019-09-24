const node = require('./node');
const resource = require('./resource');


/**
 * @returns {{ key?: string, id?: string, attr?: any, prop?: any, _prop?: any }}
 */
module.exports.convert_block = (block) => {
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
