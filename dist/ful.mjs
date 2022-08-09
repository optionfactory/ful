/* global CSS */

function extract(extractors, el) {
    const maybeExtractor = extractors[el.dataset['bindExtractor']] || extractors[el.dataset['bindProvide']];
    if (maybeExtractor) {
        return maybeExtractor(el);
    }
    if (el.getAttribute('type') === 'radio') {
        if (!el.checked) {
            return undefined;
        }
        return el.dataset['bindType'] === 'boolean' ? el.value === 'true' : el.value;
    }
    if (el.getAttribute('type') === 'checkbox') {
        return el.checked;
    }
    if (el.dataset['bindType'] === 'boolean') {
        return !el.value ? null : el.value === 'true';
    }
    return el.value || null;
}

function mutate(mutators, el, raw, key, values) {
    const maybeMutator = mutators[el.dataset['bindMutator']] || mutators[el.dataset['bindProvide']];
    if (maybeMutator) {
        maybeMutator(el, raw, key, values);
        return;
    }
    el.value = raw;
}


function providePath(result, path, value) {
    const keys = path.split(".").map((k) => k.match(/^[0-9]+$/) ? +k : k);
    let current = result;
    let previous = null;
    for (let i = 0; ; ++i) {
        const ckey = keys[i];
        const pkey = keys[i - 1];
        if (Number.isInteger(ckey) && !Array.isArray(current)) {
            if (previous !== null) {
                previous[pkey] = current = [];
            } else {
                result = current = [];
            }
        }
        if (i === keys.length - 1) {
            //when value is undefined we only want to define the property if it's not defined 
            current[ckey] = value !== undefined ? value : (ckey in current ? current[ckey] : null);
            return result;
        }
        if (current[ckey] === undefined) {
            current[ckey] = {};
        }
        previous = current;
        current = current[ckey];
    }
}

class Bindings {
    extractors;
    mutators;
    valueHoldersSelector;
    ignoredChildrenSelector;

    constructor( {extractors, mutators, ignoredChildrenSelector, valueHoldersSelector}) {
        this.extractors = extractors || {};
        this.mutators = mutators || {};
        this.valueHoldersSelector = valueHoldersSelector || 'input[name], select[name], textarea[name]';
        this.ignoredChildrenSelector = ignoredChildrenSelector || '.d-none';
    }
    setValues(el, values) {
        for (let k in values) {
            if (!values.hasOwnProperty(k)) {
                continue;
            }
            const curEl = el.querySelector(`[name='${CSS.escape(k)}']`);
            mutate(this.mutators, curEl, values[k], k, values);
        }
    }
    getValues(el) {
        return Array.from(el.querySelectorAll(this.valueHoldersSelector))
                .filter((el) => {
                    if (el.dataset['bindInclude'] === 'never') {
                        return false;
                    }
                    return el.dataset['bindInclude'] === 'always' || el.closest(this.ignoredChildrenSelector) === null;
                })
                .reduce((result, el) => {
                    return providePath(result, el.getAttribute('name'), extract(this.extractors, el));
                }, {});
    }
}

