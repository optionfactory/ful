import { Attributes, ParsedElement } from "./elements.mjs"


const INPUT_TEMPLATE = `
<label data-tpl-for="id" class="form-label">{{{{ slots.default }}}}</label>
<div class="input-group">
    <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
    <div data-tpl-if="slots.before" data-tpl-remove="tag">{{{{ slots.before }}}}</div>
    {{{{ slots.input }}}} 
    <div data-tpl-if="slots.after" data-tpl-remove="tag">{{{{ slots.after }}}}</div>
    <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
</div>
<ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
`;

const makeInputFragment = (el, template, slots) => {
    const input = el.input = slots.input = slots.input || (() => {
        const el = document.createElement("input")
        el.classList.add("form-control");
        return el;
    })();
    input.setAttribute('ful-validation-target', '');

    const id = input.getAttribute('id') || el.getAttribute('input-id') || Attributes.uid('ful-input');
    Attributes.forward('input-', el, slots.input)
    Attributes.defaultValue(slots.input, "id", id);
    Attributes.defaultValue(slots.input, "type", "text");
    Attributes.defaultValue(slots.input, "placeholder", " ");
    const name = el.getAttribute('name');
    return template.render(el, { id, name, slots });
}

class Input extends ParsedElement({
    flags: [], 
    attrs: ['value'],
    slots: true,
    template: INPUT_TEMPLATE
}){
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
