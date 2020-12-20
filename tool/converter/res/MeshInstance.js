const GeometryInstance = require("./GeometryInstance");

module.exports = (data) => {
    const res = Object.assign({}, GeometryInstance(data), {
        mesh: data.prop.mesh,

        material: (data.prop.material || []).filter(e => !!e),
    });

    return res;
};

module.exports.is_tres = true;
