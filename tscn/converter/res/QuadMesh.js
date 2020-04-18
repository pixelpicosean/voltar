module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: "QuadMesh",
    }
    return res;
};

module.exports.is_tres = true;
