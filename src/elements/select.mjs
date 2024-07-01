import { Fragments, Attributes, Slots, templates, ParsedElement } from "./elements.mjs"

/**
 * <script src="tom-select.complete.js"></script>
 * <link href="tom-select.bootstrap5.css" rel="stylesheet" />
 */

templates.put('ful-select', Fragments.fromHtml(`
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
`));


class Select extends ParsedElement([], ["value"]) {
    constructor(tsConfig) {
        super();
        this.tsConfig = tsConfig;
    }
    render() {
        const slotted = Slots.from(this);

        const type = this.getAttribute("type") || 'local';
        const remote = type != 'local';
        const loadOnce = this.getAttribute('load') != 'always';
        const name = this.getAttribute('name');
        const input = slotted.input = slotted.input || (() => {
            return document.createElement("select");
        })();
        input.setAttribute('ful-validation-target', '');

        const id = input.getAttribute('id') || this.getAttribute('input-id') || Attributes.uid('ful-select');
        const tsId = `${id}-ts-control`;
        Attributes.forward('input-', this, input)
        Attributes.defaultValue(input, "id", id);
        Attributes.defaultValue(input, "placeholder", " ");

        //tomselect needs the input to have a parent.
        //se we move the input to a fragment
        slotted.input = Fragments.from(input);

        this.loaded = !remote;

        const tsDefaultConfig = {
            render: {
                loading: () => '<ful-spinner class="centered p-2"></ful-spinner>'
            }
        }

        this._remote = remote;
        // we need to await this load in setValue when remote is configured and the option
        // is not loaded yet.
        // tomselect settings.load does not retun a promise as it wraps the configured load function
        // with a debouncer
        this._unwrappedRemoteLoad = async (query, callback) => {

            if (!remote || remote && loadOnce && this.loaded) {
                callback();
                return;
            }
            const type = query && query.hasOwnProperty('byId') ? 'id' : 'query';
            const qvalue = type === 'id' ? query.byId : query;
            const data = await (this.#loader ? this.#loader(qvalue, type) : []);
            if (type !== 'id') {
                this.loaded = true;
            }
            callback(data);
        };


        this.ts = new TomSelect(input, Object.assign(remote ? {
            preload: 'focus',
            load: this._unwrappedRemoteLoad,
            shouldLoad: (query) => this.shouldLoad ? this.shouldLoad(query) : true
        } : {}, tsDefaultConfig, this.tsConfig));
        //we remove the input to move it
        input.remove();
        templates.get('ful-select').renderTo(this, { id, tsId, name, input, slotted });
    }
    #loader;
    set loader(l){
        this.#loader = l;
        // loader can be configured later so we load now
        if(this.hasAttribute('value')){
            this.value = this.getAttribute("value");
        }
    }
    set value(v) {
        (async () => {
            if (this._remote) {
                await this._unwrappedRemoteLoad({ byId: v }, this.ts.loadCallback.bind(this.ts));
            }
            this.ts.setValue(v);
        })();
    }
    get value() {
        const v = this.ts.getValue();
        return v === '' ? null : v;
    }
}

export { Select };
