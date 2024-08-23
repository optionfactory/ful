import { Attributes, Fragments, Events, ParsedElement } from "./elements.mjs"

class RadioGroup extends ParsedElement({
    observed: ['value', 'disabled:state'],
    slots: true,
    template: `
        <fieldset ful-validated-field>
            <legend class="form-label">
                {{{{ slots.default }}}}
            </legend>
            <header data-tpl-if="slots.header">
                {{{{ slots.header }}}}
            </header>
            <section>
                <div class="label-wrapper" data-tpl-each="inputsAndLabels" data-tpl-var="ial">
                    <label>
                        {{{{ ial[0] }}}}
                        {{{{ ial[1] }}}}
                    </label>
                </div>
            </section>
            <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
            <footer data-tpl-if="slots.footer">
                {{{{ slots.footer }}}}
            </footer>
        </fieldset>
    `
}) {
    render(template, slots) {
        const name = this.getAttribute('name') || Attributes.uid('ful-radiogroup');
        const radioEls = Array.from(slots.default.querySelectorAll('ful-radio'));
        const inputsAndLabels = radioEls.map(el => {
            const input = document.createElement('input');
            input.setAttribute('type', 'radio');
            Attributes.forward('input-', this, input);
            Attributes.forward('', el, input);
            input.setAttribute('name', `${name}-ignore`);
            input.setAttribute('ful-validation-target', '');
            input.dataset['fulBindInclude'] = 'never';
            input.addEventListener('change', evt => {
                evt.stopPropagation();
                //change is not cancelable
                Events.dispatchChange(this, this.value);
            });           
            const label = Fragments.fromChildNodes(el);
            return [input, label];
        });

        radioEls.forEach(el => el.remove());
        template.renderTo(this, {name, slots, inputsAndLabels});
    }
    get value() {
        const checked = this.querySelector('input[type=radio]:checked');
        return checked ? checked.value : null;
    }
    set value(value) {
        if(!Events.dispatchChange(this, value)){
            return;
        }
        this.querySelector(`input[type=radio][value=${CSS.escape(value)}]`).checked = true;
    }
}


export { RadioGroup };