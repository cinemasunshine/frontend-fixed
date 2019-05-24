"use strict";
/**
 * 購入完了
 * @namespace Purchase.CompleteModule
 */
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPStatus = require("http-status");
const models_1 = require("../../models");
/**
 * 購入完了表示
 * @memberof Purchase.CompleteModule
 * @function render
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {void}
 */
function render(req, res, next) {
    try {
        if (req.session === undefined
            || req.session.complete === undefined)
            throw new models_1.AppError(HTTPStatus.BAD_REQUEST, models_1.ErrorType.Property);
        //購入者内容確認表示
        const purchaseModel = new models_1.PurchaseModel(req.session.complete);
        res.locals.purchaseModel = purchaseModel;
        res.locals.step = models_1.PurchaseModel.COMPLETE_STATE;
        res.render('purchase/complete', { layout: 'layouts/purchase/layout' });
    }
    catch (err) {
        next(err);
    }
}
exports.render = render;
