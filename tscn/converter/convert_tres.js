const _ = require('lodash');

const { convert_block } = require('./convert_block');
const { normalize_resource_object } = require('./resource_normalizer');
const {
    get_function_params,
    get_array_index_and_prop_key,
} = require('../parser/type_converters');

/**
 * @param {any} obj
 */
function optional_empty(obj) {
    return _.isEmpty(_.filter(obj, x => x !== undefined)) ? undefined : obj
}

/**
 * @param {Array} arr
 */
function optional_empty_array(arr) {
    return arr
        .filter(e => !!e)
        .filter(e => optional_empty(e))
}

/**
 * @param {{ key: string, attr: any, prop: any }[]} blocks
 */
module.exports.convert_tres = (blocks) => {
    const sections = blocks
        .map(convert_block)
        .filter(a => !!a) // remove all striped sections

    const head = sections.shift();

    let ext = {};
    let sub = []; // we need order of sub resources, some may depend on another
    let resource = {};

    for (let i = 0; i < sections.length; i++) {
        let sec = sections[i];
        if (sec.key === 'ext_resource') {
            if (sec.extra_process) {
                ext[sec.attr.id] = sec;
                continue;
            }

            const converter = require(`./res/${sec.attr.type}`);
            if (typeof (converter.get_resource_path) === 'function') {
                ext[sec.attr.id] = converter.get_resource_path(sec);
            } else {
                ext[sec.attr.id] = sec.attr.path;
            }
        } else if (sec.key === 'sub_resource') {
            normalize_resource_object(sec);

            sub.push(sec);
            sec.key = undefined;
        } else if (sec.key === 'resource') {
            for (const key in sec.prop) {
                const { index, prop_key } = get_array_index_and_prop_key(key);
                // is array of data
                if (_.isFinite(index) && _.isString(prop_key)) {
                    resource[index] = resource[index] || {};
                    resource[index][prop_key] = sec.prop[key];
                }
                // is just a structure with properties
                else {
                    resource[key] = sec.prop[key];
                }
            }
            normalize_resource_object(resource);
        }
    }

    if (head.key === 'gd_resource') {
        const converter = require(`./res/${head.attr.type}`);
        return Object.assign({
            ext: optional_empty(ext),
            sub: optional_empty_array(sub),
            resource: converter({
                attr: head.attr,
                prop: resource,
            }),
        });
    } else if (head.key === 'gd_scene') {
        const nodes = [];

        for (let i = 0; i < sections.length; i++) {
            let sec = sections[i];

            // script = null
            if (sec['script'] && sec['script'] === 'null') {
                sec['script'] = undefined;
            }
            if (sec._prop && sec._prop['script'] && sec._prop['script'] === 'null') {
                sec._prop['script'] = undefined;
            }
            if (sec.prop && sec.prop['script'] && sec.prop['script'] === 'null') {
                sec.prop['script'] = undefined;
            }

            // __meta__
            if (sec['__meta__']) {
                sec['__meta__'] = undefined;
            }
            if (sec._prop && sec._prop['__meta__']) {
                sec._prop['__meta__'] = undefined;
            }
            if (sec.prop && sec.prop['__meta__']) {
                sec.prop['__meta__'] = undefined;
            }

            if (sec.key === 'inherited_node') {
                // copy extra properties (they are inherited, so type is unknown to us)
                if (sec._prop) {
                    for (const k in sec._prop) {
                        if (k === 'script') continue;
                        if (sec[k] === undefined) {
                            sec[k] = sec._prop[k];
                        }
                    }
                }

                sec._attr = undefined;
                sec._prop = undefined;
                sec.key = undefined;
                normalize_resource_object(sec);
                nodes.push(sec);
                continue;
            } else if (sec.key !== 'node') {
                continue;
            }

            if (sec._prop && sec._prop.script/*  && sec._prop.script !== 'null' */) {
                const ext_idx = get_function_params(sec._prop.script)[0];
                const script_pack = ext[ext_idx];
                if (script_pack) {
                    if (script_pack.type === 'ReplaceNode') {
                        sec.key = 'node';
                        sec.attr = {
                            type: script_pack.meta,
                            index: sec['index'],
                            parent: sec['parent'],
                            name: sec['name'],
                        };
                        sec.prop = sec._prop;
                        sec._prop = undefined;
                        const converter = require(`./res/${sec.attr.type}`);
                        const parsed_sec = converter(sec);
                        // copy extra properties (may come from scripts)
                        for (const k in sec.prop) {
                            if (k === 'script') continue;
                            if (parsed_sec[k] === undefined) {
                                parsed_sec[k] = sec.prop[k];
                            }
                        }
                        parsed_sec.key = undefined;
                        parsed_sec._prop = undefined;

                        sec = parsed_sec;
                    }
                }
            }

            // copy extra properties (may come from scripts)
            if (sec._prop) {
                for (const k in sec._prop) {
                    if (k === 'script') continue;
                    if (sec[k] === undefined) {
                        sec[k] = sec._prop[k];
                    }
                }
            }

            // we don't normalize instance nodes now
            // since we don't know their type yet
            if (!sec.instance) {
                sec._prop = undefined;
                sec.key = undefined;
                normalize_resource_object(sec);
            }
            nodes.push(sec);
        }

        // remove ext_resource marked as "extra_process"
        for (const k in ext) {
            if (ext[k].extra_process) {
                ext[k] = ext[k].extra;
            }
        }

        return {
            type: 'PackedScene',
            ext: optional_empty(ext),
            sub: optional_empty_array(sub),
            nodes,
        };
    } else {
        throw `TRES of type "${head.key}" is not supported`;
    }
}
