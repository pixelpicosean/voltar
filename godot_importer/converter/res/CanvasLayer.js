const {
    PoolRealArray,
} = require('../../parser/type_converters');

const Node = require('./Node');

module.exports = (data) => {
    return Object.assign(Node(data), {
        type: 'CanvasLayer',
        transform: PoolRealArray(data.prop.transform),
    });
};

module.exports.is_tres = () => true;
