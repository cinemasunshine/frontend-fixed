"use strict";
/**
 * 取引
 * @namespace Purchase.TransactionModule
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sasaki = require("@motionpicture/sskts-api-nodejs-client");
const debug = require("debug");
const HTTPStatus = require("http-status");
const moment = require("moment");
const AuthModel_1 = require("../../models/Auth/AuthModel");
const PurchaseModel_1 = require("../../models/Purchase/PurchaseModel");
const ErrorUtilModule_1 = require("../Util/ErrorUtilModule");
const UtilModule = require("../Util/UtilModule");
const log = debug('SSKTS:Purchase.TransactionModule');
/**
 * 販売終了時間 30分前
 * @memberof Purchase.TransactionModule
 * @const {number} END_TIME_DEFAULT
 */
const END_TIME_DEFAULT = 30;
/**
 * 販売終了時間(券売機) 10分後
 * @memberof Purchase.TransactionModule
 * @const {number} END_TIME_DEFAULT
 */
const END_TIME_FIXED = -10;
/**
 * 取引有効時間 15分間
 * @memberof Purchase.TransactionModule
 * @const {number} END_TIME_DEFAULT
 */
const VALID_TIME_DEFAULT = 15;
/**
 * 取引有効時間(券売機) 5分間
 * @memberof Purchase.TransactionModule
 * @const {number} END_TIME_DEFAULT
 */
const VALID_TIME_FIXED = 5;
/**
 * 取引開始
 * @memberof Purchase.TransactionModule
 * @function start
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {Promise<void>}
 */
// tslint:disable-next-line:max-func-body-length
function start(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.session === undefined || req.body.performanceId === undefined) {
                throw new ErrorUtilModule_1.AppError(HTTPStatus.BAD_REQUEST, ErrorUtilModule_1.ErrorType.Property);
            }
            const authModel = new AuthModel_1.AuthModel(req.session.auth);
            const options = {
                endpoint: process.env.SSKTS_API_ENDPOINT,
                auth: authModel.create()
            };
            authModel.save(req.session);
            log('会員判定', authModel.isMember());
            // イベント情報取得
            const individualScreeningEvent = yield sasaki.service.event(options).findIndividualScreeningEvent({
                identifier: req.body.performanceId
            });
            log('イベント情報取得');
            if (individualScreeningEvent === null)
                throw new ErrorUtilModule_1.AppError(HTTPStatus.BAD_REQUEST, ErrorUtilModule_1.ErrorType.Property);
            // awsCognitoIdentityIdを保存
            if (req.body.identityId === undefined) {
                delete req.session.awsCognitoIdentityId;
            }
            else {
                req.session.awsCognitoIdentityId = req.body.identityId;
                log('awsCognitoIdentityIdを保存', req.session.awsCognitoIdentityId);
            }
            // 開始可能日判定
            if (moment().unix() < moment(individualScreeningEvent.coaInfo.rsvStartDate).unix()) {
                throw new ErrorUtilModule_1.AppError(HTTPStatus.BAD_REQUEST, ErrorUtilModule_1.ErrorType.Property);
            }
            log('開始可能日判定');
            // 終了可能日判定
            const limit = (process.env.VIEW_TYPE === UtilModule.VIEW.Fixed) ? END_TIME_FIXED : END_TIME_DEFAULT;
            const limitTime = moment().add(limit, 'minutes');
            if (limitTime.unix() > moment(individualScreeningEvent.startDate).unix()) {
                throw new ErrorUtilModule_1.AppError(HTTPStatus.BAD_REQUEST, ErrorUtilModule_1.ErrorType.Property);
            }
            log('終了可能日判定');
            let purchaseModel;
            if (!authModel.isMember()) {
                // 非会員なら重複確認
                purchaseModel = new PurchaseModel_1.PurchaseModel(req.session.purchase);
                log('重複確認');
                if (purchaseModel.transaction !== null && purchaseModel.seatReservationAuthorization !== null) {
                    // 重複確認へ
                    res.json({ redirect: `/purchase/${req.body.performanceId}/overlap`, contents: null });
                    log('重複確認へ');
                    return;
                }
            }
            // セッション削除
            delete req.session.purchase;
            delete req.session.mvtk;
            delete req.session.complete;
            log('セッション削除');
            purchaseModel = new PurchaseModel_1.PurchaseModel({
                individualScreeningEvent: individualScreeningEvent
            });
            // 劇場のショップを検索
            purchaseModel.movieTheaterOrganization = yield sasaki.service.organization(options).findMovieTheaterByBranchCode({
                branchCode: individualScreeningEvent.coaInfo.theaterCode
            });
            log('劇場のショップを検索');
            if (purchaseModel.movieTheaterOrganization === null)
                throw new ErrorUtilModule_1.AppError(HTTPStatus.BAD_REQUEST, ErrorUtilModule_1.ErrorType.Property);
            // 取引開始
            const valid = (process.env.VIEW_TYPE === UtilModule.VIEW.Fixed) ? VALID_TIME_FIXED : VALID_TIME_DEFAULT;
            purchaseModel.expired = moment().add(valid, 'minutes').toDate();
            purchaseModel.transaction = yield sasaki.service.transaction.placeOrder(options).start({
                expires: purchaseModel.expired,
                sellerId: purchaseModel.movieTheaterOrganization.id
            });
            log('SSKTS取引開始', purchaseModel.transaction.id);
            //セッション更新
            purchaseModel.save(req.session);
            //座席選択へ
            res.json({ redirect: `/purchase/seat/${req.body.performanceId}/` });
        }
        catch (err) {
            log('SSKTS取引開始エラー', err);
            res.json({ redirect: null });
        }
    });
}
exports.start = start;
