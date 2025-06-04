import { Attributes, Fragments, ParsedElement } from "@optionfactory/ftl";

class InstantFilter extends ParsedElement {
    static observed = ["value:json"];
    static slots = true;
    static template = `
        <label class="form-label" data-tpl-if="label">{{{{ label }}}}</label>
        <div class="input-group">
            <button data-ref="operator" class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" value="LTE" form="">&PrecedesSlantEqual;</button>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" role="button" value="EQ">=</a></li>
                <li><a class="dropdown-item" role="button" value="NEQ">&ne;</a></li>
                <li><a class="dropdown-item" role="button" value="LT">&prec;</a></li>
                <li><a class="dropdown-item" role="button" value="GT">&succ;</a></li>
                <li><a class="dropdown-item" role="button" value="LTE">&PrecedesSlantEqual;</a></li>
                <li><a class="dropdown-item" role="button" value="GTE">&SucceedsSlantEqual;</a></li>
                <li><a class="dropdown-item" role="button" value="BETWEEN">&LeftRightArrow;</a></li>
            </ul>
            <input data-ref="value1" type="datetime-local" class="form-control" form="">
            <input data-ref="value2" type="datetime-local" class="form-control" form="" hidden>
            <span class="input-group-text"><i class="bi bi-search"></i></span>
        </div>
        <ful-field-error></ful-field-error>
    `;
    static formAssociated = true;
    #operator;
    #value1;
    #value2;
    #fieldError;
    constructor() {
        super();
        this.internals = this.attachInternals();
    }
    render({ slots }) {
        const label = Fragments.toHtml(slots.default.cloneNode(true)).trim().length === 0 ? null : slots.default;
        const name = this.getAttribute("name")
        const fragment = this.template().withOverlay({ label, name }).render(this);
        this.#operator = fragment.querySelector('[data-ref=operator]');
        this.#value1 = fragment.querySelector('[data-ref=value1]');
        this.#value2 = fragment.querySelector('[data-ref=value2]');
        this.#fieldError = fragment.querySelector('ful-field-error');
        const labelEl = fragment.querySelector('label')
        labelEl?.addEventListener('click', () => this.focus());
        this.#value1.ariaDescribedByElements = [this.#fieldError];
        this.#value1.ariaLabelledByElements = labelEl ? [label] : [];
        this.replaceChildren(fragment);
        this.addEventListener('click', (evt) => {
            const target = /** @type HTMLElement */ (evt.target);
            if (!target.matches('ul > li > a')) {
                return;
            }
            const btn = /** @type HTMLButtonElement */ (target.closest('ul')?.previousElementSibling);
            const value = /** @type String */ (target.getAttribute("value"));
            Attributes.toggle(this.#value2, 'hidden', value !== 'BETWEEN');
            btn.setAttribute('value', value);
            btn.innerHTML = target.innerHTML;
        })
    }

    get value() {
        const operator = this.#operator.getAttribute('value');
        const values = operator === 'BETWEEN' ? [this.#value1.value, this.#value2.value] : [this.#value1.value];
        return values.some(v => v === '') ? undefined : [operator, ...values.map(v => new Date(v).toISOString())];
    }
    set value(v) {
        if (v === null || v === undefined) {
            this.#value1.value = '';
            this.#value2.value = '';
            this.reflect(() => {
                this.removeAttribute('value');
            });
            return;
        }
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
    focus(options) {
        this.#value1.focus(options);
    }
    setCustomValidity(error) {
        if (!error) {
            this.internals.setValidity({});
            this.#fieldError.innerText = "";
            return;
        }
        this.internals.setValidity({ customError: true }, " ");
        this.#fieldError.innerText = error;
    }
}

class LocalDateFilter extends ParsedElement {
    static observed = ["value:json"];
    static slots = true;
    static template = `
        <label class="form-label" data-tpl-if="label">{{{{ label }}}}</label>
        <div class="input-group">
            <button data-ref="operator" class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" value="EQ" form="">=</button>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" role="button" value="EQ">=</a></li>
                <li><a class="dropdown-item" role="button" value="NEQ">&ne;</a></li>
                <li><a class="dropdown-item" role="button" value="LT">&prec;</a></li>
                <li><a class="dropdown-item" role="button" value="GT">&succ;</a></li>
                <li><a class="dropdown-item" role="button" value="LTE">&PrecedesSlantEqual;</a></li>
                <li><a class="dropdown-item" role="button" value="GTE">&SucceedsSlantEqual;</a></li>
                <li><a class="dropdown-item" role="button" value="BETWEEN">&LeftRightArrow;</a></li>
            </ul>
            <input data-ref="value1" type="date" class="form-control" form="">
            <input data-ref="value2" type="date" class="form-control" form="" hidden>
            <span class="input-group-text"><i class="bi bi-search"></i></span>
        </div>
        <ful-field-error></ful-field-error>
    `;
    static formAssociated = true;
    #operator;
    #value1;
    #value2;
    #fieldError;
    constructor() {
        super();
        this.internals = this.attachInternals();
    }
    render({ slots }) {
        const label = Fragments.toHtml(slots.default.cloneNode(true)).trim().length === 0 ? null : slots.default;
        const name = this.getAttribute("name")
        const fragment = this.template().withOverlay({ label, name }).render(this);
        this.#operator = fragment.querySelector('[data-ref=operator]');
        this.#value1 = fragment.querySelector('[data-ref=value1]');
        this.#value2 = fragment.querySelector('[data-ref=value2]');
        this.#fieldError = fragment.querySelector('ful-field-error');
        const labelEl = fragment.querySelector('label')
        labelEl?.addEventListener('click', () => this.focus());
        this.#value1.ariaDescribedByElements = [this.#fieldError];
        this.#value1.ariaLabelledByElements = labelEl ? [label] : [];
        this.replaceChildren(fragment);
        this.addEventListener('click', (evt) => {
            const target = /** @type HTMLElement */(evt.target);
            if (!target.matches('ul > li > a')) {
                return;
            }
            const btn = /** @type HTMLButtonElement */ (target.closest('ul')?.previousElementSibling);
            const value = /** @type String */ (target.getAttribute("value"));
            Attributes.toggle(this.#value2, 'hidden', value !== 'BETWEEN');
            btn.setAttribute('value', value);
            btn.innerHTML = target.innerHTML;
        })
    }
    get value() {
        const operator = this.#operator.getAttribute('value');
        const values = operator == 'BETWEEN' ? [this.#value1.value, this.#value2.value] : [this.#value1.value];
        return values.some(v => v === '') ? undefined : [operator, "ISO_8601", ...values];
    }
    set value(v) {
        if (v === null || v === undefined) {
            this.#value1.value = '';
            this.#value2.value = '';
            this.reflect(() => {
                this.removeAttribute('value');
            });
            return;
        }
        const [operator, ...values] = v;
        this.#operator.setAttibute('value', operator);
        this.#value1.value = values[0];
        this.#value2.value = values[1];
        this.reflect(() => {
            this.setAttribute('value', JSON.stringify(v));
        });
    }
    focus(options) {
        this.#value1.focus(options);
    }
    setCustomValidity(error) {
        if (!error) {
            this.internals.setValidity({});
            this.#fieldError.innerText = "";
            return;
        }
        this.internals.setValidity({ customError: true }, " ");
        this.#fieldError.innerText = error;
    }
}

class TextFilter extends ParsedElement {
    static observed = ["value:json"];
    static slots = true;
    static template = `
        <label class="form-label" data-tpl-if="label">{{{{ label }}}}</label>
        <div class="input-group">
            <button data-ref="operator" class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" value="CONTAINS" form="">&mldr;a&mldr;</button>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" role="button" value="CONTAINS">&mldr;a&mldr;</a></li>
                <li><a class="dropdown-item" role="button" value="STARTS_WITH">a&mldr;</a></li>
                <li><a class="dropdown-item" role="button" value="ENDS_WITH">&mldr;a</a></li>
                <li><a class="dropdown-item" role="button" value="EQ">=</a></li>
            </ul>
            <input data-ref="value" type="text" class="form-control" form="">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
        </div>
        <ful-field-error></ful-field-error>
    `;
    static formAssociated = true;
    #operator;
    #value;
    #fieldError;
    constructor() {
        super();
        this.internals = this.attachInternals();
    }
    render({ slots }) {
        const label = Fragments.toHtml(slots.default.cloneNode(true)).trim().length === 0 ? null : slots.default;
        const name = this.getAttribute("name")
        const fragment = this.template().withOverlay({ label, name }).render(this);
        this.#operator = fragment.querySelector('[data-ref=operator]');
        this.#value = fragment.querySelector('[data-ref=value]');
        this.#fieldError = fragment.querySelector('ful-field-error');
        const labelEl = fragment.querySelector('label')
        labelEl?.addEventListener('click', () => this.focus());
        this.#value.ariaDescribedByElements = [this.#fieldError];
        this.#value.ariaLabelledByElements = labelEl ? [label] : [];        
        this.replaceChildren(fragment);
        this.addEventListener('click', (evt) => {
            const target = /** @type HTMLElement */(evt.target);
            if (!target.matches('ul > li > a')) {
                return;
            }
            const btn = /** @type HTMLButtonElement */ (target.closest('ul')?.previousElementSibling);
            const value = /** @type String */ (target.getAttribute("value"));
            btn.setAttribute('value', value);
            btn.innerHTML = target.innerHTML;
        })
    }

    get value() {
        const operator = this.#operator.getAttribute('value');
        return this.#value.value === '' ? undefined : [operator, 'IGNORE_CASE', this.#value.value];
    }

    set value(v) {
        if (v === null || v === undefined) {
            this.#value.value = '';
            this.reflect(() => {
                this.removeAttribute('value');
            });
            return;
        }
        const [operator, sensitivity, value] = v;
        this.#operator.setAttribute('value', operator);
        this.#value.value = value;
        this.reflect(() => {
            this.setAttribute('value', JSON.stringify(v));
        });
    }
    focus(options) {
        this.#value.focus(options);
    }
    setCustomValidity(error) {
        if (!error) {
            this.internals.setValidity({});
            this.#fieldError.innerText = "";
            return;
        }
        this.internals.setValidity({ customError: true }, " ");
        this.#fieldError.innerText = error;
    }
}

export { InstantFilter, LocalDateFilter, TextFilter }