// References:
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// https://gist.github.com/1579671
// http://updates.html5rocks.com/2012/05/requestAnimationFrame-API-now-with-sub-millisecond-precision
// https://gist.github.com/timhall/4078614
// https://github.com/Financial-Times/polyfill-service/tree/master/polyfills/requestAnimationFrame

const ONE_FRAME_TIME = 16;

// Date.now
if (!(Date.now && Date.prototype.getTime))
{
    Date.now = function now()
    {
        return new Date().getTime();
    };
}

// performance.now
if (!(window.performance && window.performance.now))
{
    const startTime = Date.now();

    if (!window.performance)
    {
        window.performance = {};
    }

    window.performance.now = () => Date.now() - startTime;
}

// requestAnimationFrame
let last_time = Date.now();
const vendors = ['ms', 'moz', 'webkit', 'o'];

for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x)
{
    const p = vendors[x];

    window.requestAnimationFrame = window[`${p}RequestAnimationFrame`];
    window.cancelAnimationFrame = window[`${p}CancelAnimationFrame`] || window[`${p}CancelRequestAnimationFrame`];
}

if (!window.requestAnimationFrame)
{
    window.requestAnimationFrame = (callback) =>
    {
        if (typeof callback !== 'function')
        {
            throw new TypeError(`${callback}is not a function`);
        }

        const currentTime = Date.now();
        let delay = ONE_FRAME_TIME + last_time - currentTime;

        if (delay < 0)
        {
            delay = 0;
        }

        last_time = currentTime;

        return setTimeout(() =>
        {
            last_time = Date.now();
            callback(performance.now());
        }, delay);
    };
}

if (!window.cancelAnimationFrame)
{
    window.cancelAnimationFrame = (id) => clearTimeout(id);
}
