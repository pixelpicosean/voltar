const _ = require('lodash');
const path = require('path');
const walk = require('walk');

const { load_tres } = require('./converter/load_tres');
const { convert_tres } = require('./converter/convert_tres');


// /**
//  * @param {string} url
//  * @returns {string}
//  */
// function normalize_res_real_url(url) {
//     return url.replace('res://', path.normalize(path.join(__dirname, '/../assets/')));
// }

// const resource_normalizers = {
//     SpriteFrames: (res, meta) => {
//         const frames = {};
//         res.animations.forEach(anim => {
//             const a = frames[anim.name] = {
//                 frames: anim.frames.map(f => {
//                     const tex = meta.ext_resource[get_function_params(f)[0]];
//                     return resource_normalizers.Texture(tex);
//                 }),
//                 name: anim.name,
//                 loop: anim.loop,
//                 speed: anim.speed,
//             };
//         })
//         return frames;
//     },
//     TileSet: (res, meta, parent, resource_map) => {
//         const real_url = normalize_res_real_url(res.path);
//         const text_data = fs.readFileSync(real_url, 'utf8');

//         const sections = split_to_blocks(text_data)
//             .map(parse_block)
//             .map(convert_block)

//         let result = undefined;
//         let tile_map = undefined;
//         const ext_res_table = {};
//         const sub_res_table = {};
//         const head = sections.shift();
//         for (let i = 0; i < head.attr.load_steps; i++) {
//             const sec = sections[i];
//             if (sec.key === 'ext_resource') {
//                 ext_res_table[sec.id] = resource_normalizers[sec.type](sec, meta, parent, resource_map);
//             } else if (sec.key === 'sub_resource') {
//                 sub_res_table[sec.id] = resource_normalizers[sec.type](sec, meta, parent, resource_map);
//                 // throw 'sub_resource in "tres" is not supported yet';
//             } else if (sec.key === 'resource') {
//                 const prop = sec.prop;
//                 // TODO: make this a general function
//                 const keys = Object.keys(prop);
//                 // Array?
//                 // format is "number/"
//                 const slash_idx = keys[0].indexOf('/')
//                 if (slash_idx >= 0) {
//                     const num_str = keys[0].substring(0, slash_idx);
//                     if (Number.isFinite(parseInt(num_str))) {
//                         const array = [];
//                         for (const k in prop) {
//                             const key_list = k.split('/');
//                             const index = parseInt(key_list[0]);
//                             if (array.length < index + 1) {
//                                 array.length = index + 1;
//                                 array[index] = {};
//                             }

//                             let value = prop[k];
//                             if (typeof (value) === 'number') {
//                                 // do nothing
//                             } else if (typeof (value) === 'boolean') {
//                                 // do nothing
//                             } else if (Array.isArray(value)) {
//                                 if (value.length > 0) {
//                                     // Shape list
//                                     if (k.indexOf('shapes') >= 0) {
//                                         for (const s of value) {
//                                             s.autotile_coord = Vector2(s.autotile_coord);
//                                             s.shape = sub_res_table[get_function_params(s.shape)];
//                                             s.shape_transform = get_function_params(s.shape_transform).map(parseFloat);

//                                             // FIXME: should we delete the key and id here?
//                                             s.shape.key = undefined;
//                                             s.shape.id = undefined;

//                                             // FIXME: should we remove the properties if they are default value?
//                                             if (s.autotile_coord.x === 0 && s.autotile_coord.y === 0) {
//                                                 s.autotile_coord = undefined;
//                                             }

//                                             if (s.one_way === false) {
//                                                 s.one_way = undefined;
//                                             }

//                                             if (s.one_way_margin === 1) {
//                                                 s.one_way_margin = undefined;
//                                             }

