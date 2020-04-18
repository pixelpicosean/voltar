const GeometryInstance = require("./GeometryInstance");

module.exports = (data) => {
    const res = Object.assign({}, GeometryInstance(data), {
        type: "MeshInstance",
        mesh: data.mesh,
        material: data.material,
    });
    return res;
};

module.exports.is_tres = true;
