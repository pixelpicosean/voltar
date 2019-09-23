const {
    int,
} = require('../type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'SpriteFrames',
        animations: data.prop.animations,
    };
};
