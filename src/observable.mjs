
const Observable = (SuperClass) => class extends SuperClass {
    constructor(...args) {
        super(...args)
        this.listeners = {};
    }
    fireSync(event, data, initialAcc) {
        const listeners = this.listeners[event] || [];
        let acc = initialAcc;
        for (const l of listeners) {
            acc = l(data, this, acc);
        }
        return acc;
    }
    async fire(event, data, initialAcc) {
        const listeners = this.listeners[event] || [];
        let acc = initialAcc;
        for (const l of listeners) {
            acc = await l(data, this, acc);
        }
        return acc;
    }
    on(event, listener) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(listener);
    }
    un(event, listener) {
        const listeners = this.listeners[event] || [];
        const idx = listeners.indexOf(listener);
        return idx === -1 ? [] : listeners.splice(idx, 1);
    }    
}


export { Observable };