//                                             /** @type {number[]} */
//                                             const t = s.shape_transform;
//                                             if (
//                                                 t[0] === 1
//                                                 &&
//                                                 t[1] === 0
//                                                 &&
//                                                 t[2] === 0
//                                                 &&
//                                                 t[3] === 1
//                                                 &&
//                                                 t[4] === 0
//                                                 &&
//                                                 t[5] === 0
//                                             ) {
//                                                 s.shape_transform = undefined;
//                                             }
//                                         }
//                                     }
//                                 }
//                             } else if (_.startsWith(value, 'ExtResource')) {
//                                 value = ext_res_table[get_function_params(value)];
//                             } else if (_.startsWith(value, 'SubResource')) {
//                                 value = sub_res_table[get_function_params(value)];
//                             } else if (_.startsWith(value, 'Vector2')) {
//                                 value = Vector2(value);
//                             } else if (_.startsWith(value, 'Color')) {
//                                 value = Color(value);
//                             } else if (_.startsWith(value, 'Rect2')) {
//                                 value = Rect2(value);
//                             }

//                             array[index][key_list[1]] = value;
//                         }
//                         tile_map = array;
//                     } else {
//                         // Dictionary?
//                         tile_map = prop;
//                     }
//                 }
//                 // Dictionary?
//                 else {
//                     tile_map = prop;
//                 }
//             }
//         }

//         const valid_only_tile_map = tile_map.filter((value) => !!value)
//         if (valid_only_tile_map.length > 0) {
//             const texture = valid_only_tile_map[0].texture;
//             const tile_mode = valid_only_tile_map[0].tile_mode;
//             tile_map = tile_map.map((tile) => {
//                 if (!tile) {
//                     return null;
//                 }

//                 const data = {};
//                 if (tile.modulate) {
//                     if (
//                         tile.modulate.r !== 1
//                         ||
//                         tile.modulate.g !== 1
//                         ||
//                         tile.modulate.b !== 1
//                         ||
//                         tile.modulate.a !== 1
//                     ) {
//                         data.modulate = tile.modulate;
//                     }
//                 }
//                 if (tile.navigation_offset) {
//                     if (
//                         tile.navigation_offset.x !== 0
//                         ||
//                         tile.navigation_offset.y !== 0
//                     ) {
//                         data.navigation_offset = tile.navigation_offset;
//                     }
//                 }
//                 if (tile.occluder_offset) {
//                     if (
//                         tile.occluder_offset.x !== 0
//                         ||
//                         tile.occluder_offset.y !== 0
//                     ) {
//                         data.occluder_offset = tile.occluder_offset;
//                     }
//                 }
//                 data.region = tile.region;
//                 if (tile.tex_offset) {
//                     if (
//                         tile.tex_offset.x !== 0
//                         ||
//                         tile.tex_offset.y !== 0
//                     ) {
//                         data.tex_offset = tile.tex_offset;
//                     }
//                 }
//                 if (tile.shapes.length > 0) {
//                     data.shapes = tile.shapes;
//                 }
//                 return data;
//             });

//             result = {
//                 texture: texture,
//                 tile_mode: tile_mode,
//                 tile_map: tile_map,
//             };
//         }

//         if (result) {
//             // Save resource as JSON besides of the original tscn file
//             // const json_path = real_url.replace(path.extname(real_url), '.json');
//             // fs.writeFileSync(json_path, JSON.stringify(result, null, 4));

//             // Add this resource to loading queue
//             resource_map[res.path] = {
//                 '@type#': 'TileSet',
//                 data: result,
//             };
//         }

//         return `@url#${res.path}`;
//     },
//     PackedScene: (res) => res.path,
//     Curve2D: (res) => ({ points: res.points }),
//     Curve: (res) => res,
//     CanvasItemMaterial: (res) => ({ blend_mode: res.blend_mode }),
// };

// const post_resource_actions = {
//     Text: (node, meta) => {
//         if ('font' in node && _.isObject(node.font)) {
//             node.style.fontSize = node.font.size;
//             node.style.fontFamily = node.font.family;
//             delete node.font;
//         }
//     },
//     Scene: (node, meta) => {
//         if (node.instance !== undefined) {
//             node.filename = node.instance;
//             node._attr.instance = node.instance;
//         }
//         delete node.instance;
//     },
//     AnimationPlayer: (node, meta, parent, resource_map) => {
//         if (node._anim_post_processed) {
//             return;
//         }

