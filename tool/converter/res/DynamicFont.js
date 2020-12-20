module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'DynamicFont',
        font: data.prop.font_data,
        size: data.prop.size,
    };
};

module.exports.is_tres = true;
