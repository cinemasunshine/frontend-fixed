"use strict";
/**
 * ルーティング
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const moment = require("moment");
const error_controller_1 = require("../controllers/error/error.controller");
const functions_1 = require("../functions");
const fixed_1 = require("./fixed");
const inquiry_1 = require("./inquiry");
const method_1 = require("./method");
const purchase_1 = require("./purchase");
const screen_1 = require("./screen");
const router = express.Router();
exports.default = (app) => {
    // tslint:disable-next-line:variable-name
    app.use((_req, res, next) => {
        res.locals.escapeHtml = functions_1.escapeHtml;
        res.locals.formatPrice = functions_1.formatPrice;
        res.locals.moment = moment;
        res.locals.timeFormat = functions_1.timeFormat;
        res.locals.portalSite = process.env.PORTAL_SITE_URL;
        res.locals.env = process.env.NODE_ENV;
        res.locals.appSiteUrl = process.env.APP_SITE_URL;
        next();
    });
    app.use('', fixed_1.default); // 券売機
    app.use('/purchase', purchase_1.default); // 購入
    app.use('/inquiry', inquiry_1.default); // 照会
    app.use('/method', method_1.default); // 方法
    app.use('/screen', screen_1.default); // スクリーン
    //エラー
    router.get('/error', (req, res, next) => {
        error_controller_1.errorRender(new Error(), req, res, next);
    });
    app.use(error_controller_1.notFoundRender); // 404
    app.use(error_controller_1.errorRender); // error handlers
};
