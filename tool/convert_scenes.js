const _ = require('lodash');
const path = require('path');
const walk = require('walk');

const { get_function_params } = require('./parser/type_converters');

const { load_tres } = require('./converter/load_tres');
const { convert_tres } = require('./converter/convert_tres');
const { normalize_resource_object } = require('./converter/resource_normalizer');

module.exports.convert_scenes = (/** @type {string} */scene_root_url_p) => {
    const scene_root_url = path.normalize(scene_root_url_p);

    /** @type {Object<string, { key: string, attr: any, prop: any, extra_process?: boolean }[]>} */
    const tres_map = {};

    walk.walkSync(scene_root_url, {
        listeners: {
            file: function (root, file_stats, next) {
                switch (path.extname(file_stats.name)) {
                    case '.tres':
                    case '.tscn':
                    case '.escn': {
                        const relative_to_root = path.relative(scene_root_url, root);
                        const filename = `res://${(path.join(relative_to_root, file_stats.name))}`;

                        if (filename.startsWith('res://addons')) {
                            return next();
                        }

                        load_tres(scene_root_url, filename, tres_map);
                    } break;
                    default: next();
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
            .filter((res) => !res.extra_process)

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
        map[filename.replace(/\\/g, "/")] = convert_tres(blocks);
        return map;
    }, {});

    // now we can normalize instanced nodes
    for (const filename in resource_map) {
        const res = resource_map[filename];
        /** @type {{ ext: any, sub: any, nodes: any[] }} */
        let parent_res = null;
        if (res.nodes && Array.isArray(res.nodes)) {
            for (let i = 0; i < res.nodes.length; i++) {
                const node = res.nodes[i];

                if (node.instance) {
                    // find real type of this node
                    let node_type = null;
                    let parent_class = node;
                    let curr_res = res;
                    while (parent_class) {
                        node_type = parent_class.type;
                        if (node_type && node_type !== 'Scene') {
                            break;
                        }
                        if (Array.isArray(parent_class.instance) && parent_class.instance[0] === '@ext#') {
                            const instance_idx = parent_class.instance[1];
                            parent_res = resource_map[parent_res.ext[instance_idx]];
                            parent_class = parent_res.nodes[0];
                        } else {
                            const instance_idx = get_function_params(parent_class.instance)[0];
                            parent_res = resource_map[curr_res.ext[instance_idx]];
                            parent_class = parent_res.nodes[0];
                        }
                    }

                    // use converter to process its data
                    node.attr = node._attr; node._attr = undefined;
                    node.prop = node._prop; node._prop = undefined;
                    const converter = require(`./converter/res/${node_type}`);
                    const parsed_data = converter(node);

                    // copy extra properties (may come from scripts)
                    for (const k in node.prop) {
                        if (parsed_data[k] === undefined) {
                            parsed_data[k] = node.prop[k];
                        }
                    }
                    parsed_data._prop = undefined;

                    // remove its type, which is already defined in its own scene
                    parsed_data.type = undefined;
                    parsed_data.key = undefined;

                    // and add instance back to data
                    parsed_data.instance = node.instance;

                    // normalize its resource
                    normalize_resource_object(parsed_data);

                    // override
                    res.nodes[i] = parsed_data;
                }
            }
        }
    }

    return resource_map;
}
