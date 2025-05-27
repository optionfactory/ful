class AsyncEvents {
    static async fireAsync(el, evt) {
        el.dispatchEvent(evt);
        return await evt.async?.promise;
    }
    /**
     * 
     * @param {*} el 
     * @param {*} type 
     * @param {*} fn returning the result
     * @param {*} options 
     * @returns 
     */
    static asyncOn(el, type, fn, options) {
        const listener = async (event) => {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            event.async = { promise };
            try {
                //@ts-ignore
                resolve(await fn(event));
            } catch (e) {
                //@ts-ignore
                reject(e);
            }
        };
        el.addEventListener(type, listener, options);
        return listener;
    }
    /**
     * 
     * @param {*} el 
     * @param {*} type 
     * @param {*} listener the listener returned by asyncOn
     * @param {*} options 
     */ 
    static asyncOff(el, type, listener, options) {
        el.removeEventListener(type, listener, options);
    }
    static mixInto(...classes) {
        for (const k of classes) {
            Object.assign(k.prototype, {
                async fireAsync(evt) {
                    return await AsyncEvents.fireAsync(this, evt);
                },
                asyncOn(type, fn, options) {
                    return AsyncEvents.asyncOn(this, type, fn, options);
                },
                asyncOff(type, listener, options) {
                    return AsyncEvents.asyncOff(this, type, listener, options);
                }
            });
        }
    }
}

export { AsyncEvents }