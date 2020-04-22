module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: "PlaneMesh",

        size: data.prop.size,
        subdivide_width: data.prop.subdivide_width,
        subdivide_depth: data.prop.subdivide_depth,
    }
    return res;
};

module.exports.is_tres = true;
