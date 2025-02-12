import { Template } from "@optionfactory/ftl"

class Fragments {
    /**
     * 
     * @param  {...string} html 
     * @returns 
     */
    static fromHtml(...html) {
        const el = document.createElement("template");
        el.innerHTML = html.join("");
        return document.adoptNode(el.content);
    }
    /**
     * 
     * @param {DocumentFragment} fragment 
     * @returns 
     */
    static toHtml(fragment) {
        var el = document.createElement("template");
        el.content.appendChild(fragment);
        return el.innerHTML;
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
                    const classes = from.getAttribute(prefix + "class")?.split(" ").filter(a => a.length) ?? [];
                    to.classList.add(...classes);
                    return;
                }
                // @ts-ignore
                to.setAttribute(target, from.getAttribute(a));
            });
    }
    /**
     * 
     * @param {HTMLElement} el 
     * @param {string} attr 
     * @param {boolean} value 
     */
    static toggle(el, attr, value) {
        if (value) {
            el.setAttribute(attr, '');
        } else {
            el.removeAttribute(attr);
        }
    }
    static flip(el, attr) {
        if (el.hasAttribute(attr)) {
            el.removeAttribute(attr);
        } else {
            el.setAttribute(attr, '');
        }
    }

}

class LightSlots {
    /**
     * 
     * @param {HTMLElement} el 
     * @returns the slots
     */
    static from(el) {
        /** @type [string, Element][] */
        const namedSlots = Array.from(el.children)
            .filter(el => el.matches('[slot]'))
            .map(el => {
                el.remove();
                const slot = el.getAttribute("slot");
                el.removeAttribute("slot");
                return [slot ?? 'unnamed', el];
            });
        const slots = {};
        slots.default = new DocumentFragment();
        slots.default.append(...el.childNodes);
        for (const [name, el] of namedSlots) {
            if (!(name in slots)) {
                slots[name] = new DocumentFragment();
            }
            slots[name].append(el);
        }
        return slots;
    }
}

class Nodes {
    static isParsed(el) {
        for (let c = el; c; c = c.parentNode) {
            if (c.nextSibling) {
                return true;
            }
        }
        return false;
    }
    static queryChildren(node, selector) {
        for (const c of node.children) {
            if (c.matches(selector)) {
                return c;
            }
        }
        return null;
    }
    static queryChildrenAll(node, selector) {
        const r = [];
        for (const c of node.children) {
            if (c.matches(selector)) {
                r.push(c);
            }
        }
        return r;
    }
}

class TemplatesRegistry {
    #idToTemplate = {};
    #modules;
    #data;
    put(k, fragment) {
        this.#idToTemplate[k] = Template.fromFragment(fragment);
    }
    get(k) {
        if (!this.#data) {
            throw new Error("TemplatesRegistry is not configured");
        }
        const tpl = this.#idToTemplate[k];
        if (!tpl) {
            throw new Error(`missing template: '${k}'`);
        }
        return tpl.withData(this.#data).withModules(this.#modules);
    }
    configure(modules, ...data) {
        this.#modules = modules;
        this.#data = data;
    }
}


class ElementsRegistry {
    #templates;
    #tagToclass;
    #configured;
    #id = 0;
    constructor() {
        this.#templates = new TemplatesRegistry();
        this.#tagToclass = {};
    }
    defineTemplate(html) {
        if (html === null || html === undefined) {
            return undefined;
        }
        const name = `unnamed-${++this.#id}`;
        this.#templates.put(name, Fragments.fromHtml(html));
        return name;
    }
    define(tag, klass) {
        if (!this.#configured) {
            this.#tagToclass[tag] = klass;
            return this;
        }
        customElements.define(tag, klass);
        return this;
    }
    configure(modules, ...data) {
        this.#templates.configure(modules, ...data);
        for (const [tag, klass] of Object.entries(this.#tagToclass)) {
            customElements.define(tag, klass);
            delete this.#tagToclass[tag];
        }
        this.#configured = true;
    }
    template(k) {
        if (k === null || k === undefined) {
            return undefined;
        }
        return this.#templates.get(k);
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

const mappers = {
    'string': attr => attr,
    'number': attr => attr === null ? null : Number(attr),
    'presence': attr => attr !== null,
    'state': attr => attr !== null,
    'bool': attr => attr === 'true',
    'json': attr => JSON.parse(attr)
};

const ParsedElement = (conf) => {
    const { observed, template, templates, slots } = conf ?? {};

    const attrsAndTypes = (observed ?? []).map(a => {
        const [attr, maybeType] = a.split(":");
        const type = maybeType?.trim() ?? 'string';
        if (!(type in mappers)) {
            throw new Error(`unsupported attribute type: ${type}`);
        }
        return [attr.trim(), type];
    });

    const attrsAndMappers = attrsAndTypes.map(([attr, type]) => [attr, mappers[type]]);
    const attrToMapper = Object.fromEntries(attrsAndMappers);

    const templateNamesAndIds = Object.entries(Object.assign({}, templates, {default: template}) ?? {}).map(([k, v]) => [k, elements.defineTemplate(v)]);
    const templateNameToId = Object.fromEntries(templateNamesAndIds);

    const k = class extends HTMLElement {
        static get observedAttributes() {
            return Object.keys(attrToMapper);
        }
        #parsed;
        #reflecting;
        #internals;
        constructor() {
            super();
            this.#internals = this.attachInternals();
        }
        get internals() {
            return this.#internals;
        }
        template(name){
            return elements.template(templateNameToId[name ?? 'default']);
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
            // @ts-ignore
            observer.observe(this.parentNode, { childList: true, subtree: true });
        }
        attributeChangedCallback(attr, oldValue, newValue) {
            if (!this.#parsed || oldValue === newValue) {
                return;
            }
            if (this.#reflecting) {
                return;
            }
            const mapper = attrToMapper[attr];
            this[attr] = mapper(newValue);
        }
        reflect(fn) {
            this.#reflecting = true;
            try {
                fn();
            } finally {
                this.#reflecting = false;
            }
        }
        async upgrade() {
            if (this.#parsed) {
                return;
            }
            this.#parsed = true;

            const ovalues = attrsAndMappers.map(([attribute,mapper]) => [attribute, mapper(this.getAttribute(attribute))]);

            // @ts-ignore
            await this.render({
                slots: slots ? LightSlots.from(this) : undefined,
                observed: Object.fromEntries(ovalues),
            });

            for (const [attr, mapper] of attrsAndMappers) {
                if (this.hasAttribute(attr)) {
                    this[attr] = mapper(this.getAttribute(attr));
                }
            }
        }
    };

    for (const [attr, type] of attrsAndTypes.filter(([a, t]) => t === 'state')) {
        Object.defineProperty(k.prototype, attr, {
            enumerable: true,
            configurable: true,
            get() {
                return this.internals.states ? this.internals.states.has(`--${attr}`) : this.hasAttribute(attr);
            },
            set(value) {
                this.internals.states?.[value ? 'add' : 'delete'](`--${attr}`);
                this.reflect(() => Attributes.toggle(this, attr, value));
            }
        });
    }

    return k;
}

export { Fragments, Attributes, LightSlots, Nodes, TemplatesRegistry, ElementsRegistry, elements, ParsedElement };
