const Node = require('./Node');
const {
    Color,
    boolean,
} = require('../../parser/type_converters');

module.exports = (data) => {
    const res = Object.assign({}, Node(data), {
        type: 'CanvasItem',
        self_modulate: Color(data.prop.self_modulate),
        modulate: Color(data.prop.modulate),
        visible: boolean(data.prop.visible),
        show_behind_parent: boolean(data.prop.show_behind_parent),
        material: data.prop.material,
    });

    return res;
};

module.exports.is_tres = true;
