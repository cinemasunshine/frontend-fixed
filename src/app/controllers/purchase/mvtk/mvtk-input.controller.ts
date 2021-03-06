/**
 * ムビチケ入力
 * @namespace Purchase.Mvtk.MvtkInputModule
 */

import * as cinerinoService from '@cinerino/sdk';
import * as COA from '@motionpicture/coa-service';
import * as debug from 'debug';
import { NextFunction, Request, Response } from 'express';
import * as HTTPStatus from 'http-status';
import { bace64Encode, getApiOption } from '../../../functions';
import { purchaseMvtkInputForm } from '../../../functions/forms';
import logger from '../../../middlewares/logger';
import { AppError, ErrorType, IMvtk, PurchaseModel } from '../../../models';
const log = debug('SSKTS:Purchase.Mvtk.MvtkInputModule');

/**
 * ムビチケ券入力ページ表示
 * @memberof Purchase.Mvtk.MvtkInputModule
 * @function render
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {void}
 */
export function render(req: Request, res: Response, next: NextFunction): void {
    try {
        if (req.session === undefined) throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        const purchaseModel = new PurchaseModel(req.session.purchase);
        if (purchaseModel.isExpired()) throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Expire);
        if (purchaseModel.transaction === undefined) throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        // ムビチケセッション削除
        delete req.session.mvtk;

        // 購入者情報入力表示
        res.locals.mvtkInfo = [{ code: '', password: '' }];
        res.locals.error = undefined;
        res.locals.purchaseModel = purchaseModel;
        res.locals.step = PurchaseModel.TICKET_STATE;
        res.render('purchase/mvtk/input', { layout: 'layouts/purchase/layout' });
    } catch (err) {
        next(err);
    }
}

/**
 * ムビチケ認証
 * @memberof Purchase.Mvtk.MvtkInputModule
 * @function auth
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {Promise<void>}
 */
