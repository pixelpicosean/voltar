const Spatial = require("./Spatial");

module.exports = (data) => {
    const res = Object.assign({}, Spatial(data), {
        type: "VisualInstance",
        layers: data.prop.layers,
    });
    return res;
};

module.exports.is_tres = true;
