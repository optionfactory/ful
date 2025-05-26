import { Attributes, ParsedElement } from "@optionfactory/ftl"
import { Failure } from "../failure.mjs";
import { Bindings } from "./bindings.mjs"
import { Loaders } from "./loaders.mjs"

class RemoteJsonFormLoader {
    #http;
    #url;
    #method;
    #requestMapper;
    #responseMapper;
    constructor(http, url, method, requestMapper, responseMapper) {
        this.#http = http;
        this.#url = url;
        this.#method = method;
        this.#requestMapper = requestMapper;
        this.#responseMapper = responseMapper;
    }
    prepare(values, form) {
        return this.#requestMapper(values);
    }
    async submit(values, form) {

    }
    transform(response, form) {
        return this.#responseMapper(response);
    }
}

class LocalFormLoader {
    #requestMapper;
    constructor(requestMapper) {
        this.#requestMapper = requestMapper;
    }
    prepare(values, form) {
        return this.#requestMapper(values);
    }
    async submit(values, form) {
        return values;
    }
    transform(response, form) {
        return response;
    }
}

class FormLoader {
    create({ el, http, requestMapper, responseMapper }) {
        const url = el.getAttribute("action");
        if (!url) {
            return new LocalFormLoader(requestMapper);
        }
        const method = el.getAttribute("method") ?? 'POST';
        return new RemoteJsonFormLoader(http, url, method, requestMapper, responseMapper);
    }
}

class Form extends ParsedElement {
    form;
    render() {
        const form = this.form = document.createElement('form');
        form.setAttribute("novalidate", "");
        Attributes.forward('form-', this, form);
        form.replaceChildren(...this.childNodes);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submit();
        })
        if (this.hasAttribute("clear-invalid-on-change")) {
            this.addEventListener('change', (/** @type any */evt) => {
                evt.target.setCustomValidity?.("");
            });
        }
        this.replaceChildren(form);
    }
    async submit() {
        this.spinner(true)
        try {
            const loader = Loaders.fromAttributes(this, 'loaders:form');
            const values = this.values;
            const request = await loader.prepare(values, this)
            const se = new CustomEvent('submit', { bubbles: true, cancelable: true, detail: { values, request } });
            if (!this.dispatchEvent(se)) {
                return;
            }
            try {
                const response = await loader.submit(se.detail.request, this);
                const mapped = await loader.transform(response, this);
                this.dispatchEvent(new CustomEvent('submit:success', { bubbles: true, cancelable: false, detail: { values, request, response: mapped } }))
            } catch (e) {
                this.dispatchEvent(new CustomEvent('submit:failure', { bubbles: true, cancelable: false, detail: { values, request, exception: e } }));
                if (e instanceof Failure) {
                    this.errors = e.problems;
                }
                throw e;
            }
        } finally {
            this.spinner(false);
        }
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

export { FormLoader, Form };
