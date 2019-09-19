const {
    boolean,
    Vector2,
} = require('../parse_utils');

const CanvasLayer = require('./CanvasLayer');

module.exports = (data) => {
    return Object.assign(CanvasLayer(data), {
        type: 'ParallaxBackground',
        scroll_base_offset: Vector2(data.prop.scroll_base_offset),
        scroll_base_scale: Vector2(data.prop.scroll_base_scale),
        scroll_ignore_camera_zoom: boolean(data.prop.scroll_ignore_camera_zoom),
        scroll_limit_begin: Vector2(data.prop.scroll_limit_begin),
        scroll_limit_end: Vector2(data.prop.scroll_limit_end),
        scroll_offset: Vector2(data.prop.scroll_offset),
    });
};
