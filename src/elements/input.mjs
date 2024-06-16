import { Attributes, Templated } from "./elements.mjs"

const ful_input_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_input_template_ = globalThis.ful_input_template || ftl.Template.fromHtml(`
    <div data-tpl-if="floating" class="input-group has-validation">
        <span data-tpl-if="slotted.ibefore" class="input-group-text">{{{{ slotted.ibefore }}}}</span>
        <div data-tpl-if="slotted.before" data-tpl-remove="tag">{{{{ slotted.before }}}}</div>
        <div class="form-floating">
            {{{{ slotted.input }}}} 
            <label data-tpl-for="name" class="form-label">{{{{ slotted.default }}}}</label>
        </div>
        <div data-tpl-if="slotted.after" data-tpl-remove="tag">{{{{ slotted.after }}}}</div>
        <span data-tpl-if="slotted.iafter" class="input-group-text">{{{{ slotted.iafter }}}}</span>
        <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
    </div>
    <div data-tpl-if="!floating" data-tpl-remove="tag">
        <label data-tpl-for="id" class="form-label">{{{{ slotted.default }}}}</label>
        <div class="input-group has-validation">
            <span data-tpl-if="slotted.ibefore" class="input-group-text">{{{{ slotted.ibefore }}}}</span>
            <div data-tpl-if="slotted.before" data-tpl-remove="tag">{{{{ slotted.before }}}}</div>
            {{{{ slotted.input }}}} 
            <div data-tpl-if="slotted.after" data-tpl-remove="tag">{{{{ slotted.after }}}}</div>
            <span data-tpl-if="slotted.iafter" class="input-group-text">{{{{ slotted.iafter }}}}</span>
            <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
        </div>
    </div>
`, ful_input_ec);



class Input extends Templated(HTMLElement, ful_input_template_) {
    render(slotted, template) {
        const floating = this.hasAttribute('floating');
        const input = slotted.input = slotted.input || (() => {
            const el = document.createElement("input")
            el.classList.add("form-control");
            return el;
        })();
        const id = input.getAttribute('id') || this.getAttribute('input-id') || Attributes.uid('ful-input');
        Attributes.forward('input-', this, slotted.input)
        Attributes.defaultValue(slotted.input, "id", id);
        Attributes.defaultValue(slotted.input, "type", "text");
        Attributes.defaultValue(slotted.input, "placeholder", " ");
        const name = input.getAttribute('name');
        return template.render({ id, name, floating, slotted });
    }
    static configure() {
        customElements.define('ful-input', Input);
    }
}




export { Input };
