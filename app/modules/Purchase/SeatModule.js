/**
 * 購入座席選択
 * @namespace Purchase.SeatModule
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const COA = require("@motionpicture/coa-service");
const debug = require("debug");
const MP = require("../../../libs/MP");
const SeatForm_1 = require("../../forms/Purchase/SeatForm");
const PurchaseSession = require("../../models/Purchase/PurchaseModel");
const ErrorUtilModule = require("../Util/ErrorUtilModule");
const UtilModule = require("../Util/UtilModule");
const log = debug('SSKTS');
/**
 * 座席選択
 * @memberOf Purchase.SeatModule
 * @function index
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {Promise<void>}
 */
function index(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.session === undefined)
                throw ErrorUtilModule.ERROR_PROPERTY;
            const purchaseModel = new PurchaseSession.PurchaseModel(req.session.purchase);
            if (!purchaseModel.accessAuth(PurchaseSession.PurchaseModel.SEAT_STATE)) {
                throw ErrorUtilModule.ERROR_ACCESS;
            }
            if (req.params.id === undefined)
                throw ErrorUtilModule.ERROR_ACCESS;
            if (purchaseModel.transactionMP === null)
                throw ErrorUtilModule.ERROR_PROPERTY;
            purchaseModel.performance = yield MP.getPerformance(req.params.id);
            log('パフォーマンス取得');
            purchaseModel.theater = yield MP.getTheater(purchaseModel.performance.attributes.theater.id);
            log('劇場詳細取得');
            if (purchaseModel.theater === null)
                throw ErrorUtilModule.ERROR_PROPERTY;
            const website = purchaseModel.theater.attributes.websites.find((value) => {
                return (value.group === 'PORTAL');
            });
            purchaseModel.performanceCOA = yield MP.getPerformanceCOA(purchaseModel.performance.attributes.theater.id, purchaseModel.performance.attributes.screen.id, purchaseModel.performance.attributes.film.id);
            log('COAパフォーマンス取得');
            res.locals.performance = purchaseModel.performance;
            res.locals.performanceCOA = purchaseModel.performanceCOA;
            res.locals.step = PurchaseSession.PurchaseModel.SEAT_STATE;
            res.locals.reserveSeats = (purchaseModel.reserveSeats !== null)
                ? JSON.stringify(purchaseModel.reserveSeats) //仮予約中
                : null;
            res.locals.transactionId = purchaseModel.transactionMP.id;
            res.locals.error = null;
            res.locals.portalTheaterSite = (website !== undefined) ? website.url : UtilModule.getPortalUrl();
            //セッション更新
            req.session.purchase = purchaseModel.toSession();
            res.render('purchase/seat', { layout: 'layouts/purchase/layout' });
            return;
        }
        catch (err) {
            const error = (err instanceof Error)
                ? new ErrorUtilModule.CustomError(ErrorUtilModule.ERROR_EXTERNAL_MODULE, err.message)
                : new ErrorUtilModule.CustomError(err, undefined);
            next(error);
            return;
        }
    });
}
exports.index = index;
/**
 * 座席決定
 * @memberOf Purchase.SeatModule
 * @function select
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {Promise<void>}
 */
function select(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.session === undefined)
                throw ErrorUtilModule.ERROR_PROPERTY;
            if (req.session.purchase === undefined)
                throw ErrorUtilModule.ERROR_EXPIRE;
            const purchaseModel = new PurchaseSession.PurchaseModel(req.session.purchase);
            if (purchaseModel.transactionMP === null)
                throw ErrorUtilModule.ERROR_PROPERTY;
            if (req.params.id === undefined)
                throw ErrorUtilModule.ERROR_ACCESS;
            //取引id確認
            if (req.body.transaction_id !== purchaseModel.transactionMP.id)
                throw ErrorUtilModule.ERROR_ACCESS;
            if (purchaseModel.theater === null)
                throw ErrorUtilModule.ERROR_PROPERTY;
            const website = purchaseModel.theater.attributes.websites.find((value) => {
                return (value.group === 'PORTAL');
            });
            //バリデーション
            SeatForm_1.default(req);
            const validationResult = yield req.getValidationResult();
            if (!validationResult.isEmpty()) {
                res.locals.transactionId = purchaseModel.transactionMP;
                res.locals.performance = purchaseModel.performance;
                res.locals.step = PurchaseSession.PurchaseModel.SEAT_STATE;
                res.locals.reserveSeats = req.body.seats;
                res.locals.error = validationResult.mapped();
                res.locals.portalTheaterSite = (website !== undefined) ? website.url : UtilModule.getPortalUrl();
                res.render('purchase/seat', { layout: 'layouts/purchase/layout' });
                return;
            }
            const selectSeats = JSON.parse(req.body.seats).list_tmp_reserve;
            yield reserve(selectSeats, purchaseModel);
            //セッション更新
            req.session.purchase = purchaseModel.toSession();
            //券種選択へ
            res.redirect('/purchase/ticket');
            return;
        }
        catch (err) {
            const error = (err instanceof Error)
                ? new ErrorUtilModule.CustomError(ErrorUtilModule.ERROR_EXTERNAL_MODULE, err.message)
                : new ErrorUtilModule.CustomError(err, undefined);
            next(error);
            return;
        }
    });
}
exports.select = select;
/**
 * 座席仮予約
 * @memberOf Purchase.SeatModule
 * @function reserve
 * @param {ReserveSeats[]} reserveSeats
 * @param {PurchaseSession.PurchaseModel} purchaseModel
 * @returns {Promise<void>}
 */
