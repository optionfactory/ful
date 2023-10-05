
class Observable {
    constructor() {
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
    static mixin(self) {
        self.listeners = {}
        self.fireSync = Observable.prototype.fireSync;
        self.fire = Observable.prototype.fire;
        self.on = Observable.prototype.on;
        self.un = Observable.prototype.un;
    }

}


export { Observable };