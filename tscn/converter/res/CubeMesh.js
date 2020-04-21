module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: "CubeMesh",
        size: data.prop.size,
        subdivide_width: data.prop.subdivide_width,
        subdivide_height: data.prop.subdivide_height,
        subdivide_depth: data.prop.subdivide_depth,
    }
    return res;
};

module.exports.is_tres = true;