function reserve(selectSeats, purchaseModel) {
    return __awaiter(this, void 0, void 0, function* () {
        if (purchaseModel.performance === null)
            throw ErrorUtilModule.ERROR_PROPERTY;
        if (purchaseModel.transactionMP === null)
            throw ErrorUtilModule.ERROR_PROPERTY;
        if (purchaseModel.performanceCOA === null)
            throw ErrorUtilModule.ERROR_PROPERTY;
        const performance = purchaseModel.performance;
        //予約中
        if (purchaseModel.reserveSeats !== null) {
            if (purchaseModel.authorizationCOA === null)
                throw ErrorUtilModule.ERROR_PROPERTY;
            const reserveSeats = purchaseModel.reserveSeats;
            //COA仮予約削除
            yield COA.ReserveService.delTmpReserve({
                theater_code: performance.attributes.theater.id,
                date_jouei: performance.attributes.day,
                title_code: purchaseModel.performanceCOA.titleCode,
                title_branch_num: purchaseModel.performanceCOA.titleBranchNum,
                time_begin: performance.attributes.time_start,
                tmp_reserve_num: reserveSeats.tmp_reserve_num
            });
            log('COA仮予約削除');
            // COAオーソリ削除
            yield MP.removeCOAAuthorization({
                transactionId: purchaseModel.transactionMP.id,
                coaAuthorizationId: purchaseModel.authorizationCOA.id
            });
            log('MPCOAオーソリ削除');
        }
        //COA仮予約
        purchaseModel.reserveSeats = yield COA.ReserveService.updTmpReserveSeat({
            theater_code: performance.attributes.theater.id,
            date_jouei: performance.attributes.day,
            title_code: purchaseModel.performanceCOA.titleCode,
            title_branch_num: purchaseModel.performanceCOA.titleBranchNum,
            time_begin: performance.attributes.time_start,
            // cnt_reserve_seat: number,
            screen_code: purchaseModel.performanceCOA.screenCode,
            list_seat: selectSeats
        });
        log('COA仮予約', purchaseModel.reserveSeats);
        //コアAPI券種取得
        purchaseModel.salesTicketsCOA = yield COA.ReserveService.salesTicket({
            theater_code: purchaseModel.performance.attributes.theater.id,
            date_jouei: purchaseModel.performance.attributes.day,
            title_code: purchaseModel.performanceCOA.titleCode,
            title_branch_num: purchaseModel.performanceCOA.titleBranchNum,
            time_begin: purchaseModel.performance.attributes.time_start
            // screen_code: performance.screen.id
        });
        //コアAPI券種取得
        const salesTickets = purchaseModel.salesTicketsCOA;
        purchaseModel.reserveTickets = [];
        //予約チケット作成
        const tmpReserveTickets = purchaseModel.reserveSeats.list_tmp_reserve.map((tmpReserve) => {
            return {
                section: tmpReserve.seat_section,
                seat_code: tmpReserve.seat_num,
                ticket_code: salesTickets[0].ticket_code,
                ticket_name: salesTickets[0].ticket_name,
                ticket_name_eng: salesTickets[0].ticket_name_eng,
                ticket_name_kana: salesTickets[0].ticket_name_kana,
                std_price: salesTickets[0].std_price,
                add_price: salesTickets[0].add_price,
                dis_price: 0,
                sale_price: salesTickets[0].sale_price,
                add_price_glasses: 0,
                glasses: false,
                mvtk_num: '',
                mvtk_app_price: 0,
                add_glasses: 0
            };
        });
        let price = 0;
        for (const tmpReserveTicket of tmpReserveTickets) {
            price += tmpReserveTicket.sale_price;
        }
        //COAオーソリ追加
        const coaAuthorizationResult = yield MP.addCOAAuthorization({
            transaction: purchaseModel.transactionMP,
            reserveSeatsTemporarilyResult: purchaseModel.reserveSeats,
            salesTicketResults: tmpReserveTickets,
            performance: performance,
            performanceCOA: purchaseModel.performanceCOA,
            price: price
        });
        log('MPCOAオーソリ追加', coaAuthorizationResult);
        purchaseModel.authorizationCOA = coaAuthorizationResult;
        purchaseModel.authorizationCountGMO = 0;
        log('GMOオーソリカウント初期化');
    });
}
/**
 * スクリーン状態取得
 * @memberOf Purchase.SeatModule
 * @function getScreenStateReserve
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {Promise<Response>}
 */
function getScreenStateReserve(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const screenCode = `00${req.body.screen_code}`.slice(UtilModule.DIGITS_02);
            const screen = yield UtilModule.readJSONAsync(`./app/theaters/${req.body.theater_code}/${screenCode}.json`);
            const setting = yield UtilModule.readJSONAsync('./app/theaters/setting.json');
            const state = yield COA.ReserveService.stateReserveSeat(req.body);
            return res.json({
                err: null,
                result: {
                    screen: screen,
                    setting: setting,
                    state: state
                }
            });
        }
        catch (err) {
            return res.json({ err: err, result: null });
        }
    });
}
exports.getScreenStateReserve = getScreenStateReserve;