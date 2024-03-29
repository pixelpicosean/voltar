const fs = require('fs');

const { split_to_blocks } = require('./parser/split_to_blocks');
const { parse_block } = require('./parser/parse_block');

const {
    int,
    real,
    string,
    boolean,
    Color,
    Vector2,
} = require('./parser/type_converters');

const { color2hex } = require('./parser/utils');

const { gd_scancode_to_voltar } = require('./converter/key_map');


/**
 * @param {string} project_url
 */
module.exports.convert_project_settings = (project_url) => {
    let data = fs.readFileSync(project_url, 'utf8');

    // Remove comments
    let lines = data.split('\n')
        .filter(line => line.length > 0 && line[0] !== ';');

    // Remove version info
    let version = 0;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.indexOf('config_version') >= 0) {
            version = int(line.replace('config_version=', ''));
            lines = lines.slice(i + 1);
            break;
        }
    }
    while (lines[0][0] !== '[') {
        lines.shift();
    }

    // Convert back into a big string
    data = lines.join('\n')

    /** @type {any} */
    const settings = split_to_blocks(data)
        .map(parse_block)
        .map(b => {
            delete b.attr;
            return b;
        })
        .reduce((settings, b) => {
            settings[b.key] = b.prop;
            return settings;
        }, {});

    // Save the version
    settings.version = version;

    // Filter and normalize settings
    const real_settings = {};
    if (settings.application) {
        let application = {};
        application.name = string(settings.application['config/name']);
        real_settings.application = application;
    }
    if (settings.debug) {
        let debug = {};
        debug.force_fps = int(settings.debug['settings/fps/force_fps']);
        real_settings.debug = debug;
    }
    if (settings.display || settings.rendering) {
        settings.display = settings.display || {};
        settings.rendering = settings.rendering || {};

        let display = {};

        // size
        if (settings.display['window/size/width'] !== undefined) {
            display.width = int(settings.display['window/size/width']) || 1024;
        }
        if (settings.display['window/size/height'] !== undefined) {
            display.height = int(settings.display['window/size/height']) || 600;
        }

        // driver
        let driver = string(settings.rendering['quality/driver/driver_name'])
        if (driver !== undefined) {
            display.webgl2 = driver === 'GLES3';
        }

        // clear color
        let clear_color = Color(settings.rendering['environment/default_clear_color']);
        if (clear_color !== undefined) {
            display.background_color = color2hex(clear_color);
        }

        // stretch
        let stretch_mode = string(settings.display['window/stretch/mode']);
        if (stretch_mode !== undefined) {
            display.stretch_mode = stretch_mode;
        }
        let stretch_aspect = string(settings.display['window/stretch/aspect']);
        if (stretch_aspect !== undefined) {
            display.stretch_aspect = stretch_aspect;
        }

        // pixel snap
        let pixel_snap = boolean(settings.rendering['quality/2d/use_pixel_snap']);
        if (pixel_snap !== undefined) {
            display.pixel_snap = pixel_snap;
        }
        let snap_2d_transform = boolean(settings.rendering['quality/2d/use_transform_snap']);
        if (snap_2d_transform !== undefined) {
            display.snap_2d_transform = snap_2d_transform;
        }

        // filter
        let use_nearest = boolean(settings.rendering['quality/filters/use_nearest_mipmap_filter']);
        if (use_nearest !== undefined) {
            display.scale_mode = use_nearest ? 'nearest' : 'linear';
        }

        // AA
        let use_antialias = int(settings.rendering['quality/filters/msaa']);
        if (use_antialias !== undefined) {
            display.antialias = use_antialias > 0;
        }

        let use_fxaa = boolean(settings.rendering['quality/filters/use_fxaa']);
        if (use_fxaa !== undefined) {
            display.fxaa = use_fxaa;
        }

        let render_tree_balance = real(settings.rendering['quality/spatial_partitioning/render_tree_balance']);
        if (render_tree_balance !== undefined) {
            display.render_tree_balance = render_tree_balance;
        }

        let directional_shadow_size = int(settings.rendering["quality/directional_shadow/size"]);
        if (directional_shadow_size) {
            display.directional_shadow_size = directional_shadow_size;
        }

        let shadow_filter_mode = int(settings.rendering["quality/shadow/filter_mode"]);
        if (shadow_filter_mode) {
            display.shadow_filter_mode = shadow_filter_mode;
        }

        real_settings.display = display;
    }
    if (settings.physics) {
        let physics = {};

        let sleep_threshold_linear = real(settings.physics['2d/sleep_threshold_linear']);
        if (sleep_threshold_linear !== undefined) {
            physics.sleep_threshold_linear = sleep_threshold_linear;
        }

        let sleep_threshold_angular = real(settings.physics['2d/sleep_threshold_angular']);
        if (sleep_threshold_angular !== undefined) {
            physics.sleep_threshold_angular = sleep_threshold_angular;
        }

        let time_before_sleep = real(settings.physics['2d/time_before_sleep']);
        if (time_before_sleep !== undefined) {
            physics.time_before_sleep = time_before_sleep;
        }

        let default_gravity = real(settings.physics['2d/default_gravity']) || 98;
        let default_gravity_vector = Vector2(settings.physics['2d/default_gravity_vector']);
        if (default_gravity_vector !== undefined) {
            physics.gravity = {
                x: default_gravity_vector.x * default_gravity,
                y: default_gravity_vector.y * default_gravity,
            }
        } else {
            physics.gravity = {
                x: 0,
                y: default_gravity,
            }
        }

        let default_linear_damp = real(settings.physics['2d/default_linear_damp']);
        if (default_linear_damp !== undefined) {
            physics.default_linear_damp = default_linear_damp;
        }

        let default_angular_damp = real(settings.physics['2d/default_angular_damp']);
        if (default_angular_damp !== undefined) {
            physics.default_angular_damp = default_angular_damp;
        }

        real_settings.physics = physics;
    }
    if (settings.input) {
        for (const action in settings.input) {
            for (const event of settings.input[action].events) {
                if (event.type === 'InputEventKey') {
                    event.scancode = gd_scancode_to_voltar(event.scancode);
                }
            }
        }
        real_settings.input = settings.input;
    }
    if (settings.layer_names) {
        const layer_values = {};
        for (const k in settings.layer_names) {
            if (k.indexOf('2d_physics/layer_') >= 0) {
                const num_str = k.replace('2d_physics/layer_', '');
                const num = parseInt(num_str, 10);
                if (Number.isFinite(num)) {
                    layer_values[settings.layer_names[k]] = num - 1;
                }
            }
        }

        real_settings.layer_map = {
            physics: layer_values,
        };
    }

    return real_settings;
};
