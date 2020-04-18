const Spatial = require("./Spatial");

module.exports = (data) => {
    const res = Object.assign({}, Spatial(data), {
        type: "VisualInstance",
    });
    return res;
};

module.exports.is_tres = true;
