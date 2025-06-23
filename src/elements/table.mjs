import { Attributes, Fragments, Nodes, ParsedElement, registry } from "@optionfactory/ftl"
import { Loaders } from "./loaders.mjs";

class SortButton extends ParsedElement {
    static observed = ["order"];
    #order;
    render() {
        const sorter = this.getAttribute("sorter");
        const orders = ["asc", "desc", null];
        this.addEventListener('click', () => {
            const nextOrder = orders[(orders.indexOf(this.order) + 1) % 3];
            this.dispatchEvent(new CustomEvent('sort-requested', {
                bubbles: true,
                cancelable: true,
                detail: {
                    value: { sorter, order: nextOrder }
                }
            }));
        })
    }

    get order() {
        return this.#order || null;
    }

    set order(value) {
        this.#order = value || null;
        this.reflect(() => {
            if (this.#order) {
                this.setAttribute("order", value);
            } else {
                this.removeAttribute("order");
            }
        });
    }
}

class Pagination extends ParsedElement {
    static observed = ["total:number", "current:number"];
    static template = `
        <nav aria-label="Page navigation" class="user-select-none">
            <ul class="pagination">
                <li class="page-item ms-auto me-2" data-tpl-if="paginationLabel"> Showing page {{ curr.label }} of {{ total }}</li>
                <li class="page-item ms-auto me-2" data-tpl-if="!paginationLabel"></li>
                <li class="page-item">
                    <a data-tpl-class="prev.enabled?'page-link':'page-link disabled'" aria-label="Previous" role="button" data-tpl-data-page="prev.index">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
                <li class="page-item" data-tpl-each="pages" data-tpl-var="page">
                    <a data-tpl-class="curr.index != page.index ? 'page-link': 'page-link disabled'" role="button" data-tpl-data-page="page.index" >
                        {{ page.label }}
                    </a>
                </li>
                <li class="page-item">
                    <a data-tpl-class="next.enabled?'page-link':'page-link disabled'" aria-label="Next" role="button" data-tpl-data-page="next.index">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
    `;
    #paginationLabel;
    #total = 0;
    #current = 0;
    render({ observed }) {
        this.#paginationLabel = this.hasAttribute('pagination-label');
        this.update(observed.current ?? 0, observed.total ?? 0);
        this.addEventListener('click', (/** @type any */evt) => {
            const el = evt.target.closest('a');
            if (!el) {
                return;
            }
            this.dispatchEvent(new CustomEvent('page-requested', {
                bubbles: true,
                cancelable: true,
                detail: {
                    value: Number(el.dataset.page)
                }
            }));

        })
    }
    update(current, total) {
        const maxRender = Number(this.getAttribute('pages') ?? "5");
        const prev = { index: Math.max(0, current - 1), enabled: current > 0 };
        const curr = { index: current, label: current + 1 };
        const next = { index: Math.min(total, current + 1), enabled: current + 1 < total };
        const pages = [{
            index: current,
            label: current + 1
        }];
        for (let mid = current, offset = 1; offset !== maxRender && pages.length != maxRender; ++offset) {
            const p = mid - offset;
            if (p >= 0) {
                pages.unshift({ index: p, label: p + 1 });
            }
            const n = mid + offset;
            if (n < total) {
                pages.push({ index: n, label: n + 1 })
            }
        }
        const paginationLabel = this.#paginationLabel;
        this.template().withOverlay({ total, prev, curr, next, pages, paginationLabel }).renderTo(this);
    }
    get total() {
        return this.#total;
    }
    set total(value) {
        this.#total = value;
        this.reflect(() => {
            this.setAttribute('total', String(value));
            this.update(this.#current ?? 0, this.#total);
        })
    }
    get current() {
        return this.#current;
    }
    set current(value) {
        this.#current = value;
        this.reflect(() => {
            this.setAttribute('current', String(value));
            this.update(this.#current, this.#total ?? 0);
        })
    }
}

class TableSchemaParser {
    static parse(nodeOrFragment, template) {
        const schema = Nodes.queryChildren(nodeOrFragment, "schema");
        if (!schema) {
            throw new Error(`missing expected <schema> in ${nodeOrFragment}`);
        }
        return Nodes.queryChildrenAll(schema, "column")
            .map(el => {
                return {
                    sorter: el.getAttribute("sorter"),
                    order: el.getAttribute("order"),
                    title: TableSchemaParser.#parseTitle(el, template),
                    content: TableSchemaParser.#parseContent(el, template)
                }
            });
    }

    static #parseTitle(el, template) {
        const maybeTitleTag = Nodes.queryChildren(el, 'title');
        if (maybeTitleTag) {
            maybeTitleTag.remove();
        }
        const fragment = maybeTitleTag ? template.withFragment(Fragments.fromChildNodes(maybeTitleTag)).render() : document.createTextNode(el.getAttribute("title") ?? '');
        return {
            classes: el.getAttribute("th-class"),
            fragment
        };
    }

    static #parseContent(el, template) {
        return {
            classes: el.getAttribute("td-class"),
            template: template.withFragment(Fragments.fromChildNodes(el))
        }
    }
}

