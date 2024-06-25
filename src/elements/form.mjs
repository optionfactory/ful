/* global Infinity, CSS */

import { Failure } from "../http-client.mjs";
import { Templated } from "./elements.mjs"

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

class Form extends Templated(HTMLElement) {
    static IGNORED_CHILDREN_SELECTOR = '.d-none, [hidden]';

    render(slotted, template) {
        const form = document.createElement('form');
        form.append(slotted.default);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.spinner(true);
            try {
                if (this.submitter) {
                    await this.submitter(this.getValues(), this);
                }
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
        return form;
    }
    spinner(spin) {
        this.querySelectorAll('ful-spinner').forEach(el => {
            el.hidden = !spin;
        })
        this.querySelectorAll('[type=submit],[type=reset]').forEach(el => {
            el.disabled = spin;
        })
    }
    setValues(values) {
        for (const [flattenedKey, value] of Object.entries(flatten(values, ''))) {
            Array.from(this.querySelectorAll(`[name='${CSS.escape(flattenedKey)}']`)).forEach((el) => {
                Form.mutate(el, value);
            });
        }
    }
    getValues() {
        return Array.from(this.querySelectorAll('[name]'))
            .filter((el) => {
                if (el.dataset['fulBindInclude'] === 'never') {
                    return false;
                }
                return el.dataset['fulBindInclude'] === 'always' || el.closest(Form.IGNORED_CHILDREN_SELECTOR) === null;
            })
            .reduce((result, el) => {
                return Form.providePath(result, el.getAttribute('name'), Form.extract(el));
            }, {});
    }
    setErrors(errors) {
        this.clearErrors();
        errors
            .filter((e) => e.type === 'FIELD_ERROR' || e.type === 'INVALID_FORMAT')
            .forEach((e) => {
                const name = e.context.replace("[", ".").replace("].", ".");
                this.querySelectorAll(`[name='${CSS.escape(name)}'] [ful-validation-target],[name='${CSS.escape(name)}']:not(:has([ful-validation-target]))`)
                    .forEach(input => input.classList.add('is-invalid'));
                this.querySelectorAll(`ful-field-error[field='${CSS.escape(name)}']`)
                    .forEach(el => el.innerText = e.reason);
            });
        this.querySelectorAll("ful-errors")
            .forEach(el => {
                const globalErrors = errors.filter((e) => e.type !== 'FIELD_ERROR' && e.type !== 'INVALID_FORMAT');
                el.innerHTML = globalErrors.map(e => e.reason).join("\n");
                if (globalErrors.length !== 0) {
                    el.removeAttribute('hidden');
                }
            })

        if (!this.hasAttribute('scroll-on-error')) {
            return;
        }
        const ys = Array.from(this.querySelectorAll('ful-field-error'))
            .map(el => el.parentElement ? el.parentElement : el)
            .map(el => el.getBoundingClientRect().y + window.scrollY)
        const miny = Math.min(...ys);
        if (miny !== Infinity) {
            window.scroll(window.scrollX, miny > 100 ? miny - 100 : 0);
        }
    }
    clearErrors() {
        this.querySelectorAll('.is-invalid')
            .forEach(el => el.classList.remove('is-invalid'));
        this.querySelectorAll("ful-errors")
            .forEach(el => {
                el.innerHTML = '';
                el.setAttribute('hidden', '');
            });
    }
    static extract(el) {
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
    static mutate(el, raw) {
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
    static configure() {
        customElements.define('ful-form', Form);
    }
}

export { Form };
