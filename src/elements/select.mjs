import { Fragments, Attributes, Templated, CustomElements } from "./elements.mjs"
import { Observable } from "../observable.mjs";
/**
 * <script src="tom-select.complete.js"></script>
 * <link href="tom-select.bootstrap5.css" rel="stylesheet" />
 */
class Select extends Templated(Observable(HTMLElement)) {
    constructor(tsConfig) {
        super();
        this.tsConfig = tsConfig;
    }
    render(slotted, template) {
        const id = Attributes.uid('ful-select');
        const name = this.getAttribute('input-name');
        const floating = this.hasAttribute('floating');
        const remote = this.hasAttribute('remote');
        const input = slotted.input = slotted.input || (() => {
            return document.createElement("select");
        })();
        Attributes.forward('input-', this, input)
        Attributes.defaultValue(input, "name", id);
        Attributes.defaultValue(input, "id", id);
        Attributes.defaultValue(input, "placeholder", " ");
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
        return CustomElements.labelAndInputGroup(id, name || id, floating, slotted);

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
