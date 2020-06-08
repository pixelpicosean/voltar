const PrimitiveMesh = require('./PrimitiveMesh');

module.exports = (data) => {
    const res = Object.assign(PrimitiveMesh(data), {
        size: data.prop.size,
    })
    return res;
};

module.exports.is_tres = true;
