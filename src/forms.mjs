/* global Infinity, CSS */

import { Failure } from "./http-client.mjs";
import { Observable } from "./observable.mjs";

class CustomElements {
    static id = 0;
    static uid(prefix) {
        return `${prefix}-${++CustomElements.id}`;
    }
    static forwardAttributes(from, to, except) {
        const ans = from.getAttributeNames()
            .filter(a => except.indexOf(a) === -1)
            .filter(a => a[0] === '@')
            .forEach(a => {
                if (a === '@class') {
                    to.classList.add(...from.getAttribute("@class").split(" ").filter(a => a.length));
                    return;
                }
                to.setAttribute(a.substring(1), from.getAttribute(a))
            });
    }
    static extractSlots(el) {
        const slotted = Object.fromEntries([...el.querySelectorAll("[slot]")].map(el => {
            el.parentElement.removeChild(el);
            const slot = el.getAttribute("slot");
            el.removeAttribute("slot");
            return [slot, el];
        }));
        slotted.default = new DocumentFragment();
        slotted.default.append(...el.childNodes);
        return slotted;
    }
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


class FieldError extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.classList.add('invalid-feedback');
    }
    static configure() {
        customElements.define('ful-field-error', FieldError);
    }
}

class Errors extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.classList.add('alert', 'alert-danger', 'd-none');
    }
    static configure() {
        customElements.define('ful-errors', Errors);
    }

}

class Spinner extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.classList.add('spinner-border', 'spinner-border-sm', 'd-none');
        this.setAttribute("aria-hidden", "true");
    }
    show() {
        this.classList.remove("d-none");
    }
    hide() {
        this.classList.add("d-none");
    }
    static configure() {
        customElements.define('ful-spinner', Spinner);
    }
}



class Input extends HTMLElement {
    constructor() {
        super();
        const id = CustomElements.uid('ful-input');
        const name = this.getAttribute('@name');
        const floating = this.hasAttribute('@floating');
        const slotted = CustomElements.extractSlots(this);
        slotted.input = slotted.input || (() => {
            const el = document.createElement("input")
            el.classList.add("form-control");
            return el;
        })();
        CustomElements.forwardAttributes(this, slotted.input, ['@floating'])
        const attrIfMissing = (el, k, v) => !el.hasAttribute(k) && el.setAttribute(k, v);
        attrIfMissing(slotted.input, "name", id);
        attrIfMissing(slotted.input, "id", id);
        attrIfMissing(slotted.input, "type", "text");
        attrIfMissing(slotted.input, "placeholder", " ");
        this.innerHTML = '';
        this.append(CustomElements.labelAndInputGroup(id, name || id, floating, slotted));
    }
    static configure() {
        customElements.define('ful-input', Input);
    }
}



/**
 * <script src="tom-select.complete.js"></script>
 * <link href="tom-select.bootstrap5.css" rel="stylesheet" />
 */
class Select extends HTMLElement {
    constructor(tsConfig) {
        super();
        Observable.init(this);
        const id = CustomElements.uid('ful-select');
        const name = this.getAttribute('@name');
        const floating = this.hasAttribute('@floating');
        const remote = this.hasAttribute('@remote');
        const slotted = CustomElements.extractSlots(this);
        slotted.input = slotted.input || (() => {
            return document.createElement("select");
        })();
        CustomElements.forwardAttributes(this, slotted.input, ['@floating', '@remote'])
        const attrIfMissing = (el, k, v) => !el.hasAttribute(k) && el.setAttribute(k, v);
        attrIfMissing(slotted.input, "name", id);
        attrIfMissing(slotted.input, "id", id);
        attrIfMissing(slotted.input, "placeholder", " ");
        this.innerHTML = '';
        this.append(CustomElements.labelAndInputGroup(id, name || id, floating, slotted));
        this.loaded = !remote;
        this.ts = new TomSelect(slotted.input, Object.assign(remote ? {
            preload: 'focus',
            load: async (query, callback) => {
                if (this.loaded) {
                    callback();
                    return;
                }
                const data = await this.fire('load', query, [])
                this.loaded = true;
                callback(data);        
            } 
        } : {}, tsConfig));
        slotted.input.setValue = this.setValue.bind(this);
        slotted.input.getValue = this.getValue.bind(this);
    }
    async setValue(v){
        if(!this.loaded){
            await this.ts.load();
        }
        this.ts.setValue(v);
    }
    getValue(){
        const v = this.ts.getValue();
        return v === '' ? null : v;
    }
    static custom(tagName, configuration) {
        customElements.define(tagName, class extends Select {
            constructor() {
                super(configuration);
            }
        });
    }
    static configure() {
        return Select.custom('ful-select');
    }

}

Observable.mixin(Select);



