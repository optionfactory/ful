import { Fragments, Attributes, Templated } from "./elements.mjs"
import { Observable } from "../observable.mjs";
/**
 * <script src="tom-select.complete.js"></script>
 * <link href="tom-select.bootstrap5.css" rel="stylesheet" />
 */
const ful_select_ec = globalThis.ec || ftl.EvaluationContext.configure({

});

const ful_select_template_ = globalThis.ful_select_template || ftl.Template.fromHtml(`
    <div data-tpl-if="floating" data-tpl-remove="tag">
        <div class="input-group">
            <span data-tpl-if="slotted.ibefore" class="input-group-text">{{{{ slotted.ibefore }}}}</span>
            <div data-tpl-if="slotted.before" data-tpl-remove="tag">{{{{ slotted.before }}}}</div>
            <div class="form-floating">
                {{{{ slotted.input }}}} 
                {{{{ input }}}}
                <label data-tpl-for="name" class="form-label">{{{{ slotted.default }}}}</label>
            </div>
            <div data-tpl-if="slotted.after" data-tpl-remove="tag">{{{{ slotted.after }}}}</div>
            <span data-tpl-if="slotted.iafter" class="input-group-text">{{{{ slotted.iafter }}}}</span>
        </div>
        <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>
    </div>
    <div data-tpl-if="!floating" data-tpl-remove="tag">
        <label data-tpl-for="tsId" class="form-label">{{{{ slotted.default }}}}</label>
        {{{{ input }}}}
        <div class="input-group">
            <span data-tpl-if="slotted.ibefore" class="input-group-text">{{{{ slotted.ibefore }}}}</span>
            <div data-tpl-if="slotted.before" data-tpl-remove="tag">{{{{ slotted.before }}}}</div>
            {{{{ slotted.input }}}} 
            <div data-tpl-if="slotted.after" data-tpl-remove="tag">{{{{ slotted.after }}}}</div>
            <span data-tpl-if="slotted.iafter" class="input-group-text">{{{{ slotted.iafter }}}}</span>
        </div>
        <ful-field-error data-tpl-if="name" data-tpl-field="name"></ful-field-error>            
    </div>
`, ful_select_ec);


class Select extends Templated(HTMLElement, ful_select_template_) {
    constructor(tsConfig) {
        super();
        this.tsConfig = tsConfig;
    }
    render(slotted, template) {
        const floating = this.hasAttribute('floating');

        const type = this.getAttribute("type") || 'local';
        const remote = type != 'local';
        const loadOnce = this.getAttribute('load') != 'always';

        const input = slotted.input = slotted.input || (() => {
            return document.createElement("select");
        })();
        const id = input.getAttribute('id') || this.getAttribute('input-id') || Attributes.uid('ful-select');
        const tsId = `${id}-ts-control`;
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

        const tsDefaultConfig = {
            render: {
                loading: () => '<ful-spinner class="centered p-2"></ful-spinner>'
            }
        }

        this.ts = new TomSelect(input, Object.assign(remote ? {
            preload: 'focus',
            load: async (query, callback) => {
                if (!remote || remote && loadOnce && this.loaded) {
                    callback();
                    return;
                }
                const data = await this.load(query);
                this.loaded = true;
                callback(data);
            },
            shouldLoad: (query) => this.shouldLoad(query)
        } : {}, tsDefaultConfig, this.tsConfig));

        //we remove the input to move it
        input.remove();

        return template.render({ id, tsId, name, floating, input, slotted });
    }
    shouldLoad(q){
        return true;
    }
    load(q){
        return []
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
