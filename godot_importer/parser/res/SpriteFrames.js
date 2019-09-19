const {
    int,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'SpriteFrames',
        animations: data.prop.animations,
    };
};
