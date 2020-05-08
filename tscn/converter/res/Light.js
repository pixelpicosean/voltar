const VisualInstance = require("./VisualInstance");

module.exports = (data) => {
    const res = Object.assign({}, VisualInstance(data), {
        type: "Light",
        light_color: data.prop.light_color,
        light_energy: data.prop.light_energy,
        light_indirect_energy: data.prop.light_indirect_energy,
        light_negative: data.prop.light_negative,
        light_specular: data.prop.light_specular,
        light_cull_mask: data.prop.light_cull_mask,
    });
    return res;
};

module.exports.is_tres = true;
