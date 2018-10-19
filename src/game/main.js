// Import the engine it self
import * as v from 'engine/index';

// Import features you want to use
/* import 'engine/accessibility/enable'; */
/* import 'engine/interaction/enable'; */
/* import 'engine/extract/enable'; */
/* import 'engine/scene/coa/enable'; */
import 'engine/scene/graphics/enable';
/* import 'engine/scene/map/enable'; */
/* import 'engine/scene/mesh/enable'; */
/* import 'engine/scene/particles/enable'; */
import 'engine/scene/sprites/enable';
/* import 'engine/scene/text/enable'; */
/* import 'engine/tween/enable'; */

// Scenes
import Preloader from 'game/preloader/Preloader';
import Test from 'game/test/Sprite';

import Settings from 'project.json';

v.preload('media/04b03.fnt');

v.scene_tree.init(
    v.utils.deep_merge(Settings, {
        application: {
            preloader: Preloader,
            main_scene: Test,
        },
    })
);
