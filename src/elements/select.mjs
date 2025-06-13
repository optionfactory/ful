import { Attributes, ParsedElement } from "@optionfactory/ftl"
import { Loaders } from "./loaders.mjs";
import { timing } from "../timing.mjs";

class CompleteSelectLoader {
    #http;
    #url;
    #method;
    #responseMapper;
    #prefetch;
    #data;
    constructor(http, url, method, responseMapper, prefetch) {
        this.#http = http;
        this.#url = url;
        this.#method = method;
        this.#responseMapper = responseMapper;
        this.#prefetch = prefetch;
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
        return this.#data.filter(([k, v]) => keys.includes(k));
    }
    async load(needle) {
        await this.#ensureFetched();
        return this.#data.filter(([k, v]) => v.includes(needle?.toLowerCase()));
    }
    async #ensureFetched() {
        if (this.#data !== null) {
            return
        }
        const data = await this.#http.request(this.#method, this.#url)
            .fetchJson()
        this.#data = this.#responseMapper(data);
    }
    static create({ el, http, responseMapper }) {
        return new CompleteSelectLoader(
            http,
            el.getAttribute("src"),
            el.getAttribute("method") ?? 'POST',
            responseMapper,
            el.hasAttribute("preload")
        );
    }
}

class ChunkedSelectLoader {
    #http;
    #url;
    #method;
    #responseMapper;
    constructor(http, url, method, responseMapper) {
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
    static create({ el, http, responseMapper }) {
        return new ChunkedSelectLoader(
            http,
            el.getAttribute("src"),
            el.getAttribute("method") ?? 'POST',
            responseMapper
        );
    }
}

class OptionsSlotSelectLoader {
    #data
    constructor(data) {
        this.#data = data;
    }
    async exact(...keys) {
        return this.#data.filter(([k, v]) => keys.includes(k));
    }
    async load(needle) {
        return this.#data.filter(([k, v]) => v.includes(needle?.toLowerCase()));
    }
}


class SelectLoader {
    static create(conf) {
        if (!conf.el.hasAttribute("src")) {
            const els = Array.from(conf.options.options?.querySelectorAll('option') ?? []);
            const data = els.map(e => {
                return [e.getAttribute("value") ?? e.innerText.trim(), e.innerText.trim()];
            })
            return new OptionsSlotSelectLoader(data);
        }
        const chunked = "chunked" == conf.el.getAttribute("mode");
        return chunked ? ChunkedSelectLoader.create(conf) : CompleteSelectLoader.create(conf);
    }
}

class Dropdown extends ParsedElement {
    static slots = true
    static template = `
        <ful-spinner class="centered" hidden></ful-spinner>
        <menu tabindex="-1" hidden></menu>
    `;
    #spinner
    #menu
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
        if (values.length === 0) {
            const el = document.createElement('div');
            el.classList.add('text-center', 'py-2', 'bi', 'bi-database-slash');
            this.#menu.replaceChildren(el);
            return;
        }
        this.#menu.replaceChildren(...values.map(([k, v], i) => {
            const el = document.createElement('li');
            if (i === 0) {
                el.setAttribute("selected", '');
            }
            el.setAttribute("value", k);
            el.innerText = v;
            return el;
        }));
    }
    #change(target) {
        const value = target.getAttribute('value');
        const label = target.innerText
        this.hide();
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            cancelable: false,
            detail: { label, value }
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
        if (!this.hasAttribute("hidden")) {
            const selected = this.#menu.querySelector('[selected]') ?? this.#menu.firstElementChild;
            const candidate = selected[`${forward ? 'next' : 'previous'}ElementSibling`];
            if (candidate) {
                selected.removeAttribute('selected');
                candidate.setAttribute("selected", "");
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
        <label class="form-label">{{{{ slots.default }}}}</label>
        <div class="input-group flex-nowrap" tabindex="-1">
            <span data-tpl-if="slots.ibefore" class="input-group-text">{{{{ slots.ibefore }}}}</span>
            {{{{ slots.before }}}}
            <div class="ful-select-input">
                <badges></badges>
                <input type="text" form="">
            </div>
            {{{{ slots.after }}}}
            <span data-tpl-if="slots.iafter" class="input-group-text">{{{{ slots.iafter }}}}</span>
        </div>
        <ful-dropdown hidden></ful-dropdown>
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
        await this.#loader.prefetch?.();
        const fragment = this.template().withOverlay({ slots, name }).render();
        this.#input = fragment.querySelector('input');
        this.#badges = fragment.querySelector('badges');

        this.value = observed.value;
        this.disabled = disabled;
        this.readonly = observed.readonly;

        this.#ddmenu = fragment.querySelector('ful-dropdown');
        this.#multiple = this.hasAttribute("multiple");
        const label = fragment.querySelector('label');
        label.addEventListener('click', () => this.focus());
        this.#fieldError = fragment.querySelector('ful-field-error');
        this.#input.ariaDescribedByElements = [this.#fieldError];
        this.#input.ariaLabelledByElements = [label];

        const self = this;
        const [dload, abortdload] = timing.debounce(400, () => self.#ddmenu.show(() => self.#loader.load(self.#input.value)));
        this.addEventListener('click', (/** @type any */e) => {
            e.stopPropagation();
            if (e.target.matches('input')) {
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
            const idx = [...this.#badges.children].indexOf(e.target);
            if (idx === -1) {
                return;
            }
            this.#values.delete(Array.from(this.#values.keys()).pop())
            this.#syncBadges();
        })

        this.#input.addEventListener('blur', e => {
            if (e.relatedTarget && this.contains(e.relatedTarget)) {
                return;
            }
            abortdload();
            this.#ddmenu.hide();
            this.#input.value = '';
        });
        this.#input.addEventListener('keydown', e => {
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
            dload();
        });
        this.#ddmenu.addEventListener('change', (e) => {
            if (!this.#multiple) {
                this.#values.clear();
            }
            this.#values.set(e.detail.value, e.detail.label);
            this.#syncBadges();
            this.#input.focus();
            this.#ddmenu.hide();
        });
        this.replaceChildren(fragment);
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
    set value(value) {
        if(value === null){
            this.#values = new Map();
            this.#syncBadges();
            return;            
        }
        (async () => {
            const entries = await (this.#multiple ? this.#loader.exact(...value) : this.#loader.exact(value));
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