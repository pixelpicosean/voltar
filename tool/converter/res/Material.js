module.exports = (data) => {
    return {
        id: data.attr.id,
        type: data.attr.type,

        shader: data.prop.shader,
    };
};

module.exports.is_tres = true;
