

// SyncEvent.on($0, 'asd', async e => { await ful.timing.sleep(10_000); return 3; })
// const [success, results] = await new SyncEvent("asd").dispatchTo($0);
class SyncEvent extends CustomEvent {
    #results;
    constructor(type, options) {
        super(type, options);
        this.#results = [];
    }

    async dispatchTo(el) {
        // unlike "native" events, which are fired by the browser and invoke 
        // event handlers asynchronously via the event loop, dispatchEvent() 
        // invokes event handlers synchronously. 
        // see: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
        const success = el.dispatchEvent(this);
        const results = await Promise.all(this.#results);
        return [success, results];
    }

    static on(el, type, h, useCapture) {
        el.addEventListener(type, e => {
            //e *must* be an async event
            e.#results.push(h(e));
        }, useCapture);
    }
}


export { SyncEvent }
