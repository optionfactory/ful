import { Attributes, Fragments, ParsedElement } from "@optionfactory/ftl";

class InstantFilter extends ParsedElement({
    observed: ["value:json"],
    slots: true,
    template: `
        <div ful-validated-field>
            <label data-tpl-for="id" class="form-label" data-tpl-if="label">{{{{ label }}}}</label>
            <div class="input-group">
                <button data-ref="operator" class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" value="LTE">≼</button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" role="button" value="LTE">≼</a></li>
                    <li><a class="dropdown-item" role="button" value="GTE">≽</a></li>
                    <li><a class="dropdown-item" role="button" value="BETWEEN">↔</a></li>
                </ul>
                <input data-tpl-id="id" data-ref="value1" type="datetime-local" class="form-control" aria-label="asd">
                <input data-ref="value2" type="datetime-local" class="form-control" aria-label="asd" hidden>
                <span class="input-group-text"><i class="bi bi-search"></i></span>
            </div>
            <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
        </div>
    `
}) {
    #operator;
    #value1;
    #value2;

    render({ slots }) {
        const id = Attributes.uid('instant-filter');
        const label = Fragments.toHtml(slots.default.cloneNode(true)).trim().length === 0 ? null : slots.default;
        const fragment = this.template().withOverlay({ id, label }).render(this);
        this.#operator = fragment.querySelector('[data-ref=operator]');
        this.#value1 = fragment.querySelector('[data-ref=value1]');
        this.#value2 = fragment.querySelector('[data-ref=value2]');
        this.replaceChildren(fragment);
        this.addEventListener('click', (evt) => {
            if (!evt.target.matches('ul > li > a')) {
                return;
            }
            const btn = evt.target.closest('ul').previousElementSibling;
            const value = evt.target.getAttribute("value");
            Attributes.toggle(this.#value2, 'hidden', value !== 'BETWEEN');
            btn.setAttribute('value', value);
            btn.innerHTML = evt.target.innerHTML;
        })
    }

    get value() {
        const operator = this.#operator.getAttribute('value');
        const values = operator === 'BETWEEN' ? [this.#value1.value, this.#value2.value] : [this.#value1.value];
        return values.some(v => v === '') ? undefined : [operator, ...values.map(v => new Date(v).toISOString())];
    }
    set value(v) {
        const [operator, ...values] = v;
        this.#operator.setAttribute('value', operator);
        this.#value1.value = values[0] ? InstantFilter.isoToLocal(values[0]) : values[0];
        this.#value2.value = values[1] ? InstantFilter.isoToLocal(values[1]) : values[1];
        this.reflect(() => {
            this.setAttribute('value', JSON.stringify(v));
        });
    }

    static isoToLocal(iso) {
        //this is so sad
        const d = new Date(iso);
        const pad = (n, v) => String(v).padStart(n, '0');
        const date = `${d.getFullYear()}-${pad(2, d.getMonth() + 1)}-${pad(2, d.getDate())}`;
        const time = `${pad(2, d.getHours())}:${pad(2, d.getMinutes())}:${pad(2, d.getSeconds())}.${pad(3, d.getMilliseconds())}`;
        return `${date}T${time}`
    }
}


class TextFilter extends ParsedElement({
    observed: ["value:json"],
    slots: true,
    template: `
        <div ful-validated-field>
            <label data-tpl-for="id" class="form-label" data-tpl-if="label">{{{{ label }}}}</label>
            <div class="input-group">
                <button data-ref="operator" class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" value="CONTAINS">…a…</button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" role="button" value="CONTAINS">…a…</a></li>
                    <li><a class="dropdown-item" role="button" value="STARTS_WITH">a…</a></li>
                    <li><a class="dropdown-item" role="button" value="ENDS_WITH">…a</a></li>
                    <li><a class="dropdown-item" role="button" value="EQ">=</a></li>
                </ul>
                <input data-tpl-id="id" data-ref="value" type="text" class="form-control" aria-label="asd">
                <span class="input-group-text"><i class="bi bi-search"></i></span>

            </div>
            <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
        </div>
    `
}) {
    #operator;
    #value;

    render({ slots }) {
        const id = Attributes.uid('string-filter');
        const label = Fragments.toHtml(slots.default.cloneNode(true)).trim().length === 0 ? null : slots.default;
        const fragment = this.template().withOverlay({ id, label }).render(this);
        this.#operator = fragment.querySelector('[data-ref=operator]');
        this.#value = fragment.querySelector('[data-ref=value]');
        this.replaceChildren(fragment);
        this.addEventListener('click', (evt) => {
            const target = /** @type HTMLElement */(evt.target);
            if (!target.matches('ul > li > a')) {
                return;
            }
            const btn = target.closest('ul').previousElementSibling;
            const value = target.getAttribute("value");
            btn.setAttribute('value', value);
            btn.innerHTML = target.innerHTML;
        })
    }

    get value() {
        const operator = this.#operator.getAttribute('value');
        return this.#value.value === '' ? undefined : [operator, 'IGNORE_CASE', this.#value.value];
    }

    set value(v) {
        const [operator, sensitivity, value] = v;
        this.#operator.setAttribute('value', operator);
        this.#value.value = value;
        this.reflect(() => {
            this.setAttribute('value', JSON.stringify(v));
        });
    }
}


export { InstantFilter, TextFilter }