class Base64 {
    static STANDARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    static URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    static encode(arrayBuffer, dialect) {
        const d = dialect || Base64.URL_SAFE;
        const len = arrayBuffer.byteLength;
        const view = new Uint8Array(arrayBuffer);
        let res = '';
        for (let i = 0; i < len; i += 3) {
            const v1 = d[view[i] >> 2];
            const v2 = d[((view[i] & 3) << 4) | (view[i + 1] >> 4)];
            const v3 = d[((view[i + 1] & 15) << 2) | (view[i + 2] >> 6)];
            const v4 = d[view[i + 2] & 63];
            res += v1 + v2 + v3 + v4;
        }
        if (len % 3 === 2) {
            res = res.substring(0, res.length - 1);
        } else if (len % 3 === 1) {
            res = res.substring(0, res.length - 2);
        }
        return res;
    }
    static decode(str, dialect){
        const d = dialect || Base64.URL_SAFE;        
        let nbytes = Math.floor(str.length * 0.75);
        for(let i=0; i !== str.length; ++i){
            if(str[str.length - i - 1] !== '='){
                break;
            }
            --nbytes;
        }
        const view = new Uint8Array(nbytes);

        let vi = 0;
        let si = 0;
        while (vi < str.length * 0.75) {
            const v1 = d.indexOf(str.charAt(si++));
            const v2 = d.indexOf(str.charAt(si++));
            const v3 = d.indexOf(str.charAt(si++));
            const v4 = d.indexOf(str.charAt(si++));
            view[vi++] = (v1 << 2) | (v2 >> 4);
            view[vi++] = ((v2 & 15) << 4) | (v3 >> 2);
            view[vi++] = ((v3 & 3) << 6) | v4;
        }

        return view.buffer;
    }
}

/* global Infinity, CSS */

class Form {

    static DEFAULT_FIELD_CONTAINER_SELECTOR = 'label';
    static DEFAULT_ERROR_CLASS = 'has-error';
    static DEFAULT_HIDE_CLASS = 'd-none';

    el;
    bindings;
    globalErrorsEl;
    fieldContainerSelector;
    errorClass;
    hideClass;
    constructor(el, bindings, {globalErrorsEl, fieldContainerSelector, errorClass, hideClass}) {
        this.el = el;
        this.bindings = bindings;
        this.globalErrorsEl = globalErrorsEl;
        this.fieldContainerSelector = fieldContainerSelector !== undefined ? fieldContainerSelector : Form.DEFAULT_FIELD_CONTAINER_SELECTOR;
        this.errorClass = errorClass || Form.DEFAULT_ERROR_CLASS;
        this.hideClass = hideClass || Form.DEFAULT_HIDE_CLASS;
    }
    setValues(values) {
        return this.bindings.setValues(this.el, values);
    }
    getValues() {
        return this.bindings.getValues(this.el);
    }
    setErrors(errors, scrollFirstErrorIntoView, context) {

        this.clearErrors();
        errors
                .map(this.mapError ? this.mapError : (e) => e)
                .filter((e) => e.type === 'FIELD_ERROR' || e.type === 'INVALID_FORMAT')
                .forEach((e) => {
                    const name = e.context.replace("[", ".").replace("].", ".");
                    Array.from(this.el.querySelectorAll(`[name='${CSS.escape(name)}']`))
                            .map(el => this.fieldContainerSelector ? el.closest(this.fieldContainerSelector) : el)
                            .filter(el => el !== null)
                            .forEach(label => {
                                label.classList.add(this.errorClass);
                                label.dataset['error'] = e.reason;
                            });
                });
        if (this.globalErrorsEl) {
            const globalErrors = errors.filter((e) => e.type !== 'FIELD_ERROR' && e.type !== 'INVALID_FORMAT');
            this.globalErrorsEl.innerHTML = globalErrors.map(e => e.reason).join("\n");
            if (globalErrors.length !== 0) {
                this.globalErrorsEl.classList.remove(this.hideClass);
            }
        }
        if (!scrollFirstErrorIntoView) {
            return;
        }
        const yOffsets = Array.from(this.el.querySelectorAll('.${CSS.escape(this.errorClass)}'))
                .map((label) => label.getBoundingClientRect().y + window.scrollY);
        const firstErrorScrollY = Math.min(...yOffsets);
        if (firstErrorScrollY !== Infinity) {
            window.scroll(window.scrollX, firstErrorScrollY > 100 ? firstErrorScrollY - 100 : 0);
        }
    }
    clearErrors() {
        this.el.querySelectorAll(`.${CSS.escape(this.errorClass)}`).forEach(l => l.classList.remove(this.errorClass));
        if (this.globalErrorsEl) {
            this.globalErrorsEl.innerHTML = '';
            this.globalErrorsEl.classList.add(this.hideClass);
        }
    }
}

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
        super(JSON.stringify(problems));
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
        const request = {resource, options};
        await is.forEach(async (i) => {
            if (!i.before) {
                return;
            }
            await i.before(request);
        });
        const response = await fetch(request.resource, request.options);
        await is.forEach(async (i) => {
            if (!i.after) {
                return;
            }
            await i.after(request, response);
        });

        return response;
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

