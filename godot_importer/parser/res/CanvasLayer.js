const Node = require('./Node');
const {
    PoolRealArray,
} = require('../parse_utils');

module.exports = (data) => {
    return Object.assign(Node(data), {
        type: 'CanvasLayer',
        transform: PoolRealArray(data.prop.transform),
    });
};
