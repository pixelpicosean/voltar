// References:
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// https://gist.github.com/1579671
// http://updates.html5rocks.com/2012/05/requestAnimationFrame-API-now-with-sub-millisecond-precision
// https://gist.github.com/timhall/4078614
// https://github.com/Financial-Times/polyfill-service/tree/master/polyfills/requestAnimationFrame

var ONE_FRAME_TIME = 16;

// Date.now
if (!(Date.now && Date.prototype.getTime)) {
    Date.now = function now() {
        return new Date().getTime();
    };
}

// performance.now
if (!(window.performance && window.performance.now)) {
    var startTime = Date.now();

    if (!window.performance) {
        window.performance = {};
    }

    window.performance.now = function () {
        return Date.now() - startTime;
    };
}

// requestAnimationFrame
var last_time = Date.now();
var vendors = ['ms', 'moz', 'webkit', 'o'];

for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    var p = vendors[x];

    window.requestAnimationFrame = window[p + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[p + 'CancelAnimationFrame'] || window[p + 'CancelRequestAnimationFrame'];
}

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }

        var currentTime = Date.now();
        var delay = ONE_FRAME_TIME + last_time - currentTime;

        if (delay < 0) {
            delay = 0;
        }

        last_time = currentTime;

        return setTimeout(function () {
            last_time = Date.now();
            callback(performance.now());
        }, delay);
    };
}

if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id) {
        clearTimeout(id);
    };
}
