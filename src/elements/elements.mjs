class Fragments {
    static fromHtml(...html) {
        const el = document.createElement('div');
        el.innerHTML = html.join("");
        const fragment = new DocumentFragment();
        Array.from(el.childNodes).forEach(node => {
            fragment.appendChild(node);
        });
        return fragment;
    }    
    static toHtml(fragment) {
        var r = document.createElement("root");
        r.appendChild(fragment);
        return r.innerHTML;
    }
    static from(...nodes) {
        const fragment = new DocumentFragment();
        for (let i = 0; i !== nodes.length; ++i) {
            fragment.appendChild(nodes[i]);
        }
        return fragment;
    }
    static fromChildNodes(el) {
        const nodes = Array.from(el.childNodes);
        const fragment = new DocumentFragment();
        for (let i = 0; i !== nodes.length; ++i) {
            fragment.appendChild(nodes[i]);
        }
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

const Templated = (SuperClass, template) => {
    return class extends SuperClass {
        rendered_;
        get rendered() {
            return rendered_;
        }
        async connectedCallback() {
            if (this.rendered_) {
                return;
            }
            const slotted = Slots.from(this);
            const fragment = await Promise.resolve(this.render(slotted, template));
            this.innerHTML = '';
            if (fragment) {
                this.appendChild(fragment);
            }
            this.rendered_ = true;
        }
    };
}

const Stateful = (SuperClass, flags, others) => {

    const all = [].concat(flags).concat(others || []);

    return class extends SuperClass {
        static get observedAttributes() {
            return all;
        }
        constructor(...args) {
            super(...args);
            this.internals_ = this.internals_ || this.attachInternals();
            for (const flag of flags) {
                Object.defineProperty(this, flag, {
                    get() {
                        return this.hasAttribute(flag);
                    },
                    set(value) {
                        //see https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet#using_double_dash_prefixed_idents
                        if (Attributes.asBoolean(value)) {
                            this.internals_.states.add(`--${flag}`);
                            this.setAttribute(flag, '');
                            return;
                        }
                        this.internals_.states.delete(`--${flag}`);
                        this.removeAttribute(flag);
                    }
                });
            }
        }
        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) {
                return;
            }
            this[name] = newValue;
            const method = this[`on${name.charAt(0).toUpperCase()}${name.substr(1).toLowerCase()}Changed`];
            method?.call(this, newValue, oldValue);
        }
    };
}

export { Fragments, Attributes, Slots, Templated, Stateful };
