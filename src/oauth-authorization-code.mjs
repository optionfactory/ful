import { Base64 } from "./encodings.mjs";
import { SessionStorage } from "./storage.mjs";

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
        this.storage.save(AuthorizationCodeFlow.PKCE_AND_STATE_KEY, {
            state: state,
            verifier: pkceVerifier
        });
        const url = new URL(this.authUri);
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
        const stateAndVerifier = this.storage.pop(AuthorizationCodeFlow.PKCE_AND_STATE_KEY);
        if (stateAndVerifier.state !== state) {
            throw new Error("State mismatch");
        }
        const response = await fetch(this.tokenUri, {
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
            const text = await response.text();
            throw new Error("Error:" + response.status + ": " + text);
        }
        const token = await response.json();
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
        const response = await fetch(this.tokenUri, {
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
        const url = new URL(this.logoutUri);
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
        await this.session.refreshIf(this.gracePeriodBefore);
        const headers = new Headers(request.options.headers);
        headers.set("Authorization", this.session.bearerToken());
        return request;
    }
    async after(request, response) {
        await this.session.refreshIf(this.gracePeriodAfter);
        return response;
    }
}


export {AuthorizationCodeFlow, AuthorizationCodeFlowSession, AuthorizationCodeFlowInterceptor };