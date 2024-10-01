import { Failure } from "../failure.mjs";
import { ParsedElement } from "./elements.mjs"

function flatten(obj, prefix) {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            Object.assign(acc, flatten(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
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

function extract(el) {
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
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT'){
        return el.value === '' || el.value === undefined ? null : el.value;    
    }
    return el.value;
}

function mutate(el, raw) {
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

class Form extends ParsedElement() {
    static IGNORED_CHILDREN_SELECTOR = '.d-none, [hidden]';
    static SCROLL_OFFSET = 50;
    static INVALID_CLASS = 'is-invalid';
    submitter;
    render() {
        const form = document.createElement('form');
        form.replaceChildren(...this.childNodes);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.spinning(async () => {
                await this.submitter?.(this.values, this);
            });
        })
        this.replaceChildren(form);
    }
    spinner(spin) {
        this.querySelectorAll('ful-spinner').forEach(el => {
            const hel = /** @type HTMLElement} */ (el);
            hel.hidden = !spin;
        })
        this.querySelectorAll('[type=submit],[type=reset]').forEach(el => {
            const hel = /** @type HTMLButtonElement} */ (el);
            hel.disabled = spin
        })
    }
    async remoting(fn) {
        try {
            await fn();
        } catch (e) {
            if (e instanceof Failure) {
                this.errors = e.problems;
            }
            throw e;
        }
    }
    async spinningUntilError(fn) {
        this.spinner(true)
        try {
            await this.remoting(fn);
        } catch(e) {
            this.spinner(false);
            throw e;
        }
    }
    async spinning(fn) {
        this.spinner(true)
        try {
            await this.remoting(fn);
        } finally {
            this.spinner(false);
        }
    }
    set values(vs) {
        for (const [flattenedKey, value] of Object.entries(flatten(vs, ''))) {
            this.querySelectorAll(`[name='${CSS.escape(flattenedKey)}']`).forEach(el => mutate(el, value));
        }
    }
    get values() {
        return Array.from(/** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('[name]')))
            .filter(el => {
                if (el.dataset['fulBindInclude'] === 'never') {
                    return false;
                }
                return el.dataset['fulBindInclude'] === 'always' || el.closest(Form.IGNORED_CHILDREN_SELECTOR) === null;
            })
            .reduce((result, el) => {
                return providePath(result, el.getAttribute('name'), extract(el));
            }, {});
    }
    set errors(es) {
        const fieldErrors = es.filter(e => e.type === 'FIELD_ERROR' || e.type === 'INVALID_FORMAT');
        const globalErrors = es.filter(e => e.type !== 'FIELD_ERROR' && e.type !== 'INVALID_FORMAT');
        this.querySelectorAll(`.${Form.INVALID_CLASS}`).forEach(el => el.classList.remove(Form.INVALID_CLASS));
        this.querySelectorAll("ful-errors").forEach(el => {
            el.replaceChildren();
            el.setAttribute('hidden', '');
        });
        fieldErrors.forEach(e => {
            const name = e.context.replace("[", ".").replace("].", ".");
            const validationTargetsSelector = `[name='${CSS.escape(name)}'] [ful-validation-target],[name='${CSS.escape(name)}']:not(:has([ful-validation-target]))`;
            this.querySelectorAll(validationTargetsSelector).forEach(input => input.classList.add(Form.INVALID_CLASS));
            const fieldErrorsSelector = `ful-field-error[field='${CSS.escape(name)}']`;
            this.querySelectorAll(fieldErrorsSelector).forEach(el => {
                const hel = /** @type HTMLElement} */ (el);
                hel.innerText = e.reason
            });
        });
        this.querySelectorAll("ful-errors").forEach(el => {
            const hel = /** @type HTMLElement} */ (el);
            hel.innerText = globalErrors.map(e => e.reason).join("\n");
            if (globalErrors.length !== 0) {
                el.removeAttribute('hidden');
            }
        });
        if (!this.hasAttribute('scroll-on-error')) {
            return;
        }
        const ys = Array.from(this.querySelectorAll(`ful-errors:not([hidden]), [ful-validated-field]:has(.${Form.INVALID_CLASS}) ful-field-error`))
            .map(el => el.parentElement ? el.parentElement : el)
            .map(el => el.getBoundingClientRect().y + window.scrollY);
        const miny = Math.min(...ys);
        if (miny !== Infinity) {
            window.scroll(window.scrollX, miny > Form.SCROLL_OFFSET ? miny - Form.SCROLL_OFFSET : 0);
        }
    }
}

export { Form };
