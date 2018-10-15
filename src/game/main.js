// Import the engine it self
import * as v from 'engine/index';

// Import features you want to use
/* import 'engine/accessibility/index'; */
/* import 'engine/interaction/index'; */
/* import 'engine/filters/index'; */
import 'engine/scene/sprites/index';
/* import 'engine/tween/index'; */
/* import 'engine/textures/VideoBaseTexture'; */

// Scenes
import Preloader from 'game/preloader/Preloader';
import SpriteTest from 'game/test/Sprite';

v.preload('hero', 'media/hero.png')

// Start the game by initialize scene tree
v.scene_tree.init({
    application: {
        name: 'Voltar',
        preloader: Preloader,
        main_scene: SpriteTest,
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