//         for (let a in node.anims) {
//             const res_idx = node.anims[a].replace(/^@sub#/, '')
//             const anim = meta.sub_resource[res_idx];
//             delete anim.key; // remove `sub_resource` mark

//             // try to normalize animation values
//             for (let track of anim.tracks) {
//                 let values = track.keys.values;
//                 for (let i = 0; i < values.length; i++) {
//                     let value = values[i];

//                     if (_.isString(value)) {
//                         if (value.indexOf('ExtResource') >= 0) {
//                             let res = meta.ext_resource[get_function_params(value)[0]];
//                             values[i] = resource_normalizers[res.type](res, meta, node, resource_map);
//                         } else if (value.indexOf('SubResource') >= 0) {
//                             let res = meta.sub_resource[get_function_params(value)[0]];
//                             values[i] = resource_normalizers[res.type](res, meta, node, resource_map);
//                         } else {
//                             // const arr = GeneralArray(value);
//                             // if (Array.isArray(arr)) {
//                             //     values[i] = arr;
//                             // }
//                         }
//                     }
//                 }
//             }
//         }
//         node._anim_post_processed = true;
//         // remove `anims/` properties
//         for (let k in node._prop) {
//             if (_.startsWith(k, 'anims/')) {
//                 delete node._prop[k];
//             }
//         }
//     },
// };


module.exports.convert_scenes = (/** @type {string} */scene_root_url_p) => {
    const scene_root_url = path.normalize(scene_root_url_p);

    /** @type {Object<string, { key: string, attr: any, prop: any }[]>} */
    const tres_map = {};

    walk.walkSync(scene_root_url, {
        listeners: {
            file: function (root, file_stats, next) {
                if (path.extname(file_stats.name) === '.tscn') {
                    const relative_to_root = path.relative(scene_root_url, root);
                    const filename = `res://${(path.join(relative_to_root, file_stats.name))}`;

                    load_tres(scene_root_url, filename, tres_map);
                } else {
                    next();
                }
            },
        },
    });

    // construct dependencies map
    const dependence_map = {};
    for (let filename in tres_map) {
        const tres = tres_map[filename];

        // find all the dependent tres (ext_resource)
        const ext = tres.filter((res) => res.key === 'ext_resource')

        // build our dependence map
        ext.forEach((res) => {
            const res_filename = res.attr.path;
            if (tres_map.hasOwnProperty(res_filename)) {
                const dep_list = dependence_map[filename] || [];
                dep_list.push(res_filename);
                dependence_map[filename] = dep_list;
            }
        })
    }

    // sort tres based on dependency
    const tres_path_list = Object.keys(tres_map);

    const dependence_amount_map = {};
    for (const k in dependence_map) {
        dependence_amount_map[k] = 0;
    }
    const get_dep_list = (name) => {
        if (!dependence_map[name]) {
            return [name];
        }
        return _.flatMap(dependence_map[name].map(get_dep_list));
    };
    const dep_full_list = _.flatMap(tres_path_list.map(get_dep_list));
    const tres_dep_frequent_map = dep_full_list.reduce((res, path) => {
        if (!res[path]) {
            res[path] = 0;
        }
        res[path] += 1;

        return res;
    }, {});

    let tres_dep_frequent_list = [];
    for (const k in tres_dep_frequent_map) {
        tres_dep_frequent_list.push({ k: k, v: tres_dep_frequent_map[k] });
    }
    tres_dep_frequent_list = _.sortBy(tres_dep_frequent_list, ['v'])
        .reverse()
        .map((freq) => (freq.k))

    for (const f of tres_path_list) {
        if (tres_dep_frequent_list.indexOf(f) < 0) {
            tres_dep_frequent_list.push(f);
        }
    }

    const ordered_tres_load_list = tres_dep_frequent_list.map(p => ({ filename: p, blocks: tres_map[p] }));

    const resource_map = ordered_tres_load_list.reduce((map, { filename, blocks }) => {
        map[filename] = convert_tres(blocks);
        return map;
    }, {});

    return resource_map;
}
