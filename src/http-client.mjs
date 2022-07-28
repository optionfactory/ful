class ContextInterceptor {
    constructor() {
        const context = document.querySelector("meta[name='context']").getAttribute("content");
        this.context = context.endsWith("/") ? context.substring(0, context.length - 1) : context;
    }
    before(request) {
        const separator = request.resource.startsWith("/") ? "" : "/";
        request.resource = this.context + separator + request.resource;
    }
}

class CsrfTokenInterceptor {
    k;
    v;
    constructor() {
        this.k = document.querySelector("meta[name='_csrf_header']").getAttribute("content");
        this.v = document.querySelector("meta[name='_csrf']").getAttribute("content");
    }
    before(request) {
        const headers = new Headers(request.options.headers);
        headers.set(this.k, this.v);
        request.options.headers = headers;
    }
}

class RedirectOnUnauthorizedInterceptor {
    constructor(redirectUri) {
        this.redirectUri = redirectUri;
    }
    after(request, response) {
        if (response.status !== 401) {
            return;
        }
        window.location.href = redirectUri;
    }
}

class Failure extends Error {
    problems;

    static parseProblems(status, text) {
        const def = [{
                type: "GENERIC_PROBLEM",
                context: null,
                reason: `${status}: ${text}`,
                details: null
            }];
        try {
            return text ? [JSON.parse(text)] : def;
        } catch (e) {
            return def;
        }
    }
    static fromResponse(status, text) {
        return new Failure(status, Failure.parseProblems(status, text));
    }
    constructor(status, problems) {
        super(problems.join(","));
        this.name = `Failure:${status}`;
        this.status = status;
        this.problems = problems;
    }
}

class HttpClientBuilder {
    interceptors;
    constructor() {
        this.interceptors = [];
    }
    withContext() {
        this.interceptors.push(new ContextInterceptor());
        return this;
    }
    withCsrfToken() {
        this.interceptors.push(new CsrfTokenInterceptor());
        return this;
    }
    withRedirectOnUnauthorized(redirectUri) {
        this.interceptors.push(new RedirectOnUnauthorizedInterceptor(redirectUri));
        return this;
    }
    withInterceptors(...interceptors) {
        this.interceptors.push(...interceptors);
        return this;
    }
    build() {
        const interceptors = this.interceptors;
        return new HttpClient({interceptors});
    }
}

class HttpClient {
    interceptors;
    static builder() {
        return new HttpClientBuilder();
    }
    constructor( {interceptors}){
        this.interceptors = interceptors || [];
    }
    async fetch(resource, options) {

        const is = this.interceptors.concat(options.interceptors || []);

        const request = await is.reduce(async (req, interceptor) => {
            return !interceptor.before ? req : await interceptor.before(req);
        }, {resource, options});

        const response = await fetch(request.resource, request.options);

        return await is.reduce(async (res, interceptor) => {
            return !interceptor.after ? res : await interceptor.after(request, res);
        }, response);

    }
    async json(resource, options) {
        try {
            const response = await this.fetch(resource, options);
            if (!response.ok) {
                const message = await response.text();
                throw Failure.fromResponse(response.status, message);
            }
            const text = await response.text();
            return text ? JSON.parse(text) : undefined;
        } catch (e) {
            if (e instanceof Failure) {
                throw e;
            }
            throw new Failure(0, [{
                    type: "CONNECTION_PROBLEM",
                    context: null,
                    reason: e.message,
                    details: null
                }]);
        }
    }
    async form(resource, options, uiOptions) {
        const ui = uiOptions || {};
        ui.buttons?.forEach(el => {
            el.setAttribute("disabled", "disabled");
            if (ui.loader) {
                el.dataset['oldContent'] = el.innerHTML;
                el.innerHTML = ui.loader;
            }
        });
        try {
            const r = await this.json(resource, options);
            ui.form?.clearErrors();
            return r;
        } catch (e) {
            ui.form?.setErrors(e.problems);
            throw e;
        } finally {
            ui.buttons?.forEach(el => {
                el.removeAttribute("disabled");
                el.innerHTML = el.dataset['oldContent'];
                delete el.dataset['oldContent'];
            });
        }
    }
}



export { HttpClient, Failure };
