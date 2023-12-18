class ContextInterceptor {
    constructor() {
        const context = document.querySelector("meta[name='context']").getAttribute("content");
        this.context = context.endsWith("/") ? context.substring(0, context.length - 1) : context;
    }
    async intercept(request, chain){
        const separator = request.resource.startsWith("/") ? "" : "/";
        request.resource = this.context + separator + request.resource;
        return await chain.proceed(request);
    }
}

class CsrfTokenInterceptor {
    constructor() {
        this.k = document.querySelector("meta[name='_csrf_header']").getAttribute("content");
        this.v = document.querySelector("meta[name='_csrf']").getAttribute("content");
    }
    async intercept(request, chain){
        const headers = new Headers(request.options.headers);
        headers.set(this.k, this.v);
        request.options.headers = headers;
        return await chain.proceed(request);
    }
}

class RedirectOnUnauthorizedInterceptor {
    constructor(redirectUri) {
        this.redirectUri = redirectUri;
    }
    async intercept(request, chain){
        const response =  await chain.proceed(request);
        if (response.status !== 401) {
            return response;
        }
        window.location.href = redirectUri;
    }
}

class Failure extends Error {
    static parseProblems(status, text) {
        const def = [{
                type: "GENERIC_PROBLEM",
                context: null,
                reason: `${status}: ${text}`,
                details: null
            }];
        try {
            return text ? JSON.parse(text) : def;
        } catch (e) {
            return def;
        }
    }
    static fromResponse(status, text) {
        return new Failure(status, Failure.parseProblems(status, text));
    }
    constructor(status, problems) {
        super(JSON.stringify(problems));
        this.name = `Failure:${status}`;
        this.status = status;
        this.problems = problems;
    }
}

class HttpClientBuilder {
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

class HttpCall {
    async intercept(request, chain){
        return await fetch(request.resource, request.options);
    }    
}

class HttpInterceptorChain {
    constructor(interceptors, current){
        this.interceptors = interceptors;
        this.current = current;
    }
    async proceed(request){
        const interceptor = this.interceptors[this.current];
        return await interceptor.intercept(request, new HttpInterceptorChain(this.interceptors, this.current + 1));
    }
}


class HttpClient {
    static builder() {
        return new HttpClientBuilder();
    }
    constructor({interceptors}){
        this.interceptors = interceptors || [];
    }
    async fetch(resource, options) {
        const opts = options || {};
        const interceptors = [...this.interceptors, ...opts.interceptors || [], new HttpCall()];
        const chain = new HttpInterceptorChain(interceptors, 0);
        return await chain.proceed({resource, opts});
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
}

function jsonRequest(method, body, headers){
    return {
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        method: method,
        body: JSON.stringify(body)        
    }
}


export { HttpClient, Failure, jsonRequest };
