import { Attributes, ParsedElement } from "@optionfactory/ftl"
import { Loaders } from "./loaders.mjs";
import { Timing } from "../timing.mjs";
import { VersionedLocalStorage } from "../storage.mjs";

class RemoteLoader {
    #http;
    #url;
    #method;
    #responseMapper;
    #prefetch;
    #revision;
    #data;
    static create({ el, http, responseMapper }) {
        return new RemoteLoader({
            http,
            url: el.getAttribute("src"),
            method: el.getAttribute("method") ?? 'POST',
            responseMapper,
            prefetch: el.hasAttribute("preload"),
            revision: el.getAttribute("revision")
        });
    }
    constructor({http, url, method, responseMapper, prefetch, revision}) {
        this.#http = http;
        this.#url = url;
        this.#method = method;
        this.#responseMapper = responseMapper;
        this.#prefetch = prefetch;
        this.#revision = revision;
        this.#data = null;
    }
    async prefetch() {
        if (!this.#prefetch) {
            return;
        }
        await this.#ensureFetched();
    }
    async exact(...keys) {
        await this.#ensureFetched();
        return this.#data.filter(([k, v]) => keys.some(r => r == k));
    }
    async load(needle) {
        await this.#ensureFetched();
        return this.#data.filter(([k, v]) => (v ?? '').includes(needle?.toLowerCase()));
    }
    async #ensureFetched() {
        if (this.#data !== null) {
            return
        }
        const storageKey = `${this.#method}@${this.#url}`;
        if(this.#revision !== null){
            const data = VersionedLocalStorage.load(storageKey, this.#revision);
            if(data !== undefined){
                this.#data = data;
                return;
            }
        }
        const data = await this.#http.request(this.#method, this.#url)
            .fetchJson()
        this.#data = this.#responseMapper(data);
        if(this.#revision !== null){
            VersionedLocalStorage.save(storageKey, this.#revision, this.#data);
        }
    }
}

class PartialRemoteLoader {
    #http;
    #url;
    #method;
    #responseMapper;
    static create({ el, http, responseMapper }) {
        return new PartialRemoteLoader({
            http,
            url: el.getAttribute("src"),
            method: el.getAttribute("method") ?? 'POST',
            responseMapper
        });
    }
    constructor({http, url, method, responseMapper}) {
        this.#http = http;
        this.#url = url;
        this.#method = method;
        this.#responseMapper = responseMapper;
    }
    async exact(...keys) {
        const data = await this.#http.request(this.#method, this.#url)
            .param("k", ...keys)
            .fetchJson()
        return this.#responseMapper(data);
    }
    async load(needle) {
        const data = await this.#http.request(this.#method, this.#url)
            .param("s", needle)
            .fetchJson()
        return this.#responseMapper(data);
    }
}

class InMemoryLoader {
    #data
    constructor(data) {
        this.#data = data;
    }
    update(data) {
        this.#data = data;
    }
    exact(...keys) {
        return this.#data.filter(([k, v]) => keys.some(r => r == k));
    }
    load(needle) {
        return this.#data.filter(([k, v]) => (v ?? '').includes(needle?.toLowerCase()));
    }
}


class SelectLoader {
    static create(conf) {
        if (!conf.el.hasAttribute("src")) {
            const els = Array.from(conf.options.options?.querySelectorAll('option') ?? []);
            const data = els.map(e => {
                return [e.getAttribute("value") ?? e.innerText.trim(), e.innerText.trim()];
            })
            return new InMemoryLoader(data);
        }
        const chunked = "chunked" == conf.el.getAttribute("mode");
        return chunked ? PartialRemoteLoader.create(conf) : RemoteLoader.create(conf);
    }
}

class Dropdown extends ParsedElement {
    static slots = true
    static template = `
        <ful-spinner class="centered" hidden></ful-spinner>
        <menu tabindex="-1" hidden></menu>
    `;
    #spinner;
    #menu;
    #options = new Map();
    render({ slots }) {
        const fragment = this.template().render();
        this.#spinner = fragment.querySelector("ful-spinner");
        this.#menu = fragment.querySelector("menu");
        this.#menu.addEventListener('click', evt => {
            evt.stopPropagation();
            if (!evt.target.matches('li')) {
                this.hide();
                return;
            }
            this.#change(evt.target);
        });
        this.replaceChildren(fragment);
    }
    acceptSelection() {
        const selected = this.#menu.querySelector('[selected]') ?? this.#menu.firstElementChild;
        this.#change(selected);
    }
    update(values) {
        if (values === undefined) {
            throw new Error("null data");
        }
        this.#options = new Map(values.map((v,i) => [String(i), v]));
        if (values.length === 0) {
            const el = document.createElement('div');
            el.classList.add('text-center', 'py-2', 'bi', 'bi-database-slash');
            this.#menu.replaceChildren(el);
            return;
        }
        this.#menu.replaceChildren(...values.map(([k, v, m], i) => {
            const el = document.createElement('li');
            if (i === 0) {
                el.setAttribute("selected", '');
            }
            el.setAttribute("value", i);
            el.innerText = v;
            return el;
        }));
    }
    #change(target) {
        const index = target.getAttribute('value');
        const data = this.#options.get(index)
        this.hide();
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            cancelable: false,
            detail: { index, data }
        }));
    }
    hide() {
        this.setAttribute('hidden', '')
    }
    get shown() {
        return !this.hasAttribute('hidden');
    }
    async show(loader) {
        this.removeAttribute('hidden');
        this.#menu.setAttribute('hidden', '');
        this.#spinner.removeAttribute('hidden');
        try {
            const data = await loader();
            this.update(data);
        } finally {
            this.#spinner.setAttribute('hidden', '');
            this.#menu.removeAttribute('hidden');
        }
    }
    async moveOrShow(forward, loader) {
        if (this.shown) {
            const selected = this.#menu.querySelector('[selected]') ?? this.#menu.firstElementChild;
            const candidate = selected[`${forward ? 'next' : 'previous'}ElementSibling`];
            if (candidate) {
                selected.removeAttribute('selected');
                candidate.setAttribute("selected", "");
                candidate.scrollIntoView({block: "nearest", behavior: "smooth"});
            }
            return;
        }
        await this.show(loader);
    }
}

