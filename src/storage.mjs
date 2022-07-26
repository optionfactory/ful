
class Storage {
    prefix;
    type;
    constructor(prefix, storage) {
        this.prefix = prefix;
        this.storagte = storage;
    }
    put(k, v) {
        this.storage.setItem(this.prefix + "-" + k, JSON.stringify(v));
    }
    pop(k) {
        const got = this.storage.getItem(this.prefix + "-" + k);
        const decoded = got === undefined ? undefined : JSON.parse(got);
        this.storage.removeItem(k);
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