const timing = {
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    DEBOUNCE_DEFAULT: 0,
    DEBOUNCE_IMMEDIATE: 1,
    /**
     * Executes only after a period of inactivity (pause in events).
     * Delays execution until events stop for a set duration.
     * Consolidates multiple rapid events into a single execution.
     * Respond to the "end" of a series of events.
     * @param {*} timeoutMs 
     * @param {*} func 
     * @param {*} options 
     * @returns {[function, function]}
     */
    debounce(timeoutMs, func, options) {
        const opts = options ?? timing.DEBOUNCE_DEFAULT;
        let tid = null;
        let args = [];
        let previousTimestamp = 0;

        const later = () => {
            const elapsed = new Date().getTime() - previousTimestamp;
            if (timeoutMs > elapsed) {
                tid = setTimeout(later, timeoutMs - elapsed);
                return;
            }
            tid = null;
            if (opts !== timing.DEBOUNCE_IMMEDIATE) {
                func(...args);
            }
            // This check is needed because `func` can recursively invoke `debounced`.
            if (tid === null) {
                args = [];
            }
        };

        const debounced = function () {
            args = [...arguments];
            previousTimestamp = new Date().getTime();
            if (tid === null) {
                tid = setTimeout(later, timeoutMs);
                if (opts === timing.DEBOUNCE_IMMEDIATE) {
                    func(...args);
                }
            }
        };
        const abort = () => clearTimeout(tid);
        return [debounced, abort];
    },
    THROTTLE_DEFAULT: 0,
    THROTTLE_NO_LEADING: 1,
    THROTTLE_NO_TRAILING: 2,
    /**
     * Executes at most once per specified time interval, regardless of ongoing events.
     * Executes regularly as long as events are firing, but at a controlled rate.
     * Allows execution periodically during a burst of events.
     * Ensure a function doesn't fire too frequently during continuous events.
     */
    throttle(timeoutMs, func, options) {
        const opts = options ?? timing.THROTTLE_DEFAULT;
        let tid = null;
        let args = [];
        let previousTimestamp = 0;

        const later = () => {
            previousTimestamp = (opts & timing.THROTTLE_NO_LEADING) ? 0 : new Date().getTime();
            tid = null;
            func(...args);
            if (tid === null) {
                args = [];
            }
        };
        const throttled = function () {
            const now = new Date().getTime();
            if (!previousTimestamp && (opts & timing.THROTTLE_NO_LEADING)) {
                previousTimestamp = now;
            }
            const remaining = timeoutMs - (now - previousTimestamp);
            args = [...arguments];
            if (remaining <= 0 || remaining > timeoutMs) {
                if (tid !== null) {
                    clearTimeout(tid);
                    tid = null;
                }
                previousTimestamp = now;
                func(...args);
                if (tid === null) {
                    args = [];
                }
            } else if (tid === null && !(opts & timing.THROTTLE_NO_TRAILING)) {
                tid = setTimeout(later, remaining);
            }
        };
        const abort = () => clearTimeout(tid);
        return [throttled, abort];
    }
};


export { timing };