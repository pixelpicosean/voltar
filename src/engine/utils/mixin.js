/**
 * Mixes all enumerable properties and methods from a source object to a target object.
 *
 * @param {any} target The prototype or instance that properties and methods should be added to.
 * @param {any} source The source of properties and methods to mix in.
 */
export function mixin(target, source) {
    if (!target || !source) return;
    // in ES8/ES2017, this would be really easy:
    // Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));

    // get all the enumerable property keys
    const keys = Object.keys(source);

    // loop through properties
    for (let i = 0; i < keys.length; ++i) {
        const property_name = keys[i];

        // Set the property using the property descriptor - this works for accessors and normal value properties
        Object.defineProperty(target, property_name, Object.getOwnPropertyDescriptor(source, property_name));
    }
}

const mixins = [];

/**
 * Queues a mixin to be handled towards the end of the initialization of V, so that deprecation
 * can take effect.
 *
 * @param {any} target The prototype or instance that properties and methods should be added to.
 * @param {any} source The source of properties and methods to mix in.
 */
export function delay_mixin(target, source) {
    mixins.push(target, source);
}

/**
 * Handles all mixins queued via delay_mixin().
 */
export function perform_mixins() {
    for (let i = 0; i < mixins.length; i += 2) {
        mixin(mixins[i], mixins[i + 1]);
    }
    mixins.length = 0;
}
