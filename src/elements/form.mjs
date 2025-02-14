import { Attributes, ParsedElement  } from "@optionfactory/ftl"
import { Failure } from "../failure.mjs";
import { Bindings } from "./bindings.mjs"

class Form extends ParsedElement() {
    static IGNORED_CHILDREN_SELECTOR = '.d-none, [hidden]';
    static SCROLL_OFFSET = 50;
    static INVALID_CLASS = 'is-invalid';
    submitter;
    render() {
        const form = document.createElement('form');
        Attributes.forward('form-', this, form);
        form.replaceChildren(...this.childNodes);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.spinning(async () => {
                await this.submitter?.(this.values, this);
            });
        })
        if (this.hasAttribute("clear-invalid-on-change")) {
            this.addEventListener('change', evt => {
                const target = /** @type HTMLElement */ (evt.target);
                target?.querySelectorAll(`.${CSS.escape(Form.INVALID_CLASS)}`).forEach(el => {
                    el.classList.remove(Form.INVALID_CLASS);
                });
            });
        }
        this.replaceChildren(form);
    }
    spinner(spin) {
        this.querySelectorAll('ful-spinner').forEach(el => {
            const hel = /** @type HTMLElement */ (el);
            hel.hidden = !spin;
        })
        this.querySelectorAll('[type=submit],[type=reset]').forEach(el => {
            const hel = /** @type HTMLButtonElement */ (el);
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
        } catch (e) {
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
        Bindings.mutateIn(this, vs);
    }
    get values() {
        return Bindings.extractFrom(this, Form.IGNORED_CHILDREN_SELECTOR);
    }
    set errors(es) {
        Bindings.errors(this, es, Form.INVALID_CLASS);
        if (es.length == 0 || !this.hasAttribute('scroll-on-error')) {
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
