import { Fragments, Attributes, Templated } from "./elements.mjs"
import { Observable } from "../observable.mjs";
/**
 * <script src="tom-select.complete.js"></script>
 * <link href="tom-select.bootstrap5.css" rel="stylesheet" />
 */
const ful_select_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_select_template_ = globalThis.ful_select_template || ftl.Template.fromHtml(`
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
`, ful_select_ec);


class Select extends Templated(Observable(HTMLElement), ful_select_template_) {
    constructor(tsConfig) {
        super();
        this.tsConfig = tsConfig;
    }
    render(slotted, template) {
        const floating = this.hasAttribute('floating');
        const remote = this.hasAttribute('remote');
        const input = slotted.input = slotted.input || (() => {
            return document.createElement("select");
        })();
        const id = input.getAttribute('id') || this.getAttribute('input-id') || Attributes.uid('ful-select');
        Attributes.forward('input-', this, input)
        Attributes.defaultValue(input, "id", id);
        Attributes.defaultValue(input, "placeholder", " ");
        const name = input.getAttribute('name');
        input.setValue = this.setValue.bind(this);
        input.getValue = this.getValue.bind(this);

        //tomselect needs the input to have a parent.
        //se we move the input to a fragment
        slotted.input = Fragments.from(input);

        this.loaded = !remote;
        this.ts = new TomSelect(input, Object.assign(remote ? {
            preload: 'focus',
            load: async (query, callback) => {
                if (this.loaded) {
                    callback();
                    return;
                }
                const data = await this.fire('load', query, [])
                this.loaded = true;
                callback(data);
            }
        } : {}, this.tsConfig));

        return template.render({ id, name, floating, slotted });
    }
    async setValue(v) {
        if (!this.loaded) {
            await this.ts.load();
        }
        this.ts.setValue(v);
    }
    getValue() {
        const v = this.ts.getValue();
        return v === '' ? null : v;
    }
    static custom(tagName, configuration) {
        customElements.define(tagName, class extends Select {
            constructor() {
                super(configuration);
            }
        });
    }
    static configure() {
        return Select.custom('ful-select');
    }

}

export { Select };
