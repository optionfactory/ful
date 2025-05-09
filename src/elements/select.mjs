import { Fragments, Attributes, ParsedElement } from "@optionfactory/ftl"
import TomSelect  from "tom-select";
/**
 * <script src="tom-select.complete.js"></script>
 * <link href="tom-select.bootstrap5.css" rel="stylesheet" />
 */

class Select extends ParsedElement({
    observed: ["value"],
    slots: true,
    template: `
        <label data-tpl-for="tsId" class="form-label">{{{{ slots.default }}}}</label>
        {{{{ input }}}}
        <div class="input-group">
            <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
            <div data-tpl-if="slots.before" data-tpl-remove="tag">{{{{ slots.before }}}}</div>
            {{{{ slots.input }}}}
            <div data-tpl-if="slots.after" data-tpl-remove="tag">{{{{ slots.after }}}}</div>
            <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
        </div>
        <ful-field-error data-tpl-if="name" data-tpl-field="name" data-tpl-id="fieldErrorId"></ful-field-error>
    `
}) {
    shouldLoad;
    _unwrappedRemoteLoad;
    ts;
    #fieldError;
    static formAssociated = true;
    constructor(tsConfig) {
        super();
        this.tsConfig = tsConfig;
        this.internals = this.attachInternals();
    }
    render({slots}) {
        const type = this.getAttribute("type") ?? 'local';
        const remote = type != 'local';
        const loadOnce = this.getAttribute('load') != 'always';
        const name = this.getAttribute('name');
        const input = slots.input = slots.input?.firstElementChild ?? (() => {
            return document.createElement("select");
        })();
        input.setAttribute("form", "");

        const id = input.getAttribute('id') ?? this.getAttribute('input-id') ?? Attributes.uid('ful-select');
        const fieldErrorId = `${id}-error`;
        const tsId = `${id}-ts-control`;
        Attributes.forward('input-', this, input)
        Attributes.defaultValue(input, "id", id);
        Attributes.defaultValue(input, "placeholder", " ");
        Attributes.defaultValue(input, "aria-describedby", fieldErrorId);

        //tomselect needs the input to have a parent.
        //se we move the input to a fragment
        slots.input = Fragments.from(input);

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
        this.ts.control_input.setAttribute("form", "");
        this.ts.on('change', value => {
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                cancelable: false,
                detail: {
                    value: this.value
                }
            }));
        });
        //we remove the input to move it
        input.addEventListener('change', (evt) => {
            evt.stopPropagation();
        });
        input.remove();
        this.template().withOverlay({ id, tsId, name, input, slots }).renderTo(this);
        this.#fieldError = this.querySelector('ful-field-error');
    }
    #loader;
    set loader(l) {
        this.#loader = l;
        // loader can be configured later so we load now
        if (this.hasAttribute('value')) {
            this.value = this.getAttribute("value");
        }
    }
    get value() {
        const v = this.ts.getValue();
        return v === '' ? null : v;
    }
    set value(value) {
        (async () => {
            if (this._remote) {
                await this._unwrappedRemoteLoad({ byId: value }, this.ts.loadCallback.bind(this.ts));
            }
            const silent = true;
            this.ts.setValue(value, silent);
        })();
    }
    focus(options){
        this.ts.focus();
    }
    setCustomValidity(error){
        if(!error){
            this.internals.setValidity({});
            this.#fieldError.innerText = "";
            return;
        }
        this.internals.setValidity({customError: true}, " ");
        this.#fieldError.innerText = error;
    }
}

export { Select };
