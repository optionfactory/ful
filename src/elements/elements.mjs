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

class ParsedElement extends HTMLElement {
    #parsed;
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
    upgrade() {
        if (this.#parsed) {
            return;
        }
        this.#parsed = true;
        return this.render();
    }
}

const Stateful = (SuperClass, flags, others) => {

    const all = [].concat(flags).concat(others || []);

    const k = class extends SuperClass {
        static get observedAttributes() {
            return all;
        }
        constructor(...args) {
            super(...args);
            this.internals_ = this.internals_ || this.attachInternals();
        }
    };

    for (const flag of flags) {
        Object.defineProperty(k.prototype, flag, {
            enumerable: true,
            configurable: true,
            get() {
                return this.internals_.states.has(`--${flag}`);
            },
            set(value) {
                //see https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet#using_double_dash_prefixed_idents
                if (Attributes.asBoolean(value)) {
                    this.internals_.states.add(`--${flag}`);
                    return;
                }
                this.internals_.states.delete(`--${flag}`);
            }
        });
    }

    return k;
}

export { Fragments, Attributes, Slots, Nodes, ParsedElement, Stateful };
