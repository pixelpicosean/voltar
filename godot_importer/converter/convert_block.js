const gd_scene = require('./gd_scene');
const node = require('./node');
const resource = require('./resource');


module.exports.convert_block = (block) => {
    switch (block.key) {
        case 'gd_scene': {
            return gd_scene(block);
        };
        case 'ext_resource': {
            return Object.assign({
                key: 'ext_resource',
            }, resource(block));
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