class Storage {
    prefix;
    type;
    constructor(prefix, storage) {
        this.prefix = prefix;
        this.storagte = storage;
    }
    put(k, v) {
        this.storage.setItem(this.prefix + "-" + k, JSON.stringify(v));
    }
    pop(k) {
        const got = this.storage.getItem(this.prefix + "-" + k);
        const decoded = got === undefined ? undefined : JSON.parse(got);
        this.storage.removeItem(k);
        return decoded;
    }
}

class LocalStorage extends Storage {
    constructor(prefix) {
        super(prefix, localStorage);
    }
}

class SessionStorage extends Storage {
    constructor(prefix) {
        super(prefix, sessionStorage);
    }
}

class AuthorizationCodeFlow {
    static PKCE_AND_STATE_KEY = "state-and-verifier";

    static forKeycloak(clientId, realmBaseUrl, redirectUri){
        const authUri = new URL("protocol/openid-connect/auth", realmBaseUrl);
        const tokenUri = new URL("protocol/openid-connect/token", realmBaseUrl);
        const logoutUri = new URL("protocol/openid-connect/lgout", realmBaseUrl);
        const scope = "openid profile";
        return new AuthorizationCodeFlow(clientId, scope, authUri, tokenUri, logoutUri, redirectUri);        
    }
    constructor(clientId, scope, authUri, tokenUri, logoutUri, redirectUri) {
        this.clientId = clientId;
        this.scope = scope;
        this.authUri = authUri;
        this.tokenUri = tokenUri;
        this.logoutUri = logoutUri;
        this.redirectUri = redirectUri;
        this.storage = new SessionStorage(clientId);
    }
    _auth() {
        const pkceVerifier = Base64.encode(crypto.getRandomValues(new Uint8Array(32)).buffer);
        const pkceChallenge = Base64.encode(crypto.subtle.digest("SHA-256", new TextEncoder().encode(pkceVerifier)));
        const state = this.clientId + Base64.encode(crypto.getRandomValues(new Uint8Array(16)).buffer);
        this.storage.put(AuthorizationCodeFlow.PKCE_AND_STATE_KEY, {
            state: state,
            verifier: pkceVerifier
        });
        let url = new URL(this.authUri);
        url.searchParams.set("client_id", this.clientId);
        url.searchParams.set("redirect_uri", this.redirectUri);
        url.searchParams.set("response_type", 'code');
        url.searchParams.set("scope", this.scope);
        url.searchParams.set("state", state);
        url.searchParams.set("code_challenge", pkceChallenge);
        url.searchParams.set("code_challenge_method", 'S256');
        window.location = url;
    }
    async _tokenExchange(code, state) {
        window.history.replaceState('', "", this.redirectUri);
        let stateAndVerifier = this.storage.pop(AuthorizationCodeFlow.PKCE_AND_STATE_KEY);
        if (stateAndVerifier.state !== state) {
            throw new Error("State mismatch");
        }
        let response = await fetch(this.tokenUri, {
            method: "POST",
            headers: {
                "Content-Type": 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams([
                ["client_id", this.clientId],
                ["code", code],
                ["grant_type", "authorization_code"],
                ["code_verifier", stateAndVerifier.verifier],
                ["state", stateAndVerifier.state],
                ["redirect_uri", this.redirectUri]
            ])
        });
        if (!response.ok) {
            let text = await response.text();
            throw new Error("Error:" + response.status + ": " + text);
        }
        let token = await response.json();
        return new AuthorizationCodeFlowSession(this.clientId, token, this.tokenUri, this.logoutUri, this.redirectUri);
    }

    async ensureLoggedIn() {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
            //if callback from keycloak
            const state = url.searchParams.get("state");
            return await this._tokenExchange(code, state);
        }
        //if not authorized
        this._auth();
        return null;
    }
}

