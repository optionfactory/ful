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
    withRedirectOnUnauthorized(redirectUri){
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

        const request = this.interceptors.reduce(async (req, interceptor) => {
            return !interceptor.before ? req : await interceptor.before(req);
        }, {resource, options});

        const response = await fetch(request.resource, request.options);

        return this.interceptors.reduce(async (res, interceptor) => {
            return !interceptor.after ? res : await interceptor.after(request, res);
        }, response);

    }
}



export { HttpClient };
