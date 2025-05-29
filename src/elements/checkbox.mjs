import { Attributes, ParsedElement } from "@optionfactory/ftl";

class Checkbox extends ParsedElement {
    static observed = ['value:bool'];
    static slots = true;
    static template = `
        <div data-tpl-class="klass">
            <input data-tpl-id="id" class="form-check-input" type="checkbox" role="switch" form="" placeholder=" " data-tpl-aria-describedby="fieldErrorId">
            <label data-tpl-for="id" class="form-check-label">{{{{ slots.default }}}}</label>
        </div>
        <ful-field-error data-tpl-if="fieldErrorId"></ful-field-error>
    `;
    #input;
    #fieldError;
    static formAssociated = true;
    constructor() {
        super();
        this.internals = this.attachInternals();
    }
    render({ slots }) {
        const id = Attributes.uid("ful-checkbox");
        const fieldErrorId = id + "-error";
        const klass = this.getAttribute('type') == 'switch' ? "form-check form-switch" : "form-check";
        const fragment = this.template().withOverlay({ slots, klass, id, fieldErrorId }).render();
        this.#input = fragment.querySelector("input");
        Attributes.forward('input-', this, this.#input)
        this.#fieldError = fragment.querySelector('ful-field-error');
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
        this.replaceChildren(fragment);
    }
    get value() {
        return this.#input.checked;
    }
    set value(value) {
        this.#input.checked = value;
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