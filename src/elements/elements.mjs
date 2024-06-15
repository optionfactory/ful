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
                    to.classList.add(...from.getAttribute("class").split(" ").filter(a => a.length));
                    return;
                }
                to.setAttribute(target, from.getAttribute(a))
            });
    }
}

class Slots {
    static from(el) {
        const slotted = Object.fromEntries(Array.from(el.querySelectorAll("[slot]")).map(el => {
            el.parentElement.removeChild(el);
            const slot = el.getAttribute("slot");
            el.removeAttribute("slot");
            return [slot, el];
        }));
        slotted.default = new DocumentFragment();
        slotted.default.append(...el.childNodes);
        return slotted;
    }

}

const Templated = (SuperClass, template) => {
    return class extends SuperClass {
        #rendered;
        async connectedCallback() {
            if (this.#rendered) {
                return;
            }
            const slotted = Slots.from(this);
            const fragment = await Promise.resolve(this.render(slotted, template));
            this.innerHTML = '';
            if (fragment) {
                this.appendChild(fragment);
            }
            this.#rendered = true;
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

class CustomElements {

    static labelAndInputGroup(id, name, isFloating, slotted) {
        if (isFloating) {
            /**
             * <div class="input-group has-validation">
             *   <span data-tpl-if="slotted.before" class="input-group-text">{{{{ slotted.before }}}}</span>
             *   <div class="form-floating">
             *       {{{{ slotted.input }}}} 
             *       <label data-tpl-for="name" class="form-label">{{{{ slotted.default }}}}</label>
             *   </div>
             *   <span data-tpl-if="slotted.after" class="input-group-text">{{{{ slotted.after }}}}</span>
             *   <ful-field-error data-tpl-field="name"></ful-field-error>                                 
             * </div>    
             */
            const label = document.createElement("label");
            label.setAttribute("for", id);
            label.classList.add('form-label');
            label.append(slotted.default);

            const ff = document.createElement('div');
            ff.classList.add("form-floating");
            ff.append(slotted.input, label);

            const ffe = document.createElement('ful-field-error');
            ffe.setAttribute("field", name);

            const ig = document.createElement("div");
            ig.classList.add('input-group', 'has-validtion');

            if (slotted.before) {
                ig.append(slotted.before);
            } else if (slotted.ibefore) {
                const igt = document.createElement('div');
                igt.classList.add('input-group-text')
                igt.append(slotted.ibefore)
                ig.append(igt);
            }
            ig.append(ff);
            if (slotted.after) {
                ig.append(slotted.after);
            } else if (slotted.iafter) {
                const igt = document.createElement('div');
                igt.classList.add('input-group-text')
                igt.append(slotted.iafter)
                ig.append(igt);
            }
            ig.append(ffe);
            return ig;
        }
        /**
                <label data-tpl-for="name" class="form-label">{{{{ slotted.default }}}}</label>
                <div class="input-group has-validation">
                    <span data-tpl-if="slotted.before" class="input-group-text">{{{{ slotted.before }}}}</span>
                    {{{{ slotted.input }}}} 
                    <span data-tpl-if="slotted.after" class="input-group-text">{{{{ slotted.after }}}}</span>
                    <ful-field-error data-tpl-field="name"></ful-field-error>            
                </div>     
         */

        const label = document.createElement("label");
        label.setAttribute("for", name);
        label.classList.add('form-label');
        label.append(slotted.default);

        const ffe = document.createElement('ful-field-error');
        ffe.setAttribute("field", name);

        const ig = document.createElement("div");
        ig.classList.add('input-group', 'has-validation');

        if (slotted.before) {
            ig.append(slotted.before);
        } else if (slotted.ibefore) {
            const igt = document.createElement('div');
            igt.classList.add('input-group-text')
            igt.append(slotted.ibefore)
            ig.append(igt);
        }
        ig.append(slotted.input);
        if (slotted.after) {
            ig.append(slotted.after);
        } else if (slotted.iafter) {
            const igt = document.createElement('div');
            igt.classList.add('input-group-text')
            igt.append(slotted.iafter)
            ig.append(igt);
        }
        ig.append(ffe);

        const fragment = new DocumentFragment();
        fragment.append(label, ig)
        return fragment;
    }

}


export { Fragments, Attributes, Slots, Templated, Stateful, CustomElements };
