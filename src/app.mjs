class App {
    constructor() {
        this.configurers = [];
        this.initializers = [];
        this.handlers = [];
        this.running = false;
        document.addEventListener("DOMContentLoaded", async () => {
            await Promise.all(this.configurers);
            await Promise.all(this.initializers.map(h => Promise.resolve(h())));
            await Promise.all(this.handlers.map(h => Promise.resolve(h())));
        });
    }
    configure(cb) {
        this.configurers.push(Promise.resolve(cb()));
        return this;
    }
    initialize(cb) {
        this.initializers.push(cb);
        return this;
    }
    ready(cb) {
        this.handlers.push(cb);
        return this;
    }
}

export { App };