class Form extends HTMLElement {
    constructor({ mutators, extractors, valueHoldersSelector, ignoredChildrenSelector }) {
        super();
        Observable.init(this);
        this.mutators = mutators || {}
        this.extractors = extractors || {}
        this.valueHoldersSelector = valueHoldersSelector || '[name]';
        this.ignoredChildrenSelector = ignoredChildrenSelector || '.d-none';

        const form = document.createElement('form');
        form.append(...this.childNodes);
        this.appendChild(form);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.spinner(true);
            try {
                await this.fire('submit', this.getValues(), this);
            } catch (e) {
                if (e instanceof Failure) {
                    this.setErrors(e.problems);
                    return;
                }
                throw e;
            } finally {
                this.spinner(false)
            }
        })
    }
    spinner(spin) {
        this.querySelectorAll('ful-spinner').forEach(el => {
            el[spin ? 'show' : 'hide']();
        })
        this.querySelectorAll('[type=submit],[type=reset]').forEach(el => {
            el.disabled = spin;
        })
    }
    setValues(values) {
        for (let k in values) {
            if (!values.hasOwnProperty(k)) {
                continue;
            }
            Array.from(this.querySelectorAll(`[name='${CSS.escape(k)}']`)).forEach((el) => {
                Form.mutate(this.mutators, el, values[k], k, values);
            });
        }
    }
    getValues() {
        return Array.from(this.querySelectorAll(this.valueHoldersSelector))
            .filter((el) => {
                if (el.dataset['fulBindInclude'] === 'never') {
                    return false;
                }
                return el.dataset['fulBindInclude'] === 'always' || el.closest(this.ignoredChildrenSelector) === null;
            })
            .reduce((result, el) => {
                return Form.providePath(result, el.getAttribute('name'), Form.extract(this.extractors, el));
            }, {});
    }
    setErrors(errors, scroll) {
        this.clearErrors();
        errors
            .filter((e) => e.type === 'FIELD_ERROR' || e.type === 'INVALID_FORMAT')
            .forEach((e) => {
                const name = e.context.replace("[", ".").replace("].", ".");
                this.querySelectorAll(`[name='${CSS.escape(name)}']`)
                    .forEach(input => {
                        input.classList.add('is-invalid')
                        if (input.parentElement.classList.contains("form-floating")) {
                            input.parentElement.classList.add('is-invalid')
                        }
                    });
                this.querySelectorAll(`ful-field-error[field='${CSS.escape(name)}']`)
                    .forEach(el => el.innerText = e.reason);
            });
        this.querySelectorAll("ful-errors")
            .forEach(el => {
                const globalErrors = errors.filter((e) => e.type !== 'FIELD_ERROR' && e.type !== 'INVALID_FORMAT');
                el.innerHTML = globalErrors.map(e => e.reason).join("\n");
                if (globalErrors.length !== 0) {
                    el.classList.remove('d-none');
                }
            })

        if (!scroll) {
            return;
        }
        const ys = Array.from(this.querySelectorAll('ful-field-error:not(.d-none)'))
            .map(el => el.getBoundingClientRect().y + window.scrollY)
        const miny = Math.min(...ys);
        if (miny !== Infinity) {
            window.scroll(window.scrollX, miny > 100 ? miny - 100 : 0);
        }
    }
    clearErrors() {
        this.querySelectorAll('[name].is-invalid, .form-floating.is-invalid')
            .forEach(el => el.classList.remove('is-invalid'));
        this.querySelectorAll("ful-errors")
            .forEach(el => {
                el.innerHTML = '';
                el.classList.add('d-none');
            });
    }
    static extract(extractors, el) {
        const maybeExtractor = extractors[el.dataset['fulBindExtractor']] || extractors[el.dataset['fulBindProvide']];
        if (maybeExtractor) {
            return maybeExtractor(el);
        }
        if (el.getAttribute('type') === 'radio') {
            if (!el.checked) {
                return undefined;
            }
            return el.dataset['fulBindType'] === 'boolean' ? el.value === 'true' : el.value;
        }
        if (el.getAttribute('type') === 'checkbox') {
            return el.checked;
        }
        if (el.dataset['fulBindType'] === 'boolean') {
            return !el.value ? null : el.value === 'true';
        }
        if (el.getValue) {
            return el.getValue();
        }
        return el.value || null;
    }
    static mutate(mutators, el, raw, key, values) {
        const maybeMutator = mutators[el.dataset['fulBindMutator']] || mutators[el.dataset['fulBindProvide']];
        if (maybeMutator) {
            maybeMutator(el, raw, key, values);
            return;
        }
        if (el.getAttribute('type') === 'radio') {
            el.checked = el.getAttribute('value') === raw;
            return;
        }
        if (el.getAttribute('type') === 'checkbox') {
            el.checked = raw;
            return;
        }
        if (el.setValue) {
            el.setValue(raw);
            return;
        }
        el.value = raw;
    }

    static providePath(result, path, value) {
        const keys = path.split(".").map((k) => k.match(/^[0-9]+$/) ? +k : k);
        let current = result;
        let previous = null;
        for (let i = 0; ; ++i) {
            const ckey = keys[i];
            const pkey = keys[i - 1];
            if (Number.isInteger(ckey) && !Array.isArray(current)) {
                if (previous !== null) {
                    previous[pkey] = current = [];
                } else {
                    result = current = [];
                }
            }
            if (i === keys.length - 1) {
                //when value is undefined we only want to define the property if it's not defined 
                current[ckey] = value !== undefined ? value : (ckey in current ? current[ckey] : null);
                return result;
            }
            if (current[ckey] === undefined) {
                current[ckey] = {};
            }
            previous = current;
            current = current[ckey];
        }
    }
    static custom(tagName, configuration) {
        customElements.define(tagName, class extends Form {
            constructor() {
                super(configuration);
            }
        });
    }
    static configure(configuration) {
        FieldError.configure();
        Errors.configure();
        Spinner.configure();
        Input.configure();
        Select.configure();
        Form.custom('ful-form', configuration || {});
    }
}

Observable.mixin(Form);



export { CustomElements, FieldError, Errors, Spinner, Input, Select, Form };
