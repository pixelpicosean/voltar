// Import the engine it self
import * as v from 'engine/index';

// Import features you want to use
/* import 'engine/accessibility/enable'; */
import 'engine/interaction/enable';
import 'engine/extract/enable';
import 'engine/scene/coa/enable';
import 'engine/scene/graphics/enable';
import 'engine/scene/map/enable';
import 'engine/scene/mesh/enable';
import 'engine/scene/particles/enable';
import 'engine/scene/sprites/enable';
import 'engine/scene/text/enable';
import 'engine/tween/enable';

// Our preloader
import Preloader from 'game/preloader/Preloader';

// First scene after preloader
import Test from 'game/test/Coa';

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
            main_scene: Test,
        },
        display: {
            scale_mode: 'nearest',
        },
    })
);
