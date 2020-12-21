const GeometryInstance = require("./GeometryInstance");

module.exports = (data) => {
    let res = Object.assign({}, GeometryInstance(data), {
        mesh: data.prop.mesh,

        material: (data.prop.material || []).filter(e => !!e),
    });

    if (res.material.length === 0) {
        res.material = undefined;
    }

    return res;
};

module.exports.is_tres = true;
