"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sasaki = require("@motionpicture/sskts-api-nodejs-client");
const uuid = require("uuid");
/**
 * 認証モデル
 * @class AuthModel
 */
class AuthModel {
    /**
     * @constructor
     * @param {any} session
     */
    constructor(session) {
        if (session === undefined) {
            session = {};
        }
        this.state = (session.state !== undefined) ? session.state : uuid.v1();
        // this.scopes = (session.scopes !== undefined) ? session.scopes : [
        //     `${(<string>process.env.RESOURCE_SERVER_URL)}/transactions`,
        //     `${(<string>process.env.RESOURCE_SERVER_URL)}/events.read-only`,
        //     `${(<string>process.env.RESOURCE_SERVER_URL)}/organizations.read-only`,
        //     `${(<string>process.env.RESOURCE_SERVER_URL)}/orders.read-only`,
        //     `${(<string>process.env.RESOURCE_SERVER_URL)}/places.read-only`
        // ];
        this.scopes = [];
        this.memberType = (session.memberType !== undefined) ? session.memberType : MemberType.NonMember;
        this.credentials = (session.credentials !== undefined) ? session.credentials : null;
        this.codeVerifier = (session.codeVerifier !== undefined) ? session.codeVerifier : null;
    }
    /**
     * 認証クラス作成
     * @memberof AuthModel
     * @method create
     * @returns {sasaki.auth.ClientCredentials}
     */
    create() {
        if (this.isMember()) {
            const auth = new sasaki.auth.OAuth2({
                domain: process.env.AUTHORIZE_SERVER_DOMAIN,
                clientId: process.env.CLIENT_ID_OAUTH2,
                clientSecret: process.env.CLIENT_SECRET_OAUTH2,
                redirectUri: process.env.AUTH_REDIRECT_URI,
                logoutUri: process.env.AUTH_LOGUOT_URI,
                state: this.state,
                scopes: this.scopes
            });
            if (this.credentials !== null) {
                auth.setCredentials(this.credentials);
            }
            return auth;
        }
        else {
            return new sasaki.auth.ClientCredentials({
                domain: process.env.AUTHORIZE_SERVER_DOMAIN,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                state: this.state,
                scopes: this.scopes
            });
        }
    }
    /**
     * セッションへ保存
     * @memberof AuthModel
     * @method save
     * @returns {Object}
     */
    save(session) {
        const authSession = {
            state: this.state,
            scopes: this.scopes,
            memberType: this.memberType,
            credentials: this.credentials,
            codeVerifier: this.codeVerifier
        };
        session.auth = authSession;
    }
    /**
     * 会員判定
     * @memberof AuthModel
     * @returns {boolean}
     */
    isMember() {
        return (this.memberType === MemberType.Member);
    }
}
exports.AuthModel = AuthModel;
/**
 * 会員種類
 * @enum MemberType
 */
var MemberType;
(function (MemberType) {
    /**
     * 非会員
     */
    MemberType[MemberType["NonMember"] = 0] = "NonMember";
    /**
     * 会員
     */
    MemberType[MemberType["Member"] = 1] = "Member";
})(MemberType = exports.MemberType || (exports.MemberType = {}));
