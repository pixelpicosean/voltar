// Import the engine it self
import * as v from 'engine/index';

// Import features you want to use
import 'engine/interaction/enable';
/* import 'engine/extract/enable'; */
import 'engine/scene/graphics/enable';
import 'engine/scene/map/enable';
import 'engine/scene/mesh/enable';
import 'engine/scene/particles/enable';
import 'engine/scene/sprites/enable';
import 'engine/scene/text/enable';
import 'engine/scene/physics/enable';

// Our preloader
import Preloader from 'game/preloader/preloader';

// First scene after preloader
import Main from 'game/demo/demo';

// Settings exported from Godot
import Settings from 'project.json';

// Always prefer atlas, for better performance and Godot importer support
// while in Godot you do not need to use atlas, keep using single images.
// This may change in the future, but will keep as is right now.
v.preload('media/sprites.json');

v.scene_tree.init(
    v.utils.deep_merge(Settings, {
        application: {
            preloader: Preloader,
            main_scene: Main,
            pause_on_blur: false,
        },
        display: {
            scale_mode: 'nearest',
            pixel_snap: true, // for linear scale_mode you may not need this
        },
    })
);
