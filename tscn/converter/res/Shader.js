module.exports = (data) => {
    let code = data.prop.code.replace(/\t/gm, "\n");
    return {
        id: data.attr.id,
        type: "Shader",
        code: code,
    };
};

module.exports.is_tres = true;
