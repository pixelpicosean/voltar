const PrimitiveMesh = require('./PrimitiveMesh');

module.exports = (data) => {
    const res = Object.assign(PrimitiveMesh(data), {
        size: data.prop.size,
        subdivide_width: data.prop.subdivide_width,
        subdivide_height: data.prop.subdivide_height,
        subdivide_depth: data.prop.subdivide_depth,
    });
    return res;
};

module.exports.is_tres = true;