// tslint:disable-next-line:max-func-body-length cyclomatic-complexity
export async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.session === undefined) {
        next(new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property));

        return;
    }
    try {
        const purchaseModel = new PurchaseModel(req.session.purchase);
        if (purchaseModel.isExpired()) throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Expire);
        const transaction = purchaseModel.transaction;
        const screeningEvent = purchaseModel.screeningEvent;
        const seller = purchaseModel.seller;
        if (transaction === undefined
            || screeningEvent === undefined
            || screeningEvent.coaInfo === undefined
            || seller === undefined
            || seller.id === undefined) {
            throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        }
        //取引id確認
        if (req.body.transactionId !== transaction.id) {
            throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Property);
        }
        purchaseMvtkInputForm(req);
        const validationResult = await req.getValidationResult();
        if (!validationResult.isEmpty()) throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Access);
        const inputInfoList: IInputInfo[] = JSON.parse(req.body.mvtk);
        mvtkValidation(inputInfoList);
        log('ムビチケ券検証');
        const movieTickets = inputInfoList.map((i) => {
            return {
                typeOf: <cinerinoService.factory.paymentMethodType.MovieTicket>cinerinoService.factory.paymentMethodType.MovieTicket,
                project: seller.project,
                identifier: i.code, // 購入管理番号
                accessCode: i.password // PINコード
            };
        });
        const options = getApiOption(req);
        const paymentService = new cinerinoService.service.Payment(options);
        const checkMovieTicketAction = await paymentService.checkMovieTicket({
            typeOf: cinerinoService.factory.paymentMethodType.MovieTicket,
            movieTickets: movieTickets.map((movieTicket) => {
                return {
                    ...movieTicket,
                    serviceType: '', // 情報空でよし
                    serviceOutput: {
                        reservationFor: {
                            typeOf: screeningEvent.typeOf,
                            id: screeningEvent.id
                        },
                        reservedTicket: {
                            ticketedSeat: {
                                typeOf: cinerinoService.factory.chevre.placeType.Seat,
                                seatingType: <any>'', // 情報空でよし
                                seatNumber: '', // 情報空でよし
                                seatRow: '', // 情報空でよし
                                seatSection: '' // 情報空でよし
                            }
                        }
                    }
                };
            }),
            seller: {
                typeOf: seller.typeOf,
                id: seller.id
            }
        });
        if (checkMovieTicketAction.result === undefined) {
            throw new Error('checkMovieTicketAction error');
        }
        const success = 'N000';
        const purchaseNumberAuthResult = checkMovieTicketAction.result.purchaseNumberAuthResult;
        if (purchaseNumberAuthResult.resultInfo.status !== success
            || purchaseNumberAuthResult.ykknmiNumSum === null
            || purchaseNumberAuthResult.ykknmiNumSum === 0
            || purchaseNumberAuthResult.knyknrNoInfoOut === null) {
            throw new Error('purchaseNumberAuth error');
        }
        log('ムビチケ認証', purchaseNumberAuthResult);
        const validationList: string[] = [];

        // ムビチケセッション作成
        const mvtkList: IMvtk[] = [];
        for (const purchaseNumberInfo of purchaseNumberAuthResult.knyknrNoInfoOut) {
            if (purchaseNumberInfo.ykknInfo === null) continue;
            for (const info of purchaseNumberInfo.ykknInfo) {
                const input = inputInfoList.find((value) => {
                    return (value.code === purchaseNumberInfo.knyknrNo);
                });
                if (input === undefined) continue;
                // ムビチケチケットコード取得
                const ticket = await COA.services.master.mvtkTicketcode({
                    theaterCode: screeningEvent.coaInfo.theaterCode,
                    kbnDenshiken: purchaseNumberInfo.dnshKmTyp,
                    kbnMaeuriken: purchaseNumberInfo.znkkkytsknGkjknTyp,
                    kbnKensyu: info.ykknshTyp,
                    salesPrice: Number(info.knshknhmbiUnip),
                    appPrice: Number(info.kijUnip),
                    kbnEisyahousiki: info.eishhshkTyp,
                    titleCode: screeningEvent.coaInfo.titleCode,
                    titleBranchNum: screeningEvent.coaInfo.titleBranchNum,
                    dateJouei: screeningEvent.coaInfo.dateJouei
                });
                log('ムビチケチケットコード取得', ticket);
                const validTicket = {
                    ykknshTyp: info.ykknshTyp, // 有効券種区分
                    eishhshkTyp: info.eishhshkTyp, // 映写方式区分
                    ykknKnshbtsmiNum: info.ykknKnshbtsmiNum, // 有効期限券種別枚数
                    knshknhmbiUnip: info.knshknhmbiUnip, // 鑑賞券販売単価
                    kijUnip: info.kijUnip, // 計上単価
                    dnshKmTyp: purchaseNumberInfo.dnshKmTyp, // 電子券区分
                    znkkkytsknGkjknTyp: purchaseNumberInfo.znkkkytsknGkjknTyp // 全国共通券・劇場券区分
                };
                mvtkList.push({
                    code: purchaseNumberInfo.knyknrNo,
                    password: bace64Encode(input.password),
                    ykknInfo: validTicket,
                    ticket: ticket
                });
            }
            if (purchaseNumberInfo.knyknrNoMkujyuCd !== undefined) {
                validationList.push(purchaseNumberInfo.knyknrNo);
            }
        }
        // 認証エラーバリデーション
        if (validationList.length > 0) {
            logger.error('SSKTS-APP:MvtkInputModule.auth', purchaseNumberAuthResult);
            const err = new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Validation, JSON.stringify(validationList));
            res.locals.mvtkInfo = JSON.parse(req.body.mvtk);
            res.locals.purchaseModel = purchaseModel;
            res.locals.step = PurchaseModel.TICKET_STATE;
            res.locals.error = err.errors[0].message;
            res.render('purchase/mvtk/input', { layout: 'layouts/purchase/layout' });

            return;
        }
        req.session.mvtk = mvtkList;
        purchaseModel.checkMovieTicketAction = checkMovieTicketAction;
        purchaseModel.save(req.session);
        res.redirect('/purchase/mvtk/confirm');
    } catch (err) {
        next(err);
    }
}

/**
 * ムビチケ券検証
 * @function mvtkValidation
 * @param {InputInfo[]} inputInfoList
 */
function mvtkValidation(inputInfoList: IInputInfo[]): void {
    const codeList = inputInfoList.map((inputInfo) => {
        return inputInfo.code;
    });
    const validationList = codeList.filter((code, index) => {
        return codeList.indexOf(code) === index && index !== codeList.lastIndexOf(code);
    });
    if (validationList.length > 0) {
        throw new AppError(HTTPStatus.BAD_REQUEST, ErrorType.Validation, JSON.stringify(validationList));
    }
}

/**
 * 入力情報
 * InputInfo
 */
interface IInputInfo {
    /**
     * 購入管理番号
     */
    code: string;
    /**
     * PINコード
     */
    password: string;
    /**
     * エラー
     */
    error: string | undefined;
}
