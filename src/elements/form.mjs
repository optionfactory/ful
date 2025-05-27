import { Attributes, ParsedElement } from "@optionfactory/ftl"
import { Failure } from "../failure.mjs";
import { Bindings } from "./bindings.mjs"
import { Loaders } from "./loaders.mjs"
import { AsyncEvents } from "../events/async.mjs";

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
        return this.#requestMapper(values, form);
    }
    async submit(values, form) {
        return await this.#http.request(this.#method, this.#url)
            .json(values)
            .fetch()
    }
    transform(response, form) {
        return this.#responseMapper(response, form);
    }
}

class LocalFormLoader {
    #requestMapper;
    #responseMapper;
    constructor(requestMapper, responseMapper) {
        this.#requestMapper = requestMapper;
        this.#responseMapper = responseMapper;
    }
    async prepare(values, form) {
        return await this.#requestMapper(values, form);
    }
    async submit(values, form, response) {
        return response;
    }
    async transform(response, form) {
        return await this.#responseMapper(response, form);
    }
}

class FormLoader {
    static create({ el, http, requestMapper, responseMapper }) {
        const url = el.getAttribute("action");
        if (!url) {
            return new LocalFormLoader(requestMapper, responseMapper);
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
            e.stopPropagation();
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
            let request = await loader.prepare(values, this)
            try {
                const se = new CustomEvent('submit', { bubbles: true, cancelable: true, detail: { values, request } });
                if (!this.dispatchEvent(se)) {
                    return;
                }
                const sre = new CustomEvent('submit:requested', { bubbles: true, cancelable: false, detail: { values: se.detail.values, request: se.detail.request} })
                let response = await AsyncEvents.fireAsync(this, sre);
                request = sre.detail.request;

                response = await loader.submit(request, this, response);
                const mapped = await loader.transform(response, this);
                this.dispatchEvent(new CustomEvent('submit:success', { bubbles: true, cancelable: false, detail: { values, request, response: mapped } }))
            } catch (e) {
                this.dispatchEvent(new CustomEvent('submit:failure', { bubbles: true, cancelable: false, detail: { values, request, exception: e } }));
                if (e instanceof Failure) {
                    this.errors = e.problems;
                }
                console.warn("failed to submit form", this, "reason:", e);
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
