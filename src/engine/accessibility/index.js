/**
 * This namespace contains a renderer plugin for interaction accessibility for end-users
 * with physical impairments which require screen-renders, keyboard navigation, etc.
 *
 * Do not instantiate this plugin directly. It is available from the `renderer.plugins` property.
 */
export { default as accessible_target } from './accessible_target';
export { default as AccessibilityManager } from './AccessibilityManager';
