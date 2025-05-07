import { Attributes, ParsedElement  } from "@optionfactory/ftl"
import { Failure } from "../failure.mjs";
import { Bindings } from "./bindings.mjs"

class Form extends ParsedElement() {
    submitter;
    form;
    render() {
        const form = this.form = document.createElement('form');
        form.setAttribute("novalidate", "");
        Attributes.forward('form-', this, form);
        form.replaceChildren(...this.childNodes);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.spinning(async () => {
                await this.submitter?.(this.values, this);
            });
        })
        if (this.hasAttribute("clear-invalid-on-change")) {
            this.addEventListener('change', (/** @type any */evt) => {
                evt.target.setCustomValidity?.("");
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
        Bindings.mutateIn(this.form, vs);
    }
    get values() {
        return Bindings.extractFrom(this.form);
    }
    set errors(es) {
        Bindings.errors(this.form, es, this.hasAttribute('scroll-on-error'));
    }
}

export { Form };
