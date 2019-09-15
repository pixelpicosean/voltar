function _noop() { }

/**
 * Iterates an array in series.
 *
 * @param {Array<any>} array - Array to iterate.
 * @param {Function} iterator - Function to call for each element.
 * @param {Function} callback - Function to call when done, or on error.
 * @param {boolean} [defer_next=false] - Break synchronous each loop by calling next with a setTimeout of 1.
 */
export function each_series(array, iterator, callback, defer_next) {
    let i = 0;
    const len = array.length;

    (function next(err) {
        if (err || i === len) {
            if (callback) {
                callback(err);
            }

            return;
        }

        if (defer_next) {
            setTimeout(() => {
                iterator(array[i++], next);
            }, 1);
        } else {
            iterator(array[i++], next);
        }
    })();
}

/**
 * Ensures a function is only called once.
 *
 * @param {Function} fn - The function to wrap.
 * @return {Function} The wrapping function.
 */
function only_once(fn) {
    return function onceWrapper() {
        if (fn === null) {
            throw new Error('Callback was already called.');
        }

        const callFn = fn;

        fn = null;
        callFn.apply(this, arguments);
    };
}

/**
 * @typedef QueueObject
 * @property {Array} _tasks
 * @property {number} concurrency
 * @property {() => void} saturated
 * @property {() => void} unsaturated
 * @property {number} buffer
 * @property {() => void} empty
 * @property {() => void} drain
 * @property {(err: string, data: any) => void} error
 * @property {boolean} started
 * @property {boolean} paused
 * @property {(data: any, callback?: Function) => void} push
 * @property {() => void} kill
 * @property {(data: any, callback: Function) => void} unshift
 * @property {() => void} process
 * @property {() => number} length
 * @property {() => number} running
 * @property {() => boolean} idle
 * @property {() => void} pause
 * @property {() => void} resume
 */

/**
 * Async queue implementation,
 *
 * @param {Function} worker - The worker function to call for each task.
 * @param {number} [concurrency=1] - How many workers to run in parrallel.
 */
export function queue(worker, concurrency = 1) {
    if (concurrency === 0) {
        throw new Error('Concurrency must not be zero');
    }

    let workers = 0;
    /** @type {QueueObject} */
    const q = {
        _tasks: [],
        concurrency,
        saturated: _noop,
        unsaturated: _noop,
        buffer: concurrency / 4,
        empty: _noop,
        drain: _noop,
        error: _noop,
        started: false,
        paused: false,
        push(data, callback) {
            _insert(data, false, callback);
        },
        kill() {
            workers = 0;
            q.drain = _noop;
            q.started = false;
            q._tasks = [];
        },
        unshift(data, callback) {
            _insert(data, true, callback);
        },
        process() {
            while (!q.paused && workers < q.concurrency && q._tasks.length) {
                const task = q._tasks.shift();

                if (q._tasks.length === 0) {
                    q.empty();
                }

                workers += 1;

                if (workers === q.concurrency) {
                    q.saturated();
                }

                worker(task.data, only_once(_next(task)));
            }
        },
        length() {
            return q._tasks.length;
        },
        running() {
            return workers;
        },
        idle() {
            return q._tasks.length + workers === 0;
        },
        pause() {
            if (q.paused === true) {
                return;
            }

            q.paused = true;
        },
        resume() {
            if (q.paused === false) {
                return;
            }

            q.paused = false;

            // Need to call q.process once per concurrent
            // worker to preserve full concurrency after pause
            for (let w = 1; w <= q.concurrency; w++) {
                q.process();
            }
        },
    };

    /**
     * @param {any} data
     * @param {boolean} insert_at_front
     * @param {Function} callback
     */
    function _insert(data, insert_at_front, callback) {
        if (callback && typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }

        q.started = true;

        if (data == null && q.idle()) { // eslint-disable-line no-eq-null,eqeqeq
            // call drain immediately if there are no tasks
            setTimeout(() => q.drain(), 1);

            return;
        }

        const item = {
            data,
            callback: callback || _noop,
        };

        if (insert_at_front) {
            q._tasks.unshift(item);
        } else {
            q._tasks.push(item);
        }

        setTimeout(() => q.process(), 1);
    }

    /**
     * @param {any} task
     */
    function _next(task) {
        return function next() {
            workers -= 1;

            task.callback.apply(task, arguments);

            if (arguments[0] != null) {
                q.error(arguments[0], task.data);
            }

            if (workers <= (q.concurrency - q.buffer)) {
                q.unsaturated();
            }

            if (q.idle()) {
                q.drain();
            }

            q.process();
        };
    }

    return q;
}
