import { SyncEvent } from "../events.mjs";


class Fragments {
    /**
     * 
     * @param  {...string} html 
     * @returns 
     */
    static fromHtml(...html) {
        const el = document.createElement("div");
        el.innerHTML = html.join("");
        const fragment = new DocumentFragment();
        fragment.append(...el.childNodes);
        return fragment;
    }
    /**
     * 
     * @param {DocumentFragment} fragment 
     * @returns 
     */
    static toHtml(fragment) {
        var r = document.createElement("div");
        r.appendChild(fragment);
        return r.innerHTML;
    }
    /**
     * 
     * @param  {...Node} nodes 
     * @returns 
     */
    static from(...nodes) {
        const fragment = new DocumentFragment();
        fragment.append(...nodes);
        return fragment;
    }
    /**
     * 
     * @param {HTMLElement} el 
     * @returns 
     */
    static fromChildNodes(el) {
        const fragment = new DocumentFragment();
        fragment.append(...el.childNodes);
        return fragment;
    }
}

class Attributes {
    static id = 0;
    /**
     * 
     * @param {string} prefix 
     * @returns 
     */
    static uid(prefix) {
        return `${prefix}-${++Attributes.id}`;
    }
    /**
     * 
     * @param {any} value 
     * @returns 
     */
    static asBoolean(value) {
        return value !== null && value !== undefined && value !== false;
    }
    /**
     * 
     * @param {HTMLElement} el 
     * @param {string} k 
     * @param {string} v 
     * @returns 
     */
    static defaultValue(el, k, v) {
        if (!el.hasAttribute(k)) {
            el.setAttribute(k, v);
        }
        return el.getAttribute(k);
    }
    /**
     * 
     * @param {string} prefix 
     * @param {HTMLElement} from 
     * @param {HTMLElement} to 
     */
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

class LightSlots {
    /**
     * 
     * @param {HTMLElement} el 
     * @returns the slots
     */
    static from(el) {
        const namedSlots = Array.from(el.childNodes)
            .filter(el => el.matches && el.matches('[slot]'))
            .map(el => {
                el.remove();
                const slot = el.getAttribute("slot");
                el.removeAttribute("slot");
                return [slot, el];
            });
        const slots = Object.fromEntries(namedSlots);
        slots.default = new DocumentFragment();
        slots.default.append(...el.childNodes);
        return slots;
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

class TemplatesRegistry {
    #idToFragment = {};
    #idToTemplate = {};
    #ec;
    put(k, fragment) {
        if (this.#ec) {
            this.#idToTemplate[k] = Template.fromFragment(fragment, ec);
            return;
        }
        this.#idToFragment[k] = fragment;
    }
    get(k) {
        if (!this.#ec) {
            throw new Error("TemplatesRegistry is not configured");
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


class ElementsRegistry {
    #templates;
    #tagToclass;
    #configured;
    #id = 0;
    constructor(){
        this.#templates = new TemplatesRegistry();
        this.#tagToclass = {};
    }
    defineTemplate(html){
        if(html === null || html === undefined){
            return undefined;
        }
        const name = `unnamed-${++this.#id}`;
        this.#templates.put(name, Fragments.fromHtml(html));
        return name;
    }
    template(k){
        if(k === null || k === undefined){
            return undefined;
        }
        return this.#templates.get(k);
    }
    define(tag, klass){
        if(!this.#configured){
            this.#tagToclass[tag] = klass;
            return this;
        }
        customElements.define(tag, klass);        
        return this;
    }
    configure(ec) {
        this.#templates.configure(ec);
        for(const [tag, klass] of Object.entries(this.#tagToclass)) {
            customElements.define(tag, klass);            
            delete this.#tagToclass[tag];
        }
        this.#configured = true;
    }
}

const elements = new ElementsRegistry();


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

const ParsedElement = (conf) => {
    const {states, attributes, template, slots} = conf || {};

    const observed_states = states || [];
    const observed_attributes = attributes || [];
    const observed = [].concat(observed_states).concat(observed_attributes);

    const templateId = elements.defineTemplate(template);

    const k = class extends HTMLElement {
        static get observedAttributes() {
            return observed;
        }
        #parsed;
        #initialized;
        #internals;
        constructor(...args) {
            super(...args);
            this.#internals = this.attachInternals();
        }
        get initialized(){
            return this.#initialized;
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
            await this.render(elements.template(templateId), slots ? LightSlots.from(this) : undefined);
            for (const flag of observed_states) {
                if (this.hasAttribute(flag)) {
                    this[flag] = true;
                }
            }
            for (const other of observed_attributes) {
                if (this.hasAttribute(other)) {
                    this[other] = this.getAttribute(other);
                }
            }
            this.#initialized = true;
        }
    };

    for (const state of observed_states) {
        Object.defineProperty(k.prototype, state, {
            enumerable: true,
            configurable: true,
            get() {
                return this.internals.states.has(`--${state}`);
            },
            set(value) {
                const v = Attributes.asBoolean(value);
                const et = this.initialized ? 'changed' : 'init';
                const event = new SyncEvent(`${state}:${et}`, {
                    detail: { 
                        target: this,
                        value: v 
                    }
                });
                (async () => {
                    const [success, results] = await event.dispatchTo(this);
                    if (!success) {
                        return;
                    }
                    //see https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet#using_double_dash_prefixed_idents
                    this.internals.states[v ? 'add' : 'delete'](`--${state}`);
                })();
            }
        });
    }

    return k;
}

export { Fragments, Attributes, LightSlots, Nodes, TemplatesRegistry, ElementsRegistry, elements, ParsedElement };
