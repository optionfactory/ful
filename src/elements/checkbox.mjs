import { Attributes, ParsedElement } from "@optionfactory/ftl";

class Checkbox extends ParsedElement {
    static observed = ['value:bool', 'readonly:presence'];
    static slots = true;
    static template = `
        <div data-tpl-class="klass">
            <div class="input-container">
                <input class="form-check-input" type="checkbox" role="switch" form="" placeholder=" ">
            </div>
            <label class="form-check-label">{{{{ slots.default }}}}</label>
        </div>
        <ful-field-error></ful-field-error>
    `;
    #container;
    #input;
    #fieldError;
    static formAssociated = true;
    constructor() {
        super();
        this.internals = this.attachInternals();
        this.internals.role = 'presentation';
    }
    render({ slots, observed, disabled }) {
        const klass = this.getAttribute('type') == 'switch' ? "form-check form-switch" : "form-check";
        const fragment = this.template().withOverlay({ slots, klass }).render();
        this.#container = fragment.firstElementChild
        this.#input = fragment.querySelector("input");
        Attributes.forward('input-', this, this.#input)
        this.disabled = disabled;
        this.readonly = observed.readonly;
        this.value = observed.value;
        this.#input.addEventListener('change', (evt) => {
            evt.stopPropagation();
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                cancelable: false,
                detail: {
                    value: this.value
                }
            }));
        });
        const label = fragment.querySelector('label');
        label.addEventListener('click', () => {
            this.focus();
            if (this.disabled || this.readonly) {
                return;
            }
            this.value = !this.value;
        });
        this.#fieldError = fragment.querySelector('ful-field-error');
        this.#input.ariaDescribedByElements = [this.#fieldError];
        this.#input.ariaLabelledByElements = [label];
        this.replaceChildren(fragment);
    }
    get value() {
        return this.#input.checked;
    }
    set value(value) {
        this.#input.checked = value;
    }
    get readonly(){
        return this.#container.inert;
    }
    set readonly(v) {
        this.#container.inert = v;
    }     
    get disabled() {
        return this.#input.hasAttribute('disabled');
    }
    set disabled(d) {
        Attributes.toggle(this.#input, 'disabled', d);
    }
    focus(options) {
        this.#input.focus(options);
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

export { Checkbox }