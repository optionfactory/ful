import { Attributes, Fragments, ParsedElement } from "@optionfactory/ftl"

class RadioGroup extends ParsedElement {
    static observed = ['value'];
    static slots = true;
    static template = `
        <fieldset data-tpl-aria-describedby="fieldErrorId">
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
            <ful-field-error data-tpl-id="fieldErrorId"></ful-field-error>
            <footer data-tpl-if="slots.footer">
                {{{{ slots.footer }}}}
            </footer>
        </fieldset>
    `;
    static formAssociated = true;
    #fieldError;
    #firstRadio;
    constructor() {
        super();
        this.internals = this.attachInternals();
    }
    render({ slots }) {
        const name = this.getAttribute('name') ?? Attributes.uid('ful-radiogroup');
        const radioEls = Array.from(slots.default.querySelectorAll('ful-radio'));
        const inputsAndLabels = radioEls.map(el => {
            const input = document.createElement('input');
            input.setAttribute('type', 'radio');
            Attributes.forward('input-', this, input);
            Attributes.forward('', el, input);
            input.setAttribute('name', `${name}-ignore`);
            input.setAttribute('form', ``);
            input.addEventListener('change', evt => {
                evt.stopPropagation();
                //change is not cancelable
                this.dispatchEvent(new CustomEvent('change', {
                    bubbles: true,
                    cancelable: false,
                    detail: {
                        value: this.value
                    }
                }));
            });
            const label = Fragments.fromChildNodes(el);
            return [input, label];
        });

        radioEls.forEach(el => el.remove());
        const fieldErrorId = Attributes.uid("ful-error")
        this.template().withOverlay({ name, fieldErrorId, slots, inputsAndLabels }).renderTo(this);
        this.#fieldError = this.querySelector('ful-field-error');
        this.#firstRadio = this.querySelector('input[type=radio]');
    }
    get value() {
        /** @type {HTMLInputElement|null} */
        const checked = this.querySelector('input[type=radio]:checked');
        return checked ? checked.value : null;
    }
    set value(value) {
        if (value === null) {
            this.querySelectorAll(`input[type=radio]`).forEach(el => {
                (/** @type {HTMLInputElement} */(el)).checked = false
            });
            return;
        }
        /** @type {HTMLInputElement|null} */
        const el = this.querySelector(`input[type=radio][value=${CSS.escape(value)}]`);
        if (el) {
            el.checked = true;
        }
    }
    focus(options) {
        this.#firstRadio.focus(options);
    }
    setCustomValidity(error) {
        if (!error) {
            this.internals.setValidity({});
            this.#fieldError.innerText = "";
            return;
        }
        this.internals.setValidity({ customError: true }, " ");
        this.#fieldError.innerText = error;
    }
}

export { RadioGroup };