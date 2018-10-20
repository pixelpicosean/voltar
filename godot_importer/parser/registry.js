module.exports.path_modifiers = [
    // Control
    (str) => str.replace(/rect_scale/g, 'scale'),

    // Label
    (str) => str.replace(/custom_colors\/font_color/g, 'fill'),
];
