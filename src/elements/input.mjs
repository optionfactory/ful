import { Attributes, ParsedElement  } from "@optionfactory/ftl"

const INPUT_TEMPLATE = `
    <label data-tpl-for="id" class="form-label">{{{{ slots.default }}}}</label>
    <div class="input-group">
        <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
        <div data-tpl-if="slots.before" data-tpl-remove="tag">{{{{ slots.before }}}}</div>
        {{{{ slots.input }}}} 
        <div data-tpl-if="slots.after" data-tpl-remove="tag">{{{{ slots.after }}}}</div>
        <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
    </div>
    <ful-field-error data-tpl-if="name" data-tpl-field="name" data-tpl-id="fieldErrorId"></ful-field-error>
`;

const makeInputFragment = (el, template, slots) => {
    const input = el.input = slots.input = slots.input?.firstElementChild ?? (() => {
        const el = document.createElement("input")
        el.classList.add("form-control");
        return el;
    })();
    input.addEventListener('change', (evt) => {
        evt.stopPropagation();
        el.dispatchEvent(new CustomEvent('change', { 
            bubbles: true, 
            cancelable: false, 
            detail: {
                value: el.value
            }
        }));
    });
    const id = input.getAttribute('id') ?? el.getAttribute('input-id') ?? Attributes.uid('ful-input');
    const fieldErrorId = `${id}-error`;
    Attributes.forward('input-', el, slots.input)
    Attributes.defaultValue(slots.input, "id", id);
    Attributes.defaultValue(slots.input, "type", "text");
    Attributes.defaultValue(slots.input, "placeholder", " ");
    Attributes.defaultValue(slots.input, "aria-describedby", fieldErrorId);
    Attributes.defaultValue(slots.input, "form", "");
    const name = el.getAttribute('name');
    return template.withOverlay(el, { id, fieldErrorId, name, slots }).render();
}

class Input extends ParsedElement({
    observed: ['value'],
    slots: true,
    template: INPUT_TEMPLATE
}){
    static formAssociated = true;
    input;
    #fieldError;
    constructor(){
        super();
        this.internals = this.attachInternals();
    }
    render({slots}) {
        const fragment = makeInputFragment(this, this.template(), slots);
        this.replaceChildren(fragment);
        this.#fieldError = this.querySelector('ful-field-error');
    }
    get value() {
        return this.input.value;
    }
    set value(value) {
        this.input.value = value;
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

export { makeInputFragment, INPUT_TEMPLATE, Input };
