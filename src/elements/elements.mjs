import { Template } from "@optionfactory/ftl"
import { Nodes, LightSlots } from "./dom.mjs";

class ElementsRegistry {
    #tagToclass = {};
    #idToTemplate = {};
    #configured = false;
    #id = 0;
    #modules;
    #data;    
    defineTemplate(html) {
        if (html === null || html === undefined) {
            return undefined;
        }
        const name = `unnamed-${++this.#id}`;
        this.#idToTemplate[name] = Template.fromHtml(html);
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
        this.#modules = modules;
        this.#data = data;
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
        if (!this.#data) {
            throw new Error("TemplatesRegistry is not configured");
        }
        const tpl = this.#idToTemplate[k];
        if (!tpl) {
            throw new Error(`missing template: '${k}'`);
        }
        return tpl.withData(this.#data).withModules(this.#modules);        
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
    'bool': attr => attr === 'true',
    'json': attr => attr === null ? null : JSON.parse(attr)
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
        #parsed = false;
        #reflecting = false;
        constructor() {
            super();
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
            const parent = /** @type {Node} */ (this.parentNode);
            observer.observe(parent, { childList: true, subtree: true });
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
            // @ts-ignore
            await this.render({
                slots: slots ? LightSlots.from(this) : undefined,
                observed: Object.fromEntries(attrsAndMappers.map(([attribute,mapper]) => [attribute, mapper(this.getAttribute(attribute))])),
            });

            for (const [attr, mapper] of attrsAndMappers) {
                if (this.hasAttribute(attr)) {
                    this[attr] = mapper(this.getAttribute(attr));
                }
            }
        }
    };
    return k;
}

export { ElementsRegistry, elements, ParsedElement };