class AuthorizationCodeFlowSession {
    static parseToken(token) {
        const [rawHeader, rawPayload, signature] = token.split(".");
        return {
            header: JSON.parse(atob(rawHeader)),
            payload: JSON.parse(atob(rawPayload)),
            signature: signature
        };
    }    
    constructor(clientId, token, tokenUri, logoutUri, redirectUri) {
        this.clientId = clientId;
        this.token = token;
        this.tokenUri = tokenUri;
        this.logoutUri = logoutUri;
        this.redirectUri = redirectUri;
        this.accessToken = AuthorizationCodeFlowSession.parseToken(token.access_token);
        this.refreshToken = AuthorizationCodeFlowSession.parseToken(token.refresh_token);
        this.refreshCallback = null;
    }
    onRefresh(callback) {
        this.refreshCallback = callback;
    }
    async refresh() {
        let response = await fetch(this.tokenUri, {
            method: "POST",
            headers: {
                "Content-Type": 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams([
                ["client_id", this.clientId],
                ["grant_type", "refresh_token"],
                ["refresh_token", this.token.refresh_token]
            ])
        });
        if (!response.ok) {
            throw new Error("Error:" + response.code + ": " + response.text());
        }
        const token = await response.json();
        this.token = token;
        this.accessToken = this._parseToken(token.access_token);
        this.refreshToken = this._parseToken(token.refresh_token);
        if (this.refreshCallback) {
            this.refreshCallback(this.token, this.accessToken, this.refreshToken);
        }
    }
    shouldBeRefreshed(gracePeriod) {
        const now = new Date().getTime();
        const refreshTokenExpiresAt = this.refreshToken.payload.exp * 1000;
        const expired = now > refreshTokenExpiresAt;
        const shouldRefresh = now - gracePeriod > refreshTokenExpiresAt;
        return !expired && shouldRefresh;
    }
    async refreshIf(gracePeriod) {
        if (!this.shouldBeRefreshed(gracePeriod)) {
            return;
        }
        await this.refresh();
    }
    logout() {
        let url = new URL(this.logoutUri);
        url.searchParams.set("post_logout_redirect_uri", this.redirectUri);
        url.searchParams.set("id_token_hint", this.token.id_token);
        window.location = url;
    }

    bearerToken() {
        return `Bearer ${this.token.access_token}`;
    }
    
    interceptor(gracePeriodBefore, gracePeriodAfter){
        return new AuthorizationCodeFlowInterceptor(this, gracePeriodBefore, gracePeriodAfter);        
    }
}

class AuthorizationCodeFlowInterceptor {
    session;
    gracePeriodBefore;
    gracePeriodAfter;
    constructor(session, gracePeriodBefore, gracePeriodAfter) {
        this.session = session;
        this.gracePeriodBefore = gracePeriodBefore || 2000;
        this.gracePeriodAfter = gracePeriodAfter || 30000;
    }
    async before(request) {
        await this.session.refreshIfNeeded(this.gracePeriodBefore);
        const headers = new Headers(request.options.headers);
        headers.set("Authorization", this.session.bearerToken());
        return request;
    }
    async after(request, response) {
        await this.session.refreshIfNeeded(this.gracePeriodAfter);
        return response;
    }
}

const timing = {
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    DEBOUNCE_DEFAULT: 0,
    DEBOUNCE_IMMEDIATE: 1,
    debounce(timeoutMs, func, options) {
        let tid = null;
        let args = [];
        let previousTimestamp = 0;
        let opts = options || timing.DEBOUNCE_DEFAULT;

        const later = () => {
            const elapsed = new Date().getTime() - previousTimestamp;
            if (timeoutMs > elapsed) {
                tid = setTimeout(later, timeoutMs - elapsed);
                return;
            }
            tid = null;
            if (opts !== timing.DEBOUNCE_IMMEDIATE) {
                func(...args);
            }
            // This check is needed because `func` can recursively invoke `debounced`.
            if (tid === null) {
                args = [];
            }
        };

        return function () {
            args = arguments;
            previousTimestamp = new Date().getTime();
            if (tid === null) {
                tid = setTimeout(later, timeoutMs);
                if (opts === timing.DEBOUNCE_IMMEDIATE) {
                    func(...args);
                }
            }
        };
    },
    THROTTLE_DEFAULT: 0,
    THROTTLE_NO_LEADING: 1,
    THROTTLE_NO_TRAILING: 2,
    throttle(timeoutMs, func, options) {
        let tid = null;
        let args = [];
        let previousTimestamp = 0;
        let opts = options || timing.THROTTLE_DEFAULT;

        const later = () => {
            previousTimestamp = (opts & timing.THROTTLE_NO_LEADING) ? 0 : new Date().getTime();
            tid = null;
            func(...args);
            if (tid === null) {
                args = [];
            }
        };

        return function () {
            const now = new Date().getTime();
            if (!previousTimestamp && (opts & timing.THROTTLE_NO_LEADING)) {
                previousTimestamp = now;
            }
            const remaining = timeoutMs - (now - previousTimestamp);
            args = arguments;
            if (remaining <= 0 || remaining > timeoutMs) {
                if (tid !== null) {
                    clearTimeout(tid);
                    tid = null;
                }
                previousTimestamp = now;
                func(...args);
                if (tid === null) {
                    args = [];
                }
            } else if (tid === null && !(opts & timing.THROTTLE_NO_TRAILING)) {
                tid = setTimeout(later, remaining);
            }
        };

    }
};

class Wizard {
    constructor(el) {
        this.el = el;
        this.progress = [...el.children].filter(e => e.matches("header,ol,ul"));

        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            if (current === undefined && children.length > 0) {
                children[0].classList.add('active');
            }
        });
        if (this.el.querySelector('section.current') === null) {
            const firstSection = this.el.querySelector('section:first-of-type');
            if (firstSection !== null) {
                firstSection.classList.add('current');
            }
        }
    }
    next() {
        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            current?.classList.remove('active');
            current?.nextElementSibling?.classList.add('active');
        });
        const currentSection = this.el.querySelector('section.current');
        currentSection.classList.remove("current");
        currentSection.nextElementSibling.classList.add('current');

        this.el.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true,
            cancelable: true
        }));

    }
    prev() {
        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            current?.classList.remove('active');
            current?.previousElementSibling?.classList.add('active');
        });
        const currentSection = this.el.querySelector('section.current');
        currentSection.classList.remove("current");
        currentSection.previousElementSibling.classList.add('current');
        this.el.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true,
            cancelable: true
        }));
    }
    moveTo = function (n) {
        this.progress.forEach(p => {
            const children = [...p.children];
            const current = children.filter(e => e.matches(".active"))[0];
            current?.classList.remove('active');
            p.children[+n]?.classList.add('active');
        });
        const currentSection = this.el.querySelector('section.current');
        currentSection?.classList.remove("current");
        const nthSection = this.el.querySelector(`section:nth-child('${+n}')`);
        nthSection.classList.add('current');
        this.el.dispatchEvent(new CustomEvent('wizard:activate', {
            bubbles: true,
            cancelable: true
        }));
    }
}

export { AuthorizationCodeFlow, AuthorizationCodeFlowInterceptor, AuthorizationCodeFlowSession, Base64, Bindings, Failure, Form, HttpClient, LocalStorage, SessionStorage, Wizard, timing };
//# sourceMappingURL=ful.mjs.map
