const Node = require('./Node');
const { Transform } = require('../../parser/type_converters');

module.exports = (data) => {
    const res = Object.assign({}, Node(data), {
        transform: Transform(data.prop.transform),
        visible: data.prop.visible,
    });

    return res;
};

module.exports.is_tres = true;
