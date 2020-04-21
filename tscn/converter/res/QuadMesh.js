module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: "QuadMesh",
        size: data.prop.size,
    }
    return res;
};

module.exports.is_tres = true;
