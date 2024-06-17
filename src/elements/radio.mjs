import { Attributes, Fragments, Stateful, Templated } from "./elements.mjs"





const ful_radiogroup_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_radiougroup_template_ = globalThis.ful_radiogroup_template || ftl.Template.fromHtml(`
    <fieldset>
        <legend class="form-label">
            {{{{ slotted.default }}}}
        </legend>
        <section>
            <label data-tpl-each="inputsAndLabels" data-tpl-var="ial">
                {{{{ ial[0] }}}}
                {{{{ ial[1] }}}}
            </label>
        </section>
        <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
    </fieldset>
`, ful_radiogroup_ec);


class RadioGroup extends Stateful(Templated(HTMLElement, ful_radiougroup_template_), ['readonly']) {
    render(slotted, template) {        
        const name = this.getAttribute('input-name') || Attributes.uid('ful-radiogroup');
        const radioEls = Array.from(slotted.default.querySelectorAll('ful-radio'));
        const inputsAndLabels = radioEls.map(el => {
            const input = document.createElement('input');
            input.setAttribute('type', 'radio');
            Attributes.forward('input-', this, input);
            Attributes.forward('', el, input);
            Attributes.defaultValue(input, 'name', name);
            const label = Fragments.fromChildNodes(el);
            return [input, label];
        });
        radioEls.forEach(el => el.remove());
        
        const fragment = template.render({
            name: name,
            slotted: slotted,
            inputsAndLabels: inputsAndLabels
        });
        return fragment;
    }
    static configure() {
        customElements.define('ful-radio-group', RadioGroup);
    }    
}


export { RadioGroup };