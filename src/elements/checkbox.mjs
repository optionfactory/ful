import { Attributes, Fragments, ParsedElement } from "@optionfactory/ftl";
import { makeInputFragment } from "./input.mjs";

class Checkbox extends ParsedElement({
    observed: ['value:bool'],
    slots: true,
    template: `
        <div ful-validated-field>
            <div data-tpl-class="klass">
                {{{{ slots.input }}}}
                <label data-tpl-for="id" class="form-check-label">{{{{ slots.default }}}}</label>
            </div>
            <ful-field-error data-tpl-if="name" data-tpl-field="name" ></ful-field-error>
        </div>
    `
}) {
    input;

    render({slots}) {
        const input = document.createElement('input');
        input.setAttribute("class", "form-check-input");
        input.setAttribute("type", "checkbox");
        input.setAttribute("role", "switch");

        const klass = this.getAttribute('type') == 'switch' ? "form-check form-switch" : "form-check";
        const fragment = makeInputFragment(this, this.template().withOverlay({klass}), {...slots, input: Fragments.from(input)});
        this.replaceChildren(fragment);
    }

    get value() {
        return this.input.checked;
    }

    set value(value) {
        this.input.checked = value;
    }
}

export { Checkbox }