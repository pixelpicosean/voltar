const Light = require("./Light");

module.exports = (data) => {
    const res = Object.assign({}, Light(data), {
        shadow_enabled: data.prop.shadow_enabled,
        shadow_color: data.prop.shadow_color,
        directional_shadow_mode: data.prop.directional_shadow_mode,
    });
    return res;
};

module.exports.is_tres = true;
