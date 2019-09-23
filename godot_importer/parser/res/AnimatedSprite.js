const {
} = require('../type_converters');

const Sprite = require('./Sprite');

module.exports = (data) => {
    const res = Object.assign({}, Sprite(data), {
        type: 'AnimatedSprite',
    });

    res.frames = data.prop.frames;
    res.animation = data.prop.animation;
    res.frame = data.prop.frame;
    res.playing = data.prop.playing;
    res.speed_scale = data.prop.speed_scale;

    return res;
};
