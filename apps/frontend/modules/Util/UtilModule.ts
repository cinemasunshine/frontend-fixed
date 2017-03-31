/**
 * 共通
 * @namespace Util.UtilModule
 */
import * as express from 'express';
import * as moment from 'moment';

/**
 * テンプレート変数へ渡す
 * @memberOf Util.UtilModule
 * @function setLocals
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunctiont} next
 * @returns {void}
 */
// tslint:disable-next-line:variable-name
export function setLocals(_req: express.Request, res: express.Response, next: express.NextFunction): void {
    res.locals.escapeHtml = escapeHtml;
    res.locals.formatPrice = formatPrice;
    res.locals.moment = moment;
    res.locals.timeFormat = timeFormat;
    res.locals.portalSite = getPortalUrl();
    next();
    return;
}

/**
 * 時間フォーマット
 * @memberOf Util.UtilModule
 * @function timeFormat
 * @param {string} str
 * @returns {string}
 */
export function timeFormat(str: string): string {
    if (typeof str !== 'string') {
        return '';
    }
    const start = 2;
    const end = 4;
    return `${str.slice(0, start)}:${str.slice(start, end)}`;
}

/**
 * HTMLエスケープ
 * @memberOf Util.UtilModule
 * @function escapeHtml
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') {
        return str;
    }
    const change = (match: string): string => {
        const changeList: any = {
        '&': '&amp;',
        '\'': '&#x27;',
        '`': '&#x60;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;'
        };
        return changeList[match];
    };
    return str.replace(/[&'`"<>]/g, change);
}

/**
 * カンマ区切りへ変換
 * @memberOf Util.UtilModule
 * @function formatPrice
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price: number): string {
    return String(price).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
}

/**
 * パフォーマンスID取得
 * @memberOf Util.UtilModule
 * @function getPerformanceId
 * @param {Object} args
 * @param {string} args.theaterCode
 * @param {string} args.day
 * @param {string} args.titleCode
 * @param {string} args.titleBranchNum
 * @param {string} args.screenCode
 * @param {string} args.timeBegin
 * @returns {string}
 */
export function getPerformanceId(args: {
    theaterCode: string,
    day: string,
    titleCode: string,
    titleBranchNum: string,
    screenCode: string,
    timeBegin: string
}): string  {
    return `${args.theaterCode}${args.day}${args.titleCode}${args.titleBranchNum}${args.screenCode}${args.timeBegin}`;
}

/**
 * ベース64エンコード
 * @memberOf Util.UtilModule
 * @function bace64Encode
 * @param {string} str
 * @returns {string}
 */
export function bace64Encode(str: string): string {
   return new Buffer(str).toString('base64');
}

/**
 * ベース64デコード
 * @memberOf Util.UtilModule
 * @function base64Decode
 * @param {string} str
 * @returns {string}
 */
export function base64Decode(str: string): string {
    return new Buffer(str, 'base64').toString();
}

/**
 * 劇場ポータルURL取得
 * @memberOf Util.UtilModule
 * @function getTheaterUrl
 * @param {string} name
 * @returns {string}
 */
// tslint:disable-next-line:variable-name
export function getTheaterUrl(_name: string): string {
    let result: string;
    if (process.env.NODE_ENV !== 'development') {
        result = `${getPortalUrl()}/theater/aira`;
        // const theaterName = name.toLowerCase();
        // result = `${getPortalUrl()}/theater/${theaterName.replace('cinemasunshine', '')}`;
    } else {
        result = getPortalUrl();
    }
    return result;
}

/**
 * ポータルURL取得
 * @memberOf Util.UtilModule
 * @function getPortalUrl
 * @returns {string}
 */
export function getPortalUrl(): string {
    let result: string;
    if (process.env.NODE_ENV === 'prod') {
        // tslint:disable-next-line:no-http-string
        result = 'http://www.cinemasunshine.co.jp';
    } else if (process.env.NODE_ENV === 'test') {
        // tslint:disable-next-line:no-http-string
        result = 'http://devssktsportal.azurewebsites.net';
    } else {
        // tslint:disable-next-line:no-http-string
        result = 'http://devssktsportal.azurewebsites.net';
    }
    return result;
}
