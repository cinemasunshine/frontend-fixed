/**
 * 取引
 * @namespace Purchase.TransactionModule
 */

import * as sasaki from '@motionpicture/sskts-api-nodejs-client';
import * as debug from 'debug';
import { NextFunction, Request, Response } from 'express';
import * as HTTPStatus from 'http-status';
import * as moment from 'moment';
import { getApiOption } from '../../functions';
import { AppError, AuthModel, ErrorType, PurchaseModel } from '../../models';
const log = debug('SSKTS:Purchase.TransactionModule');

/**
 * 販売終了時間(券売機) 10分後
 * @memberof Purchase.TransactionModule
 * @const {number} END_TIME_DEFAULT
 */
const END_TIME_FIXED = -10;

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
export async function start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (req.session === undefined || req.query.performanceId === undefined) {
            throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        }
        const authModel = new AuthModel(req.session.auth);
        const options = getApiOption(req);
        authModel.save(req.session);

        // イベント情報取得
        const screeningEvent = await new sasaki.service.Event(options).findScreeningEventById({
            id: req.query.performanceId
        });
        log('イベント情報取得');
        if (screeningEvent === undefined
            || screeningEvent.coaInfo === undefined) {
            throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        }

        // 開始可能日判定
        if (moment().unix() < moment(screeningEvent.coaInfo.rsvStartDate).unix()) {
            throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        }
        log('開始可能日判定');

        // 終了可能日判定
        const limit = END_TIME_FIXED;
        const limitTime = moment().add(limit, 'minutes');
        if (limitTime.unix() > moment(screeningEvent.startDate).unix()) {
            throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        }
        log('終了可能日判定');

        let purchaseModel: PurchaseModel;

        // 非会員なら重複確認
        purchaseModel = new PurchaseModel(req.session.purchase);
        log('重複確認');
        if (purchaseModel.transaction !== undefined && purchaseModel.seatReservationAuthorization !== undefined) {
            // 重複確認へ
            res.redirect(`/purchase/${req.query.performanceId}/overlap`);
            log('重複確認へ');

            return;
        }
        // セッション削除
        delete req.session.purchase;
        delete req.session.mvtk;
        delete req.session.complete;
        log('セッション削除');

        purchaseModel = new PurchaseModel({
            screeningEvent: screeningEvent
        });

        // 劇場のショップを検索
        const searchResult = await new sasaki.service.Seller(options).search({
            location: {
                branchCodes: [screeningEvent.coaInfo.theaterCode]
            }
        });
        purchaseModel.seller = searchResult.data[0];
        log('劇場のショップを検索');
        if (purchaseModel.seller === undefined) throw new AppError(HTTPStatus.NOT_FOUND, ErrorType.Access);

        // 取引開始
        const valid = VALID_TIME_FIXED;
        purchaseModel.expired = moment().add(valid, 'minutes').toDate();
        purchaseModel.transaction = await new sasaki.service.transaction.PlaceOrder(options).start({
            expires: purchaseModel.expired,
            seller: {
                typeOf: purchaseModel.seller.typeOf,
                id: purchaseModel.seller.id
            },
            object: { passport: { token: req.query.passportToken } }
        });
        log('SSKTS取引開始', purchaseModel.transaction.id);

        //セッション更新
        purchaseModel.save(req.session);
        //座席選択へ
        res.redirect(`/purchase/seat/${req.query.performanceId}/`);
    } catch (err) {
        next(err);
    }
}
