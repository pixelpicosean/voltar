// Import the engine it self
import * as v from 'engine/index';

// Import features you want to use
/* import 'engine/accessibility/index'; */
/* import 'engine/filters/index'; */
/* import 'engine/tween/index'; */
/* import 'engine/textures/VideoBaseTexture'; */

// Scenes
import Boot from 'game/boot/index';

// TODO: more Godot like API for resource loading
// Add resource to loading queue
v.loader.add('media/04b03.fnt');

// Start the game by initialize scene tree
v.scene_tree.init({
    application: {
        name: 'Voltar',
        main_scene: Boot,
    },
    display: {
        view: 'game',
        container: 'container',

        width: 256,
        height: 256,
        resolution: 1,

        background_color: 0x00AAC9,

        force_canvas: false,
        antialias: false,
        pixel_snap: true,
        scale_mode: 'nearest',

        FPS: 60,

        stretch_mode: 'viewport',
        stretch_aspect: 'keep',
    },
});

console.log(new v.Node2D())
