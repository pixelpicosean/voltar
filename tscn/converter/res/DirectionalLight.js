const Light = require("./Light");

module.exports = (data) => {
    const res = Object.assign({}, Light(data), {
        type: "DirectionalLight",
    });
    return res;
};

module.exports.is_tres = true;
