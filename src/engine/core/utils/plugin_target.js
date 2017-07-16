/**
 * Mixins functionality to make an object have "plugins".
 *
 * @example
 *      function MyObject() {}
 *
 *      plugin_target.mixin(MyObject);
 *
 * @mixin
 * @memberof V.utils
 * @param {object} obj - The object to mix into.
 */
function plugin_target(obj)
{
    obj.__plugins = {};

    /**
     * Adds a plugin to an object
     *
     * @param {string} plugin_name - The events that should be listed.
     * @param {Function} ctor - The constructor function for the plugin.
     */
    obj.registerPlugin = function registerPlugin(plugin_name, ctor)
    {
        obj.__plugins[plugin_name] = ctor;
    };

    /**
     * Instantiates all the plugins of this object
     *
     */
    obj.prototype.initPlugins = function initPlugins()
    {
        this.plugins = this.plugins || {};

        for (const o in obj.__plugins)
        {
            this.plugins[o] = new (obj.__plugins[o])(this);
        }
    };

    /**
     * Removes all the plugins of this object
     *
     */
    obj.prototype.destroyPlugins = function destroyPlugins()
    {
        for (const o in this.plugins)
        {
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
     * @param {object} obj - The obj to mix into
     */
    mixin: function mixin(obj)
    {
        plugin_target(obj);
    },
};
