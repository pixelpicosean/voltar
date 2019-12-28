const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'AnimatedSprite',
    });

    res.frames = data.prop.frames;
    res.animation = data.prop.animation;
    res.frame = data.prop.frame;
    res.playing = data.prop.playing;
    res.speed_scale = data.prop.speed_scale;
    res.centered = data.prop.centered;
    res.flip_h = data.prop.flip_h;
    res.flip_v = data.prop.flip_v;

    return res;
};

module.exports.is_tres = true;
