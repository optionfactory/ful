import { Attributes, Fragments, ParsedElement,  Templated, Stateful } from "./elements.mjs"





const ful_radiogroup_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_radiougroup_template_ = globalThis.ful_radiogroup_template || ftl.Template.fromHtml(`
    <fieldset>
        <legend class="form-label">
            {{{{ slotted.default }}}}
        </legend>
        <header data-tpl-if="slotted.header">
            {{{{ slotted.header }}}}
        </header>
        <section>
            <label data-tpl-each="inputsAndLabels" data-tpl-var="ial">
                {{{{ ial[0] }}}}
                {{{{ ial[1] }}}}
            </label>
        </section>
        <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
        <footer data-tpl-if="slotted.footer">
            {{{{ slotted.footer }}}}
        </footer>
    </fieldset>
`, ful_radiogroup_ec);


class RadioGroup extends Stateful(Templated(ParsedElement, ful_radiougroup_template_), ['disabled'], ['value']) {
    render(slotted, template) {        
        const name = this.getAttribute('name') || Attributes.uid('ful-radiogroup');
        const radioEls = Array.from(slotted.default.querySelectorAll('ful-radio'));
        const inputsAndLabels = radioEls.map(el => {
            const input = document.createElement('input');
            input.setAttribute('type', 'radio');
            Attributes.forward('input-', this, input);
            Attributes.forward('', el, input);
            input.setAttribute('name', `${name}-ignore`);
            input.setAttribute('ful-validation-target', '');
            input.dataset['fulBindInclude'] = 'never';
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
    get value() {
        const checked = this.querySelector('input[type=radio]:checked');
        return checked ? checked.value : null;
    }
    set value(value){
        this.querySelector(`input[type=radio][value=${CSS.escape(value)}]`).checked = true;
    }
}


export { RadioGroup };