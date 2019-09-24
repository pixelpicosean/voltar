const {
    int,
} = require('../../parser/type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'SpriteFrames',
        animations: data.prop.animations,
    };
};

module.exports.is_tres = () => true;
