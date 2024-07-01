import { Attributes, Fragments, Slots, templates, ParsedElement } from "./elements.mjs"

templates.put('ful-input', Fragments.fromHtml(`
    <label data-tpl-for="id" class="form-label">{{{{ slotted.default }}}}</label>
    <div class="input-group">
        <span data-tpl-if="slotted.ibefore" class="input-group-text">{{{{ slotted.ibefore }}}}</span>
        <div data-tpl-if="slotted.before" data-tpl-remove="tag">{{{{ slotted.before }}}}</div>
        {{{{ slotted.input }}}} 
        <div data-tpl-if="slotted.after" data-tpl-remove="tag">{{{{ slotted.after }}}}</div>
        <span data-tpl-if="slotted.iafter" class="input-group-text">{{{{ slotted.iafter }}}}</span>
    </div>
    <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
`));


const makeInputFragment = (el, slotted) => {
    const input = el.input = slotted.input = slotted.input || (() => {
        const el = document.createElement("input")
        el.classList.add("form-control");
        return el;
    })();
    input.setAttribute('ful-validation-target', '');

    const id = input.getAttribute('id') || el.getAttribute('input-id') || Attributes.uid('ful-input');
    Attributes.forward('input-', el, slotted.input)
    Attributes.defaultValue(slotted.input, "id", id);
    Attributes.defaultValue(slotted.input, "type", "text");
    Attributes.defaultValue(slotted.input, "placeholder", " ");
    const name = el.getAttribute('name');
    return templates.get('ful-input').render(el, { id, name, slotted });
}

class Input extends ParsedElement([], ['value']) {
    render() {
        const slotted = Slots.from(el);
        const fragment = makeInputFragment(this, slotted);
        this.replaceChildren(fragment);
    }
    get value() {
        return this.input.value;
    }
    set value(value) {
        this.input.value = value;
    }
}

export { makeInputFragment, Input };
