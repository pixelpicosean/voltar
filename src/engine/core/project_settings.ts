import { deep_merge } from "engine/utils/deep_merge";
import {
    STRETCH_MODE_DISABLED,
    STRETCH_ASPECT_IGNORE,
} from "engine/scene/main/scene_tree.js";
import { InputEventKey } from "./os/input_event";
import { KEYS } from "./os/keyboard";

interface ApplicationSettings {
    name?: string
    main_scene?: { instance: () => import("engine/scene/main/node").Node }
    pause_on_blur?: boolean
    min_update_step?: number
}

interface DisplaySettings {
    view?: string;
    container?: string;
    webgl2?: boolean;
    width?: number;
    height?: number;
    resolution?: number;
    orientation?: number;
    background_color?: number;
    antialias?: boolean;
    pixel_snap?: boolean;
    scale_mode?: string;
    stretch_mode?: number;
    stretch_aspect?: number;
    resizable?: boolean;
    fxaa?: boolean;
    render_tree_balance?: number;
}

interface PhysicsSettings {
    physics_fps?: number;
    sleep_threshold_linear?: number;
    sleep_threshold_angular?: number;
    time_before_sleep?: number;
    default_angular_damp?: number;
    default_linear_damp?: number;
    gravity?: { x: number, y: number };
    iteration?: number;
}

type InputSettings = { [action: string]: { deadzone?: number, events: any[] } };

interface LayerMap {
    physics?: { [name: string]: number };
}

interface Settings {
    application?: ApplicationSettings;
    display?: DisplaySettings;
    physics?: PhysicsSettings;
    input?: InputSettings;
    layer_map?: LayerMap;
}

const DefaultSettings: Settings = {
    application: {
        name: "Voltar",
        main_scene: undefined,
        pause_on_blur: false,
        min_update_step: 1 / 10,
    },
    display: {
        view: "game",
        container: "container",

        width: 1024,
        height: 600,
        webgl2: false,
        resolution: 1,
        orientation: 0,

        background_color: 0x4C4C4C,

        antialias: false,
        pixel_snap: false,
        scale_mode: "linear",

        stretch_mode: STRETCH_MODE_DISABLED,
        stretch_aspect: STRETCH_ASPECT_IGNORE,
        resizable: false,

        fxaa: false,

        render_tree_balance: 0,
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

    application: ApplicationSettings;
    display: DisplaySettings;
    physics: PhysicsSettings;
    input: InputSettings;
    layer_map: LayerMap;

    constructor(...settings: Settings[]) {
        if (!singleton) singleton = this;

        this.application = DefaultSettings.application;
        this.display = DefaultSettings.display;
        this.physics = DefaultSettings.physics;
        this.input = DefaultSettings.input;
        this.layer_map = DefaultSettings.layer_map;

        // [Begin] pre-defined keys
        let action = null;
        let events = null;
        let key = null;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["ENTER"];
        events.push(key);
        key = InputEventKey.instance();
        key.scancode = KEYS["SPACE"];
        events.push(key);
        this.input["ui_accept"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["SPACE"];
        events.push(key);
        this.input["ui_select"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["ESC"];
        events.push(key);
        this.input["ui_cancel"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["TAB"];
        events.push(key);
        this.input["ui_focus_next"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["TAB"];
        key.shift = true;
        events.push(key);
        this.input["ui_focus_prev"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["LEFT"];
        events.push(key);
        this.input["ui_left"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["RIGHT"];
        events.push(key);
        this.input["ui_right"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["UP"];
        events.push(key);
        this.input["ui_up"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["DOWN"];
        events.push(key);
        this.input["ui_down"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["PAGE_UP"];
        events.push(key);
        this.input["ui_page_up"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["PAGE_DOWN"];
        events.push(key);
        this.input["ui_page_down"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["HOME"];
        events.push(key);
        this.input["ui_home"] = action;

        action = { deadzone: 0.5, events: [] };
        events = action.events;
        key = InputEventKey.instance();
        key.scancode = KEYS["END"];
        events.push(key);
        this.input["ui_end"] = action;
        // [End] pre-defined keys

        for (let s of settings) {
            deep_merge(this, s);
        }
    }

    get_physics_layer_bit(name: string): number {
        return this.layer_map.physics[name];
    }

    get_physics_layer_value(name: string): number {
        return 1 << this.layer_map.physics[name];
    }
}

let singleton: ProjectSettings = null;
