const GeometryInstance = require("./GeometryInstance");

module.exports = (data) => {
    let materials = [];

    for (let k in data.prop) {
        if (k.includes("material/")) {
            let index = parseInt(k.replace("material/", ""));
            if (isFinite(index)) {
                materials.push(data.prop[k]);
                delete data.prop[k];
            }
        }
    }

    const res = Object.assign({}, GeometryInstance(data), {
        mesh: data.mesh,

        materials: materials.filter(e => !!e),
    });
    return res;
};

module.exports.is_tres = true;
