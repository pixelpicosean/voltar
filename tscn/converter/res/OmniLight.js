const Light = require("./Light");

module.exports = (data) => {
    const res = Object.assign({}, Light(data), {
    });
    return res;
};

module.exports.is_tres = true;
