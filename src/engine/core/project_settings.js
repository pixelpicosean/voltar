import { deep_merge } from "engine/utils/deep_merge";
import {
    STRETCH_MODE_DISABLED,
    STRETCH_MODE_VIEWPORT,
    STRETCH_MODE_2D,
    STRETCH_ASPECT_IGNORE,
    STRETCH_ASPECT_KEEP,
    STRETCH_ASPECT_KEEP_WIDTH,
    STRETCH_ASPECT_KEEP_HEIGHT,
    STRETCH_ASPECT_EXPAND,
} from "engine/scene/main/scene_tree";

/**
 * @typedef ApplicationSettings
 * @prop {string} [name]
 * @prop {{ instance: () => import('engine/scene/main/node').Node }} [preloader]
 * @prop {string|typeof Node} [main_scene]
 * @prop {boolean} [pause_on_blur]
 */

/**
  * @typedef DisplaySettings
  * @prop {string} [view]
  * @prop {string} [container]
  * @prop {number} [width]
  * @prop {number} [height]
  * @prop {number} [resolution]
  * @prop {number} [orientation]
  * @prop {number} [background_color]
  * @prop {boolean} [antialias]
  * @prop {boolean} [pixel_snap]
  * @prop {string} [scale_mode]
  * @prop {number} [stretch_mode]
  * @prop {number} [stretch_aspect]
  * @prop {boolean} [resizable]
  */

/**
 * @typedef Gravity
 * @prop {number} x
 * @prop {number} y
 */
/**
  * @typedef PhysicsSettings
  * @prop {number} [physics_fps]
  * @prop {number} [sleep_threshold_linear]
  * @prop {number} [sleep_threshold_angular]
  * @prop {number} [time_before_sleep]
  * @prop {number} [default_angular_damp]
  * @prop {number} [default_linear_damp]
  * @prop {Gravity} [gravity]
  * @prop {number} [iteration]
  */

/**
 * @typedef {Object<string, string>} InputSettings
 */

/**
 * @typedef LayerMap
 * @prop {Object<string, number>} [physics]
 */

/**
 * @typedef Settings
 * @prop {ApplicationSettings} [application]
 * @prop {DisplaySettings} [display]
 * @prop {PhysicsSettings} [physics]
 * @prop {InputSettings} [input]
 * @prop {LayerMap} [layer_map]
 */

/**
 * @type {Settings}
 */
const DefaultSettings = {
    application: {
        name: 'Voltar',
        preloader: undefined,
        main_scene: undefined,
        pause_on_blur: false,
    },
    display: {
        view: 'game',
        container: 'container',

        width: 1024,
        height: 600,
        resolution: 1,
        orientation: 0,

        background_color: 0x4C4C4C,

        antialias: false,
        pixel_snap: false,
        scale_mode: 'linear',

        stretch_mode: STRETCH_MODE_DISABLED,
        stretch_aspect: STRETCH_ASPECT_IGNORE,
        resizable: true,
    },
    physics: {
        physics_fps: 60,
        sleep_threshold_linear: 2,
        sleep_threshold_angular: 8.0 / 180.0 * Math.PI,
        time_before_sleep: 0.5,
        default_linear_damp: 0.1,
        default_angular_damp: 1,
        gravity: { x: 0, y: 98 },
        iteration: 2,
    },
    input: {},
    layer_map: {
        physics: {},
    },
};

export class ProjectSettings {
    static get_singleton() { return singleton }

    /**
     * @param {...Settings} settings
     */
    constructor(...settings) {
        if (!singleton) singleton = this;

        this.application = DefaultSettings.application;
        this.display = DefaultSettings.display;
        this.physics = DefaultSettings.physics;
        this.input = DefaultSettings.input;
        this.layer_map = DefaultSettings.layer_map;

        for (let s of settings) {
            deep_merge(this, s);
        }
    }
}

/** @type {ProjectSettings} */
let singleton = null;
