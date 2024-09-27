import { Attributes, ParsedElement } from "./elements.mjs"


const INPUT_TEMPLATE = `
<div ful-validated-field>
    <label data-tpl-for="id" class="form-label">{{{{ slots.default }}}}</label>
    <div class="input-group">
        <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
        <div data-tpl-if="slots.before" data-tpl-remove="tag">{{{{ slots.before }}}}</div>
        {{{{ slots.input }}}} 
        <div data-tpl-if="slots.after" data-tpl-remove="tag">{{{{ slots.after }}}}</div>
        <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
    </div>
    <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
</div>
`;

const makeInputFragment = (el, template, slots) => {
    const input = el.input = slots.input = slots.input?.firstElementChild ?? (() => {
        const el = document.createElement("input")
        el.classList.add("form-control");
        return el;
    })();
    input.setAttribute('ful-validation-target', '');
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
    Attributes.forward('input-', el, slots.input)
    Attributes.defaultValue(slots.input, "id", id);
    Attributes.defaultValue(slots.input, "type", "text");
    Attributes.defaultValue(slots.input, "placeholder", " ");
    const name = el.getAttribute('name');
    return template.render(el, { id, name, slots });
}

class Input extends ParsedElement({
    observed: ['value'],
    slots: true,
    template: INPUT_TEMPLATE
}){
    input;
    render(template, slots) {
        const fragment = makeInputFragment(this, template, slots);
        this.replaceChildren(fragment);
    }
    get value() {
        return this.input.value;
    }
    set value(value) {
        this.input.value = value;
    }
}

export { makeInputFragment, INPUT_TEMPLATE, Input };
