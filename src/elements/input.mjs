import { Attributes, ParsedElement } from "@optionfactory/ftl"

class Input extends ParsedElement {
    static observed = ['value'];
    static slots = true;
    static template = `
        <label data-tpl-for="id" class="form-label">{{{{ slots.default }}}}</label>
        <div class="input-group">
            <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
            {{{{ slots.before }}}}
            <input data-tpl-if="type != 'textarea'" class="form-control" data-tpl-id="id" data-tpl-type="text" placeholder=" " data-tpl-aria-describedby="fieldErrorId" form="">
            <textarea data-tpl-if="type == 'textarea'" class="form-control" data-tpl-id="id" placeholder=" " data-tpl-aria-describedby="fieldErrorId" form="">
            </textarea>
            {{{{ slots.after }}}}
            <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
        </div>
        <ful-field-error data-tpl-id="fieldErrorId"></ful-field-error>
    `;
    static formAssociated = true;
    #input;
    #fieldError;
    constructor() {
        super();
        this.internals = this.attachInternals();
    }
    render({ slots }) {
        const id = Attributes.uid('ful-input');
        const fieldErrorId = `${id}-error`;
        const type = this.getAttribute("type") ?? 'text';
        const fragment = this.template().withOverlay({ id, type, fieldErrorId, slots }).render();    
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
        this.#fieldError = fragment.querySelector('ful-field-error');
        this.replaceChildren(fragment);
    }
    get value() {
        return this.#input.value;
    }
    set value(value) {
        this.#input.value = value;
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
