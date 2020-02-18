const {
    ColorArray,
} = require('../../parser/type_converters');

module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'Gradient',
        colors: ColorArray(data.prop.colors),
    }
};

module.exports.is_tres = true;
