const VisualInstance = require("./VisualInstance");

module.exports = (data) => {
    const res = Object.assign({}, VisualInstance(data), {
        light_data: data.prop.light_data,
    });
    return res;
};

module.exports.is_tres = true;
