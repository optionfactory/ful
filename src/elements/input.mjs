import { Attributes, ParsedElement } from "@optionfactory/ftl"

class Input extends ParsedElement {
    static observed = ['value', 'readonly:presence'];
    static slots = true;
    static template = `
        <label class="form-label">{{{{ slots.default }}}}</label>
        <div class="input-group">
            <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
            {{{{ slots.before }}}}
            <input data-tpl-if="type != 'textarea'" class="form-control" data-tpl-type="type" placeholder=" " form="">
            <textarea data-tpl-if="type == 'textarea'" class="form-control" placeholder=" " form=""></textarea>
            {{{{ slots.after }}}}
            <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
        </div>
        <ful-field-error></ful-field-error>
    `;
    static formAssociated = true;
    #input;
    #fieldError;
    constructor() {
        super();
        this.internals = this.attachInternals();
        this.internals.role = 'presentation';
    }
    render({ slots }) {
        const type = this.getAttribute("type") ?? 'text';
        const fragment = this.template().withOverlay({ type, slots }).render();    
        this.#input = fragment.querySelector("input,textarea");
        Attributes.forward('input-', this, this.#input);
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
        label.addEventListener('click', () => this.focus());
        this.#fieldError = fragment.querySelector('ful-field-error');
        this.#input.ariaDescribedByElements = [this.#fieldError];
        this.#input.ariaLabelledByElements = [label];
        this.replaceChildren(fragment);
    }
    get value() {
        return this.#input.value === '' ? null : this.#input.value;
    }
    set value(value) {
        this.#input.value = value === '' ? null : value;
    }
    get readonly(){
        return this.#input.readOnly;
    }
    set readonly(v) {
        this.#input.readOnly = v;
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

export { Input };
