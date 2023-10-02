/* global Infinity, CSS */

import { Failure } from "./http-client.mjs";
import { Observable } from "./observable.mjs";
import { Slots } from "./slots.mjs";


function extract(extractors, el) {
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
    return el.value || null;
}

function mutate(mutators, el, raw, key, values) {
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
    el.value = raw;
}


function providePath(result, path, value) {
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

class FieldError extends HTMLElement {
    constructor() {
        super();
        this.classList.add('invalid-feedback');
    }
    static configure() {
        customElements.define('ful-field-error', FieldError);
    }
}

class Errors extends HTMLElement {
    constructor() {
        super();
        this.classList.add('alert', 'alert-danger', 'd-none');
    }
    static configure() {
        customElements.define('ful-errors', Errors);
    }

}

class Spinner extends HTMLElement {
    constructor() {
        super();
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

class Form extends HTMLElement {
    constructor({ mutators, extractors, valueHoldersSelector, ignoredChildrenSelector }) {
        super();
        Observable.mixin(this);
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
                mutate(this.mutators, el, values[k], k, values);
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
                return providePath(result, el.getAttribute('name'), extract(this.extractors, el));
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
    static custom(tagName, configuration) {
        customElements.define(tagName, class extends Form {
            constructor() {
                super(configuration);
            }
        });
    }
    static configure(configuration) {
        return Form.custom('ful-form', configuration || {});
    }
}


class Input extends HTMLElement {
    static FLOATING_TEMPLATE = `                
        <div class="input-group has-validation">
            <span data-tpl-if="slotted.before" class="input-group-text">{{{{ slotted.before }}}}</span>
            <div class="form-floating">
                {{{{ slotted.input }}}} 
                <label data-tpl-for="name" class="form-label">{{{{ slotted.default }}}}</label>
            </div>
            <span data-tpl-if="slotted.after" class="input-group-text">{{{{ slotted.after }}}}</span>
            <ful-field-error data-tpl-field="name"></ful-field-error>                                 
        </div>    
    `;
    static TEMPLATE = `
        <label data-tpl-for="name" class="form-label">{{{{ slotted.default }}}}</label>
        <div class="input-group has-validation">
            <span data-tpl-if="slotted.before" class="input-group-text">{{{{ slotted.before }}}}</span>
            {{{{ slotted.input }}}} 
            <span data-tpl-if="slotted.after" class="input-group-text">{{{{ slotted.after }}}}</span>
            <ful-field-error data-tpl-field="name"></ful-field-error>            
        </div>    
    `;
    constructor(evaluationContext) {
        super();
        const name = this.getAttribute('@name');
        const floating = this.hasAttribute('@floating');
        const slotted = Slots.extract(this);
        slotted.input = slotted.input || (() => {
            const el = document.createElement("input")
            el.setAttribute("type", this.getAttribute('@type') || 'text');
            el.classList.add("form-control");
            return el;
        })();

        const attrIfMissing = (el, k, v) => !el.hasAttribute(k) && el.setAttribute(k, v);
        attrIfMissing(slotted.input, "name", name);
        attrIfMissing(slotted.input, "id", name);
        attrIfMissing(slotted.input, "placeholder", " ");
        ftl.Template.fromHtml(floating ? Input.FLOATING_TEMPLATE : Input.TEMPLATE, evaluationContext).renderTo(this, {
            name: name,
            slotted: slotted
        });
    }
    static custom(tagName, ec) {
        customElements.define(tagName, class extends Input {
            constructor() {
                super(ec);
            }
        });
    }
    static configure(ec) {
        return Input.custom('ful-input', ec);
    }
}


export { Form, FieldError, Errors, Spinner, Input };
