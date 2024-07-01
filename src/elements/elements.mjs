import { SyncEvent } from "../events.mjs";


class Fragments {
    static fromHtml(...html) {
        const el = document.createElement("div");
        el.innerHTML = html.join("");
        const fragment = new DocumentFragment();
        fragment.append(...el.childNodes);
        return fragment;
    }
    static toHtml(fragment) {
        var r = document.createElement("div");
        r.appendChild(fragment);
        return r.innerHTML;
    }
    static from(...nodes) {
        const fragment = new DocumentFragment();
        fragment.append(...nodes);
        return fragment;
    }
    static fromChildNodes(el) {
        const fragment = new DocumentFragment();
        fragment.append(...el.childNodes);
        return fragment;
    }
}

class Attributes {
    static id = 0;
    static uid(prefix) {
        return `${prefix}-${++Attributes.id}`;
    }
    static asBoolean(value) {
        return value !== null && value !== undefined && value !== false;
    }
    static defaultValue(el, k, v) {
        if (!el.hasAttribute(k)) {
            el.setAttribute(k, v);
        }
        return el.getAttribute(k);
    }
    static forward(prefix, from, to) {
        from.getAttributeNames()
            .filter(a => a.startsWith(prefix))
            .forEach(a => {
                const target = a.substring(prefix.length);
                if (target === 'class') {
                    to.classList.add(...from.getAttribute(prefix + "class").split(" ").filter(a => a.length));
                    return;
                }
                to.setAttribute(target, from.getAttribute(a))
            });
    }
}

class Slots {
    static from(el) {
        const namedSlots = Array.from(el.childNodes)
            .filter(el => el.matches && el.matches('[slot]'))
            .map(el => {
                el.remove();
                const slot = el.getAttribute("slot");
                el.removeAttribute("slot");
                return [slot, el];
            });
        const slotted = Object.fromEntries(namedSlots);
        slotted.default = new DocumentFragment();
        slotted.default.append(...el.childNodes);
        return slotted;
    }
}

class Nodes {
    static isParsed(el) {
        for (var c = el; c; c = c.parentNode) {
            if (c.nextSibling) {
                return true;
            }
        }
        return false;
    }
}

class TemplateRegistry {
    #idToFragment = {};
    #idToTemplate = {};
    #ec;
    put(k, fragment) {
        if (this.#ec) {
            this.#idToTemplate[k] = ftl.Template.fromFragment(fragment, ec);
            return;
        }
        this.#idToFragment[k] = fragment;
    }
    get(k) {
        if (!this.#ec) {
            throw new Error("evaluationContext is not configured");
        }
        const tpl = this.#idToTemplate[k];
        if (!tpl) {
            throw new Error(`missing template: '${k}'`);
        }
        return tpl;
    }
    configure(ec) {
        this.#ec = ec;
        for (const [k, fragment] of Object.entries(this.#idToFragment)) {
            delete this.#idToFragment[k];
            this.#idToTemplate[k] = ftl.Template.fromFragment(fragment, ec);
        }
    }
}

const templates = new TemplateRegistry();

class UpgradeQueue {
    #q = [];
    constructor() {
        document.addEventListener('DOMContentLoaded', this.dequeue.bind(this));
    }
    enqueue(el) {
        if (!this.#q.length) {
            requestAnimationFrame(this.dequeue.bind(this));
        }
        this.#q.push(el);
    }
    dequeue() {
        this.#q.splice(0).forEach(el => el.upgrade());
    }
}

const upgradeQueue = new UpgradeQueue();

const ParsedElement = (flags, others) => {

    const observed_flags = flags || [];
    const observed_others = others || [];    
    const observed = [].concat(observed_flags).concat(observed_others);

    const k = class extends HTMLElement {
        static get observedAttributes() {
            return observed;
        }
        #parsed;
        #internals;
        constructor(...args) {
            super(...args);
            this.#internals = this.attachInternals();
        }
        get internals() {
            return this.#internals;
        }
        connectedCallback() {
            if (this.#parsed) {
                return;
            }
            if (this.ownerDocument.readyState === 'complete' || Nodes.isParsed(this)) {
                upgradeQueue.enqueue(this);
                return;
            }
            this.ownerDocument.addEventListener('DOMContentLoaded', () => {
                observer.disconnect();
                upgradeQueue.enqueue(this);
            });
            const observer = new MutationObserver(() => {
                if (!Nodes.isParsed(this)) {
                    return;
                }
                observer.disconnect();
                upgradeQueue.enqueue(this);
            });
            observer.observe(this.parentNode, { childList: true, subtree: true });
        }
        attributeChangedCallback(name, oldValue, newValue) {
            if (!this.#parsed || oldValue === newValue) {
                return;
            }
            this[name] = newValue;
        }
        async upgrade() {
            if (this.#parsed) {
                return;
            }
            this.#parsed = true;
            await this.render();
            for (const flag of observed_flags) {
                if(this.hasAttribute(flag)){
                    this[flag] = true;
                }
            }
            for (const other of observed_others) {
                if(this.hasAttribute(other)){
                    this[other] = this.getAttribute(other);
                }
            }
        }        
    };

    for (const flag of observed_flags) {
        Object.defineProperty(k.prototype, flag, {
            enumerable: true,
            configurable: true,
            get() {
                return this.internals.states.has(`--${flag}`);
            },
            set(value) {
                //see https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet#using_double_dash_prefixed_idents
                if (Attributes.asBoolean(value)) {
                    this.internals.states.add(`--${flag}`);
                    return;
                }
                this.internals.states.delete(`--${flag}`);
            }
        });
    }

    return k;
}

export { Fragments, Attributes, Slots, Nodes, TemplateRegistry, templates, ParsedElement };
