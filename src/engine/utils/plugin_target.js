/**
 * Mixins functionality to make an object have "plugins".
 *
 * @example
 *      function MyObject() {}
 *      plugin_target.mixin(MyObject);
 *
 * @param {any} obj - The object to mix into.
 */
function plugin_target(obj) {
    obj.__plugins = {};

    /**
     * Adds a plugin to an object
     *
     * @param {string} renderer_plugin - The events that should be listed.
     * @param {FunctionConstructor} ctor - The constructor function for the plugin.
     */
    obj.register_plugin = function register_plugin(renderer_plugin, ctor) {
        obj.__plugins[renderer_plugin] = ctor;
    };

    /**
     * Instantiates all the plugins of this object
     *
     */
    obj.prototype.init_plugins = function init_plugins() {
        this.plugins = this.plugins || {};

        for (const o in obj.__plugins) {
            this.plugins[o] = new (obj.__plugins[o])(this);
        }
    };

    /**
     * Removes all the plugins of this object
     *
     */
    obj.prototype.destroy_plugins = function destroy_plugins() {
        for (const o in this.plugins) {
            this.plugins[o].destroy();
            this.plugins[o] = null;
        }

        this.plugins = null;
    };
}

export default {
    /**
     * Mixes in the properties of the plugin_target into another object
     *
     * @param {any} obj - The obj to mix into
     */
    mixin: function mixin(obj) {
        plugin_target(obj);
    },
};
