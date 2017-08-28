// import polyfills. Done as an export to make sure polyfills are imported first
export * from './polyfill';

// export core
import * as core from './core';
export * from './core';

// export libs
import * as accessibility from './accessibility';
import * as extract from './extract';
import * as filters from './filters';
import * as interaction from './interaction';
import * as loaders from './loaders';
import * as prepare from './prepare';
import * as audio from './audio';
import Signal from './Signal';

// handle mixins now, after all code has been added
import { utils } from './core';
utils.mixins.perform_mixins();

/**
 * Alias for {@link V.loaders.shared}.
 * @name loader
 * @memberof V
 * @type {V.loader.Loader}
 */
const loader = loaders.shared || null;

const sound = audio.SoundLibrary.init(loaders);

export {
    accessibility,
    extract,
    filters,
    interaction,
    loaders,
    prepare,
    loader,
    audio,
    sound,
    Signal,
};

import SceneTree from './SceneTree';

export * from './SceneTree';
export const scene_tree = new SceneTree();


function assemble_node(node, children) {
    if (!children || children.length === 0) {
        return;
    }

    let i, data, inst;
    for (i = 0; i < children.length; i++) {
        data = children[i];

        inst = new (core[data.type])();
        inst._load_data(data);

        assemble_node(inst, data.children);

        node.add_child(inst);
    }
}
export function assemble_scene(scn, data) {
    if (data.name) {
        scn.name = name;
    }
    if (data.children) {
        assemble_node(scn, data.children);
    }
    return scn;
}