class RemoteTableLoader{
    #http;
    #url;
    #method;
    constructor(http, url, method){
        this.#http = http;
        this.#url = url;
        this.#method = method;
    }
    async load(pageRequest, sortRequest, filterRequest){
        const filters = Object.entries(filterRequest).filter(([k, v]) => v);
        return await this.#http.request(this.#method, this.#url)
            .param("page", pageRequest.page)
            .param("size", pageRequest.size)
            .param("sort", sortRequest.order ? `${sortRequest.sorter},${sortRequest.order}` : null)
            .param("filters", filters.length > 0 ? JSON.stringify(Object.fromEntries(filters)) : null)
            .fetchJson();
    }    
}


class TableLoader{
    static create({el, http}){
        const url = el.getAttribute("src");
        const method = el.getAttribute("method") ?? 'GET';
        return new RemoteTableLoader(http, url, method);
    }
}

class Table extends ParsedElement {
    static slots = true;
    static template = `
        <ful-form data-tpl-if="slots.filters">
            {{{{ slots.filters }}}}
        </ful-form>
        <div class="table-wrapper">
            <table class="table">
                <caption data-tpl-if="slots.caption">{{{{ slots.caption }}}}</caption>
                <thead>
                    <tr>
                        <th data-tpl-each="schema" scope="col" data-tpl-class="title.classes">
                            {{{{ title.fragment }}}}
                            <ful-sorter data-tpl-if="sorter || order" data-tpl-sorter="sorter" data-tpl-order="order"></ful-sorter>
                        </th>
                    </tr>
                </thead>
                <tbody></tbody>
                <tbody data-ref="no-autoload">
                    <tr>
                        <td data-tpl-colspan="schema.length" class="text-center align-middle p-4">
                            <i class="bi bi-search" style="font-size: 40px; color: #BDC3CA"></i>
                            <p class="mt-3 mb-0" style="color: #BDC3CA">
                                Avvia la ricerca per visualizzare i risultati...
                            </p>
                        </td>
                    </tr>
                </tbody>
                <tbody data-ref="loading" hidden>
                    <tr>
                        <td data-tpl-colspan="schema.length" class="text-center align-middle p-4">
                            <ful-spinner class="big"></ful-spinner>
                        </td>
                    </tr>
                </tbody>
                <tbody data-ref="feedback" hidden>
                    <tr>
                        <td data-tpl-colspan="schema.length" class="text-center align-middle p-4">
                            <div class="alert alert-danger">
                                <p>Errore nel caricamento della tabella:</p>
                                <p class="mb-0" data-ref="feedback-error"></p>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot data-tpl-if="slots.footer">
                    {{{{ slots.footer }}}}
                </tfoot>
            </table>
        </div>
        <ful-pagination current="0" total="1"></ful-pagination>
    `;
    static templates = {
        row: `
            <tr data-tpl-if="pageResponse.data.length == 0">
                <td data-tpl-colspan="schema.length" class="text-center align-middle p-4">
                    Nessun elemento trovato.
                </td>
            </tr>
            <tr data-tpl-each="pageResponse.data" data-tpl-var="row">
                <td data-tpl-each="schema" data-tpl-class="content.classes">
                    {{{{ content.template.withOverlay(row).render() }}}}
                </td>
            </tr>
        `
    };
    #schema;
    #body;
    #loading;
    #noAutoload;
    #feedback;
    #paginator;
    #sorters;
    #latestRequest;
    async render({ slots, observed }) {
        const template = this.template();
        const schema = TableSchemaParser.parse(slots.default, template);
        const fragment = template.withOverlay({ slots, schema }).render();
        const tableWrapper = /** @type HTMLTableElement */ (Nodes.queryChildren(fragment, '.table-wrapper'));
        const table = /** @type HTMLTableElement */ (tableWrapper.querySelector("table"));
        Attributes.forward('table-', this, table);
        this.#schema = schema;
        this.#body = table.querySelector(':scope > tbody');
        this.#loading = table.querySelector(":scope > tbody[data-ref=loading]");
        this.#noAutoload = table.querySelector(":scope > tbody[data-ref=no-autoload]");
        this.#feedback = table.querySelector(":scope > tbody[data-ref=feedback]");
        this.#paginator = Nodes.queryChildren(fragment, 'ful-pagination');
        this.#sorters = table.querySelectorAll(':scope > thead ful-sorter') ?? [];
        this.replaceChildren(fragment);
        await registry.waitForChildrenRendered(this);
        const orderFromSchema = schema.find(v => v.order);

        const maybeForm = /** @type any */(Nodes.queryChildren(this, 'ful-form'));
        this.#latestRequest = {
            pageRequest: {
                page: 0,
                size: this.getAttribute("page-size") ? Number(this.getAttribute("page-size")) : 10
            },
            sortRequest: { order: orderFromSchema?.order, sorter: orderFromSchema?.sorter },
            filterRequest: maybeForm?.values ?? {}
        }
        maybeForm?.addEventListener('submit:success', async (evt) => {
            await this.load({
                page: 0,
                size: this.#latestRequest.pageRequest.size
            }, this.#latestRequest.sortRequest, evt.detail.request);
        })
        this.addEventListener('page-requested', async (/** @type any */e) => {
            await this.load({
                page: e.detail.value,
                size: this.#latestRequest.pageRequest.size
            }, this.#latestRequest.sortRequest, this.#latestRequest.filterRequest);
        });
        this.addEventListener('sort-requested', async (/** @type any */e) => {
            await this.load(this.#latestRequest.pageRequest, e.detail.value, this.#latestRequest.filterRequest);
            this.#sorters.forEach(s => s.order = null);
            e.target.order = e.detail.value.order;
        })
        if (this.hasAttribute('autoload')) {
            await this.reload();
        }
    }

    async reload() {
        return await this.load(this.#latestRequest.pageRequest, this.#latestRequest.sortRequest, this.#latestRequest.filterRequest);
    }
    async load(pageRequest, sortRequest, filterRequest) {
        this.#body.innerHTML = "";
        this.#loading.removeAttribute("hidden", "");
        this.#feedback.setAttribute("hidden", "");
        this.#noAutoload.setAttribute("hidden", "");
        try {
            const loader = Loaders.fromAttributes(this, 'loaders:table');
            const pageResponse =await loader.load(pageRequest, sortRequest, filterRequest);
            this.#latestRequest = { pageRequest, sortRequest, filterRequest };
            this.#update(pageRequest, sortRequest, filterRequest, pageResponse);
        } catch (/** @type any */error) {
            this.#loading.setAttribute("hidden", "");
            this.#feedback.removeAttribute("hidden", "");
            if (!error.problems) {
                this.#feedback.querySelector('[data-ref=feedback-error]').textContent = error;
            } else {
                this.#feedback.querySelector('[data-ref=feedback-error]').textContent = error.problems.map(p => `${p.reason}`);
            }
            throw error;
        }
    }

    async resetWithFilter(filterRequest) {
        return await this.load({
            page: 0,
            size: this.#latestRequest.pageRequest.size
        }, this.#latestRequest.sortRequest, filterRequest);
    }

    #update(pageRequest, sortRequest, filterRequest, pageResponse) {
        this.#loading.setAttribute("hidden", "");
        this.#body.replaceChildren(this.template('row').withOverlay({
            schema: this.#schema,
            pageRequest,
            filterRequest,
            pageResponse
        }).render());
        this.#paginator.current = pageRequest.page;
        this.#paginator.total = Math.ceil(pageResponse.size / pageRequest.size);
    }
}

export { TableLoader, SortButton, Table, TableSchemaParser, Pagination }