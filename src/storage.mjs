
class Storage {
    prefix;
    type;
    constructor(prefix, storage) {
        this.prefix = prefix;
        this.storage = storage;
    }
    save(k, v) {
        this.storage.setItem(`${this.prefix}-${k}`, JSON.stringify(v));
    }
    load(k) {
        const got = this.storage.getItem(`${this.prefix}-${k}`);
        return got === undefined ? undefined : JSON.parse(got);
    }
    remove(k) {
        this.storage.removeItem(`${this.prefix}-${k}`);
    }
    pop(k) {
        const decoded = this.access(k);
        this.remove(k);
        return decoded;
    }
}

class LocalStorage extends Storage {
    constructor(prefix) {
        super(prefix, localStorage);
    }
}

class SessionStorage extends Storage {
    constructor(prefix) {
        super(prefix, sessionStorage);
    }
}


export {LocalStorage, SessionStorage};