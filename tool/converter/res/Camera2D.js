const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'Camera2D',

        anchor_mode: data.prop.anchor_mode,
        current: data.prop.current,

        drag_margin_left: data.prop.drag_margin_left,
        drag_margin_right: data.prop.drag_margin_right,
        drag_margin_top: data.prop.drag_margin_bottom,
        drag_margin_bottom: data.prop.drag_margin_bottom,

        drag_margin_h_enabled: data.prop.drag_margin_h_enabled,
        drag_margin_v_enabled: data.prop.drag_margin_v_enabled,

        limit_left: data.prop.limit_left,
        limit_right: data.prop.limit_right,
        limit_top: data.prop.limit_top,
        limit_bottom: data.prop.limit_bottom,

        limit_smoothed: data.prop.limit_smoothed,

        offset: data.prop.offset,
        offset_h: data.prop.offset_h,
        offset_v: data.prop.offset_v,

        process_mode: data.prop.process_mode,

        rotating: data.prop.rotating,

        smooth_enabled: data.prop.smooth_enabled,
        smooth_speed: data.prop.smooth_speed,

        zoom: data.prop.zoom,
    });
};

module.exports.is_tres = true;
