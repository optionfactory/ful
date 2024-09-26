class Failure extends Error {
    constructor(name, problems, cause) {
        super(JSON.stringify(problems), { cause });
        this.name = name;
        this.problems = problems;
    }
}

class HttpClientError extends Failure {
    constructor(status, problems, cause) {
        super(`HttpClientError:${status}`, problems, cause);
        this.status = status;
    }
    static of(type, cause) {
        return new HttpClientError(0, [{
            type,
            context: null,
            reason: cause.message,
            details: null
        }], cause);
    }
    /**
     * Creates an HttpClientError from a Response.
     * @param {Response} response 
     * @returns an HttpClientError
     */
    static async fromResponse(response) {
        const text = await response.text();
        const def = [{
            type: "GENERIC_PROBLEM",
            context: null,
            reason: `${response.status} ${response.statusText}: ${text}`,
            details: null
        }];
        try {
            return new HttpClientError(response.status, text ? JSON.parse(text) : def);
        } catch (e) {
            return new HttpClientError(response.status, def);
        }
    }
}

class CsrfTokenInterceptor {
    #k; #v;
    constructor() {
        this.#k = document.querySelector("meta[name='_csrf_header']").getAttribute("content");
        this.#v = document.querySelector("meta[name='_csrf']").getAttribute("content");
    }
    async intercept(request, chain) {
        request.headers.set(this.#k, this.#v);
        return await chain.proceed(request);
    }
}

class RedirectOnUnauthorizedInterceptor {
    #redirectUri;
    constructor(redirectUri) {
        this.#redirectUri = redirectUri;
    }
    async intercept(request, chain) {
        const response = await chain.proceed(request);
        if (response.status !== 401) {
            return response;
        }
        window.location.href = this.#redirectUri;
    }
}

class HttpClientBuilder {
    #interceptors;
    constructor() {
        this.#interceptors = [];
    }
    withCsrfToken() {
        this.#interceptors.push(new CsrfTokenInterceptor());
        return this;
    }
    withRedirectOnUnauthorized(redirectUri) {
        this.#interceptors.push(new RedirectOnUnauthorizedInterceptor(redirectUri));
        return this;
    }
    withInterceptors(...interceptors) {
        this.#interceptors.push(...interceptors);
        return this;
    }
    build() {
        return new HttpClient(this.#interceptors);
    }
}

class HttpCall {
    /**
     * 
     * @async
     * @param {Request} request 
     * @param {HttpInterceptorChain} chain 
     * @returns {Promise<Response>} the response
     */
    async intercept(request, chain) {
        return await fetch(request);
    }
}

class HttpInterceptorChain {
    constructor(interceptors, current) {
        this.interceptors = interceptors;
        this.current = current;
    }
    async proceed(request) {
        const interceptor = this.interceptors[this.current];
        return await interceptor.intercept(request, new HttpInterceptorChain(this.interceptors, this.current + 1));
    }
}

class HttpClient {
    #interceptors;
    /**
     * Creates a builder for an HttpClient.
     * @returns {HttpRequestBuilder} the client builder
     */
    static builder() {
        return new HttpClientBuilder();
    }
    /**
     * Creates an HttpClient.
     * @returns {[HttpInterceptor]} interceptors - a list of interceptors to be registered for every request performed by the created client. 
     */
    constructor(interceptors) {
        this.#interceptors = interceptors || [];
    }
    /**
     * Performs an HTTP exchange.
     * @async
     * @param {string} uri - the (possibly relative) request url
     * @param {RequestInit|undefined} options - fetch options
     * @param {[any]|undefined} interceptors - the HttpInterceptors to be registered for this request.
     * @returns {Promise<Response>} the response
     */
    async exchange(uri, options, interceptors) {
        const is = [...this.#interceptors, ...interceptors || [], new HttpCall()];
        const chain = new HttpInterceptorChain(is, 0);
        return await chain.proceed(new Request(uri, options));
    }
    /**
     * Creates a request builder.
     * @param {string} method - the HTTP method to be used
     * @param {string} uri - the (possibly relative) request url
     * @returns {HttpRequestBuilder} the request builder
     */
    request(method, uri) {
        return HttpRequestBuilder.create(this, method, uri);
    }
    /**
     * Creates a request builder.
     * @param {string} uri - the (possibly relative) request url 
     * @returns {HttpRequestBuilder} the request builder
     */
    get(uri) {
        return HttpRequestBuilder.create(this, 'GET', uri);
    }
    /**
     * Creates a request builder.
     * @param {string} uri - the (possibly relative) request url
     * @returns {HttpRequestBuilder} the request builder
     */
    head(uri) {
        return HttpRequestBuilder.create(this, 'HEAD', uri);
    }
    /**
     * Creates a request builder.
     * @param {string} uri - the (possibly relative) request url
     * @returns {HttpRequestBuilder} the request builder
     */
    post(uri) {
        return HttpRequestBuilder.create(this, 'POST', uri);
    }
    /**
     * Creates a request builder.
     * @param {string} uri - the (possibly relative) request url
     * @returns {HttpRequestBuilder} the request builder
     */
    put(uri) {
        return HttpRequestBuilder.create(this, 'PUT', uri);
    }
    /**
     * Creates a request builder.
     * @param {string} uri - the (possibly relative) request url
     * @returns {HttpRequestBuilder} the request builder
     */
    patch(uri) {
        return HttpRequestBuilder.create(this, 'PATCH', uri);
    }
    /**
     * Creates a request builder.
     * @param {string} uri - the (possibly relative) request url
     * @returns {HttpRequestBuilder} the request builder
     */
    delete(uri) {
        return HttpRequestBuilder.create(this, 'DELETE', uri);
    }
}


const unmarshal = async (response, type) => {
    try {
        return await response[type]();
    } catch (e) {
        throw HttpClientError.of("UNMARSHALING_PROBLEM", e);
    }
}


class HttpRequestBuilder {
    #client;
    #method;
    #uri;
    #params;
    #headers;
    #body;
    #options;
    #interceptors;
    /**
     * Creates an HttpRequestBuilder.
     * @param {HttpClient} client 
     * @param {string} method - the HTTP method to be used
     * @param {string} uri - the (possibly relative) request url
     * @returns {HttpRequestBuilder} the builder
     */
    static create(client, method, uri) {
        return new HttpRequestBuilder(
            client,
            method,
            uri,
            new URLSearchParams(),
            new Headers(),
            undefined,
            {},
            []
        );
    }
    /**
     * Creates an HttpRequestBuilder.
     * @param {HttpClient} client 
     * @param {string} method - the HTTP method to be used
     * @param {string} uri - the (possibly relative) request url
     * @param {URLSearchParams} params 
     * @param {Headers} headers 
     * @param {any} body 
     * @param {Omit<RequestInit,"headers"|"method"|"body">} options 
     * @param {[HttpInterceptor]} interceptors 
     */
    constructor(client, method, uri, params, headers, body, options, interceptors) {
        this.#client = client;
        this.#method = method;
        this.#uri = uri;
        this.#params = params;
        this.#body = body;
        this.#headers = headers;
        this.#options = options;
        this.#interceptors = interceptors;
    }
    /**
     * Add all passed headers to the request, overriding existing ones if that key already exists.
     * @param {headersInit} hs 
     * @returns {HttpRequestBuilder} this builder
     */
    headers(hs) {
        for (const [k, v] of new Headers(hs).entries()) {
            this.#headers.set(k, v);
        }
        return this;
    }
    /**
     * Adds an header to the request, overriding it if it already exists.
     * @param {string} k 
     * @param {string} v 
     * @returns {HttpRequestBuilder} this builder
     */
    header(k, v) {
        this.#headers.set(k, v);
        return this;
    }
    /**
     * Add all query parameters to the request, overriding existing ones if that key already exists.
     * @param {URLSearchParams|Record<string,string>|string[][]|string} ps 
     * @returns {HttpRequestBuilder} this builder
     */
    params(ps) {
        for (const [k, v] of new URLSearchParams(ps).entries()) {
            this.#params.set(k, v);
        }
        return this;
    }
    /**
     * Adds a query parameter to the request, overriding it if it already exists.
     * @param {string} k 
     * @param {string} v 
     * @returns {HttpRequestBuilder} this builder
     */
    param(k, v) {
        this.#params.set(k, v);
        return this;
    }
    /**
     * Sets the request body. 
     * `Content-Type: multipart/form-data` header is automatically added by fetch when data is a FormData instance if not explicitly set.
     * `Content-Type: application/x-www-form-urlencoded` header is automatically added by fetch when data is an URLSearchParams instance if not explicitly set.
     * `Content-Type: text/plain` header is automatically added by fetch when data is a string instance if not explicitly set.
     * @param {string|ArrayBuffer|Blob|DataView|File|FormData|TypedArray|URLSearchParams|ReadableStream} data 
     * @returns {HttpRequestBuilder} this builder
     */
    body(data) {
        this.#body = data;
        return this;
    }
    /**
     * Sets the request body that will be serialized as json. Calling this method adds the `Content-Type application/json` header for the request.
     * @param {any} body - the body to be serialized as json
     * @returns {HttpRequestBuilder} this builder
     */
    json(body) {
        this.#headers.set("Content-Type", "application/json");
        this.#body = JSON.stringify(body);
        return this;
    }
    /**
     * Sets a fetch options for the request.
     * @param {Omit<RequestInit,"headers"|"method"|"body">} kvs
     * @returns {HttpRequestBuilder} this builder
     */
    options(kvs) {
        for (const [k, v] of Object.entries(kvs)) {
            this.#options[k] = v;
        }
        return this;
    }
    /**
     * Sets a fetch option for the request.
     * @param {keyof Omit<RequestInit,"headers"|"method"|"body">} k 
     * @param {*} v 
     * @returns {HttpRequestBuilder} this builder
     */
    option(k, v) {
        this.#options[k] = v;
        return this;
    }
    /**
     * Adds interceptors to the request.
     * @param {[HttpInterceptor]} is - the interceptor to be regisered
     * @returns {HttpRequestBuilder} this builder
     */
    interceptors(is) {
        for (const i of is) {
            this.#interceptors.push(i);
        }
        return this;
    }
    /**
     * Adds an interceptor to the request.
     * @param {HttpInterceptor} i - the interceptor to be regisered
     * @returns {HttpRequestBuilder} this builder
     */
    interceptor(i) {
        this.#interceptors.push(i);
        return this;
    }
    /**
     * Performs an HTTP exchange using the configured client, request and interceptors.
     * @returns {Promise<Response>} the response
     */
    async exchange() {
        const uri = this.#params.size ? `${this.#uri}?${this.#params}` : this.#uri;
        const opts = {
            ...this.#options,
            headers: this.#headers,
            method: this.#method,
            body: this.#body,
        };
        return await this.#client.exchange(uri, opts, this.#interceptors);
    }
    /**
     * Performs an HTTP exchange using the configured client request, and interceptos throwing a failure when response status is not in the 200-299 range.
     * @returns {Promise<Response>} the response
     */
    async fetch() {
        const uri = this.#params.size ? `${this.#uri}?${this.#params}` : this.#uri;
        const opts = {
            ...this.#options,
            headers: this.#headers,
            method: this.#method,
            body: this.#body,
        };
        try {
            const response = await this.#client.exchange(uri, opts, this.#interceptors);
            if (!response.ok) {
                throw await HttpClientError.fromResponse(response);
            }
            return response;
        } catch (e) {
            if (e instanceof Failure) {
                throw e;
            }
            throw HttpClientError.of("CONNECTION_PROBLEM", e);
        }
    }
    /**
     * Performs an HTTP exchange using the configured client request, and interceptos throwing a failure when response status is not in the 200-299 range.
     * @returns {Promise<string>} the response body, as text
     */
    async fetchText() {
        const response = await this.fetch();
        return await unmarshal(response, 'text');
    }
    /**
     * Performs an HTTP exchange using the configured client request, and interceptos throwing a failure when response status is not in the 200-299 range.
     * @returns {Promise<any>} the response body, deserialized as JSON
     */
    async fetchJson() {
        const response = await this.fetch();
        return await unmarshal(response, 'json');
    }
    /**
     * Performs an HTTP exchange using the configured client request, and interceptos throwing a failure when response status is not in the 200-299 range.
     * @returns {Promise<Uint8Array>} the response body, as an Uint8Array
     */
    async fetchBytes() {
        const response = await this.fetch();
        return await unmarshal(response, 'bytes');
    }
    /**
     * Performs an HTTP exchange using the configured client request, and interceptos throwing a failure when response status is not in the 200-299 range.
     * @returns {Promise<Blob>} the response body, as a Blob
     */
    async fetchBlob() {
        const response = await this.fetch();
        return await unmarshal(response, 'blob');
    }
    /**
     * Performs an HTTP exchange using the configured client request, and interceptos throwing a failure when response status is not in the 200-299 range.
     * @returns {Promise<ArrayBuffer>} the response body, as an ArrayBuffer
     */
    async fetchArrayBuffer() {
        const response = await this.fetch();
        return await unmarshal(response, 'arrayBuffer');
    }
}


export { HttpClient, Failure, HttpClientError };
