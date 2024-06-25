import { Attributes, Stateful, Templated } from "./elements.mjs"

const ful_input_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_input_template_ = globalThis.ful_input_template || ftl.Template.fromHtml(`
    <label data-tpl-for="id" class="form-label">{{{{ slotted.default }}}}</label>
    <div class="input-group">
        <span data-tpl-if="slotted.ibefore" class="input-group-text">{{{{ slotted.ibefore }}}}</span>
        <div data-tpl-if="slotted.before" data-tpl-remove="tag">{{{{ slotted.before }}}}</div>
        {{{{ slotted.input }}}} 
        <div data-tpl-if="slotted.after" data-tpl-remove="tag">{{{{ slotted.after }}}}</div>
        <span data-tpl-if="slotted.iafter" class="input-group-text">{{{{ slotted.iafter }}}}</span>
    </div>
    <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
`, ful_input_ec);

class StatelessInput extends Templated(HTMLElement, ful_input_template_) {
    render(slotted, template) {
        const input = this.input = slotted.input = slotted.input || (() => {
            const el = document.createElement("input")
            el.classList.add("form-control");
            return el;
        })();
        input.setAttribute('ful-validation-target', '');

        const id = input.getAttribute('id') || this.getAttribute('input-id') || Attributes.uid('ful-input');
        Attributes.forward('input-', this, slotted.input)
        Attributes.defaultValue(slotted.input, "id", id);
        Attributes.defaultValue(slotted.input, "type", "text");
        Attributes.defaultValue(slotted.input, "placeholder", " ");
        const name = this.getAttribute('name');
        return template.render({ id, name, slotted });
    }

}

class Input extends Stateful(StatelessInput, [], ['value']) {
    render(slotted, template) {
        const fragment = super.render(slotted, template);
        this.input.value = this.getAttribute('value');
        return fragment;
    }
    get value() {
        if (!this.input) {
            return this.getAttribute('value');
        }
        return this.input.value;
    }
    set value(value) {
        if (!this.input) {
            //handled during rendering
            return;
        }
        this.input.value = value;
    }
    static configure() {
        customElements.define('ful-input', Input);
    }
}

export { StatelessInput, Input };
