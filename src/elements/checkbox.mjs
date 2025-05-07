import { Fragments, ParsedElement } from "@optionfactory/ftl";
import { makeInputFragment } from "./input.mjs";

class Checkbox extends ParsedElement({
    observed: ['value:bool'],
    slots: true,
    template: `
        <div data-tpl-class="klass">
            {{{{ slots.input }}}}
            <label data-tpl-for="id" class="form-check-label">{{{{ slots.default }}}}</label>
        </div>
        <ful-field-error data-tpl-if="name" data-tpl-field="name" ></ful-field-error>
    `
}) {
    input;
    #fieldError;
    static formAssociated = true;
    constructor() {
        super();
        this.internals = this.attachInternals();
    }
    render({ slots }) {
        const input = document.createElement('input');
        input.setAttribute("class", "form-check-input");
        input.setAttribute("type", "checkbox");
        input.setAttribute("role", "switch");
        input.setAttribute("form", "");

        const klass = this.getAttribute('type') == 'switch' ? "form-check form-switch" : "form-check";
        const fragment = makeInputFragment(this, this.template().withOverlay({ klass }), { ...slots, input: Fragments.from(input) });
        this.replaceChildren(fragment);
        this.#fieldError = this.querySelector('ful-field-error');        
    }
    get value() {
        return this.input.checked;
    }
    set value(value) {
        this.input.checked = value;
    }
    focus(options){
        this.input.focus(options);
    }
    setCustomValidity(error){
        if(!error){
            this.internals.setValidity({});
            this.#fieldError.innerText = "";    
            return;
        }
        this.internals.setValidity({customError: true}, " ");
        this.#fieldError.innerText = error;
    }
}

export { Checkbox }