

// SyncEvent.on($0, 'asd', async e => { await ful.timing.sleep(10_000); return 3; })
// const success = await new SyncEvent("asd").dispatchTo($0);
class SyncEvent extends CustomEvent {
    #promises;
    #results;
    constructor(type, options) {
        super(type, {...options, cancelable: true});
        this.#promises = [];
        this.#results = [];
    }
    get results(){
        return this.#results;
    }

    async dispatchTo(el) {
        // unlike "native" events, which are fired by the browser and invoke 
        // event handlers asynchronously via the event loop, dispatchEvent() 
        // invokes event handlers synchronously. 
        // see: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
        el.dispatchEvent(this);
        //we ignore the result of dispatchEvent and use defaultPrevented instead
        //because handlers can be async
        this.#results = await Promise.all(this.#promises);
        return !this.defaultPrevented;
    }

    static on(el, type, h, useCapture) {
        el.addEventListener(type, e => {
            //e *must* be an async event
            e.#promises.push(h(e));
        }, useCapture);
    }
}


export { SyncEvent }
