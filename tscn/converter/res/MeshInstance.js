const GeometryInstance = require("./GeometryInstance");

module.exports = (data) => {
    const res = Object.assign({}, GeometryInstance(data), {
        mesh: data.prop.mesh,

        materials: (data.prop.material || []).filter(e => !!e),
    });

    // remove redundent data
    delete data.prop.material;

    return res;
};

module.exports.is_tres = true;
