module.exports = (data) => {
    return {
        id: data.attr.id,
        type: "ShaderMaterial",
        shader: data.prop.shader,
    };
};

module.exports.is_tres = false;
