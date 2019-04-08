const CanvasLayer = require('./CanvasLayer');

module.exports = (data) => {
    return Object.assign(CanvasLayer(data), {
        type: 'ParallaxBackground',
        scroll_base_offset: data.prop.scroll_base_offset,
        scroll_base_scale: data.prop.scroll_base_scale,
        scroll_ignore_camera_zoom: data.prop.scroll_ignore_camera_zoom,
        scroll_limit_begin: data.prop.scroll_limit_begin,
        scroll_limit_end: data.prop.scroll_limit_end,
        scroll_offset: data.prop.scroll_offset,
    });
};
