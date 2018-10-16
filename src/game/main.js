// Import the engine it self
import * as v from 'engine/index';

// Import features you want to use
/* import 'engine/accessibility/enable'; */
/* import 'engine/interaction/enable'; */
/* import 'engine/scene/coa/enable'; */
/* import 'engine/scene/graphics/enable'; */
/* import 'engine/scene/map/enable'; */
import 'engine/scene/sprites/enable';
/* import 'engine/scene/text/enable'; */
/* import 'engine/tween/enable'; */

// Scenes
import Preloader from 'game/preloader/Preloader';
import Test from 'game/test/Sprite';

v.preload('media/04b03.fnt');

v.scene_tree.init({
    application: {
        name: 'Voltar',
        preloader: Preloader,
        main_scene: Test,
    },
    display: {
        view: 'game',
        container: 'container',

        width: 256,
        height: 256,
        resolution: 1,

        background_color: 0x00AAC9,

        antialias: false,
        pixel_snap: true,
        scale_mode: 'nearest',

        FPS: 60,

        stretch_mode: 'viewport',
        stretch_aspect: 'keep',
    },
});
