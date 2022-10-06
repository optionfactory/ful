
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

class VersionedStorage {
    constructor(storage, key, dataSupplier){
        this.storage = storage;
        this.key = key;
        this.dataSupplier = dataSupplier;
        this.cache = null;
        
    }
    async load(revision){
        const saved = this.storage.load(this.key);
        if (!!saved && saved.revision === revision) {
            this.cache = saved.value;
            return;
        }
        const freshData = await this.dataSupplier(revision, this.key);
        this.storage.save(this.key, {
            revision: revision,
            value: freshData
        });
        this.cache = freshData;
    }
    data(){
        return this.cache;
    }
}



export {LocalStorage, SessionStorage, VersionedStorage};