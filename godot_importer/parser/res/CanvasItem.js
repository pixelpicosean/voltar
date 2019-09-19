const Node = require('./Node');
const {
    Color,
    boolean,
} = require('../parse_utils');

module.exports = (data) => {
    const res = Object.assign({}, Node(data), {
        type: 'CanvasItem',
        self_modulate: Color(data.prop.self_modulate),
        modulate: Color(data.prop.modulate),
        visible: boolean(data.prop.visible),
        show_behind_parent: boolean(data.prop.show_behind_parent),
    });

    return res;
};
