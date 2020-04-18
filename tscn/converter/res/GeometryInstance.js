const VisualInstance = require("./VisualInstance");

module.exports = (data) => {
    const res = Object.assign({}, VisualInstance(data), {
        type: "GeometryInstance",
    });
    return res;
};

module.exports.is_tres = true;
