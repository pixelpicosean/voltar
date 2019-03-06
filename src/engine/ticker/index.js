import Ticker from './ticker';

/**
 * The shared ticker instance used by {@link interaction.InteractionManager}.
 * The property {@link Ticker#auto_start} is set to `true`
 * for this instance. Please follow the examples for usage, including
 * how to opt-out of auto-starting the shared ticker.
 *
 * @example
 * let ticker = ticker.shared;
 * // Set this to prevent starting this ticker when listeners are added.
 * // By default this is true only for the ticker.shared instance.
 * ticker.auto_start = false;
 * // FYI, call this to ensure the ticker is stopped. It should be stopped
 * // if you have not attempted to render anything yet.
 * ticker.stop();
 * // Call this when you are ready for a running shared ticker.
 * ticker.start();
 *
 * @example
 * // You may use the shared ticker to render...
 * let renderer = autoDetectRenderer(800, 600);
 * let stage = new Node2D();
 * let interaction_manager = interaction.InteractionManager(renderer);
 * document.body.appendChild(renderer.view);
 * ticker.add(function (time) {
 *     renderer.render(stage);
 * });
 *
 * @example
 * // Or you can just update it manually.
 * ticker.auto_start = false;
 * ticker.stop();
 * function animate(time) {
 *     ticker.update(time);
 *     renderer.render(stage);
 *     requestAnimationFrame(animate);
 * }
 * animate(performance.now());
 *
 * @type {Ticker}
 */
const shared = new Ticker();

shared.auto_start = true;
shared.destroy = () => {
    // protect destroying shared ticker
    // this is used by other internal systems
    // like AnimatedSprite and InteractionManager
};

/**
 * This namespace contains an API for interacting with V's internal global update loop.
 *
 * This ticker is used for {@link interaction.InteractionManager InteractionManager} and many other time-based systems.
 * @example
 * const ticker = new ticker.Ticker();
 * ticker.stop();
 * ticker.add((delta_time) => {
 *     // do something every frame
 * });
 * ticker.start();
 */
export { shared, Ticker };