class Select extends ParsedElement {
    static observed = ['value:csvm', 'readonly:presence']
    static slots = true
    static template = `
        <div class="form-label">
            <label>{{{{ slots.default }}}}</label>
            {{{{ slots.info }}}}
        </div>
        <div class="input-group flex-nowrap" tabindex="-1">
            <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
            {{{{ slots.before }}}}
            <div class="ful-select-input-container">
                <div class="ful-select-input">
                    <badges></badges>
                    <input type="text" form="">
                </div>
                <ful-dropdown hidden popover="manual"></ful-dropdown>
            </div>
            {{{{ slots.after }}}}
            <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
        </div>
        <ful-field-error></ful-field-error>
    `;
    static mappers = {
        "csvm": (v, name, el) => {
            if (el.hasAttribute("multiple")) {
                return v === null ? [] : v.split(",").map(e => e.trim()).filter(e => e)
            }
            return v === null || v === '' ? null : v
        }
    };
    static formAssociated = true
    internals
    #loader
    #badges
    #ddmenu
    #input
    #multiple
    #fieldError
    #values = new Map()
    constructor() {
        super();
        this.internals = this.attachInternals();
        this.internals.role = 'presentation';
    }
    async render({ slots, observed, disabled }) {
        const name = this.getAttribute("name");
        this.#loader = Loaders.fromAttributes(this, 'loaders:select', { options: slots.options });
        this.#multiple = this.hasAttribute("multiple");
        await this.#loader.prefetch?.();
        const fragment = this.template().withOverlay({ slots, name }).render();
        this.#input = fragment.querySelector('input');
        this.#badges = fragment.querySelector('badges');

        this.value = observed.value;
        this.disabled = disabled;
        this.readonly = observed.readonly;

        this.#ddmenu = fragment.querySelector('ful-dropdown');
        const label = fragment.querySelector('label');
        label.addEventListener('click', () => this.focus());
        this.#fieldError = fragment.querySelector('ful-field-error');
        this.#input.ariaDescribedByElements = [this.#fieldError];
        this.#input.ariaLabelledByElements = [label];

        const self = this;
        const [dload, abortdload] = Timing.throttle(400, () => self.#ddmenu.show(() => self.#loader.load(self.#input.value)));
        this.addEventListener('click', (/** @type any */e) => {
            if (e.target.matches('input')) {
                return;
            }
            if(this.disabled || this.readonly){
                return;
            }
            if (this.#ddmenu.shown) {
                this.#ddmenu.hide();
                return;
            }
            this.#input.focus();
            dload();
        })
        this.#badges.addEventListener('click', (e) => {
            e.stopPropagation();
            if(this.disabled || this.readonly){
                return;
            }
            const idx = [...this.#badges.children].indexOf(e.target);
            if (idx === -1) {
                return;
            }
            this.#values.delete(Array.from(this.#values.keys()).pop())
            this.#changed();
            this.#syncBadges();
        })

        this.#input.addEventListener('blur', e => {
            e.stopPropagation();
            if (e.relatedTarget && this.contains(e.relatedTarget)) {
                return;
            }
            abortdload();
            this.#ddmenu.hide();
            this.#input.value = '';
        });
        this.#input.addEventListener('keydown', e => {
            e.stopPropagation();
            if(this.disabled || this.readonly){
                return;
            }
            switch (e.code) {
                case 'ArrowUp': {
                    this.#ddmenu.moveOrShow(false, () => self.#loader.load(self.#input.value));
                    break;
                }
                case 'ArrowDown': {
                    this.#ddmenu.moveOrShow(true, () => self.#loader.load(self.#input.value));
                    break;
                }
                case 'Escape': {
                    this.#ddmenu.hide();
                    break;
                }
                case 'Enter': {
                    this.#ddmenu.acceptSelection();
                    this.#input.value = '';
                    break;
                }
                case 'Backspace': {
                    //remove last if caret a position 0
                    if (this.#values.size && this.#input.selectionStart === 0 && this.#input.selectionEnd === 0) {
                        this.#values.delete(Array.from(this.#values.keys()).pop())
                        this.#changed();
                        this.#syncBadges();
                    }
                    break;
                }
                case 'Tab': {
                    this.#ddmenu.hide();
                    abortdload();
                    break;
                }
            }
        });
        this.#input.addEventListener('input', e => {
            e.stopPropagation();
            if(this.disabled || this.readonly){
                return;
            }
            dload();
        });
        this.#ddmenu.addEventListener('change', (e) => {
            e.stopPropagation();
            if (!this.#multiple) {
                this.#values.clear();
            }
            this.#values.set(e.detail.data[0], e.detail.data.slice(1));
            this.#changed();
            this.#syncBadges();
            this.#input.focus();
            this.#ddmenu.hide();
        });
        this.replaceChildren(fragment);
    }
    withLoader(fn) {
        fn(this.#loader);
    }
    #changed() {
        const selection = [...this.#values.entries()].map(e => ({key: e[0], label: e[1][0], metadata: e[1].slice(1)}))
        const value = this.#multiple ? selection : (selection[0] ?? null);
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            cancelable: false,
            detail: { value }
        }));
    }
    #syncBadges() {
        const badges = Array.from(this.#values.entries()).map(([k, v]) => {
            const b = document.createElement('badge');
            b.setAttribute("role", "button");
            b.setAttribute("value", k);
            b.innerText = v;
            return b;
        });
        this.#badges.innerHTML = '';
        this.#badges.append(...badges);
    }
    set value(vs) {
        if(vs === null){
            this.#values = new Map();
            this.#syncBadges();
            return;            
        }
        (async () => {
            const entries = await (this.#multiple ? this.#loader.exact(...vs) : this.#loader.exact(vs));
            this.#values = new Map(entries);
            this.#syncBadges();
        })();
    }
    get value() {
        if (this.#multiple) {
            return [...this.#values.keys()];
        }
        return [...this.#values.keys()][0] ?? null;
    }
    get entry() {
        if (this.#multiple) {
            return [...this.#values.entries()];
        }
        return [...this.#values.entries()][0] ?? null;
    }
    //@ts-ignore
    get disabled(){
        return this.#input.hasAttribute('disabled');
    }
    set disabled(d){
        Attributes.toggle(this.#input, 'disabled', d);
    }    
    get readonly(){
        return this.#input.readOnly;
    }
    set readonly(v) {
        this.#input.readOnly = v;
    }    
    focus(options) {
        this.#input.focus(options);
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

export { SelectLoader, Select, Dropdown };