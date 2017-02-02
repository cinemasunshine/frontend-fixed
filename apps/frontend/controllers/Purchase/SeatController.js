"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const PurchaseController_1 = require("./PurchaseController");
const SeatForm_1 = require("../../forms/Purchase/SeatForm");
const PurchaseSession = require("../../models/Purchase/PurchaseModel");
const config = require("config");
const COA = require("@motionpicture/coa-service");
const MP = require("../../../../libs/MP");
const GMO = require("@motionpicture/gmo-service");
class SeatSelectController extends PurchaseController_1.default {
    index() {
        if (!this.req.params || !this.req.params['id'])
            return this.next(new Error(PurchaseController_1.default.ERROR_MESSAGE_ACCESS));
        if (!this.purchaseModel.accessAuth(PurchaseSession.PurchaseModel.SEAT_STATE))
            return this.next(new Error(PurchaseController_1.default.ERROR_MESSAGE_ACCESS));
        MP.getPerformance.call({
            id: this.req.params['id']
        }).then((result) => {
            this.res.locals['performance'] = result;
            this.res.locals['step'] = PurchaseSession.PurchaseModel.SEAT_STATE;
            this.res.locals['reserveSeats'] = null;
            if (this.purchaseModel.reserveSeats) {
                this.logger.debug('仮予約中');
                this.res.locals['reserveSeats'] = JSON.stringify(this.purchaseModel.reserveSeats);
            }
            this.purchaseModel.performance = result;
            if (!this.req.session)
                return this.next(new Error('session is undefined'));
            this.req.session['purchase'] = this.purchaseModel.formatToSession();
            this.res.locals['error'] = null;
            return this.res.render('purchase/seat');
        }, (err) => {
            return this.next(new Error(err.message));
        });
    }
    select() {
        if (!this.transactionAuth())
            return this.next(new Error(PurchaseController_1.default.ERROR_MESSAGE_ACCESS));
        SeatForm_1.default(this.req, this.res, () => {
            if (this.req.form.isValid) {
                this.reserve().then(() => {
                    if (!this.router)
                        return this.next(new Error('router is undefined'));
                    if (!this.req.session)
                        return this.next(new Error('session is undefined'));
                    this.req.session['purchase'] = this.purchaseModel.formatToSession();
                    return this.res.redirect(this.router.build('purchase.ticket', {}));
                }, (err) => {
                    return this.next(new Error(err.message));
                });
            }
            else {
                if (!this.req.params || !this.req.params['id'])
                    return this.next(new Error(PurchaseController_1.default.ERROR_MESSAGE_ACCESS));
                this.res.locals['performance'] = this.purchaseModel.performance;
                this.res.locals['step'] = PurchaseSession.PurchaseModel.SEAT_STATE;
                this.res.locals['reserveSeats'] = this.req.body.reserveSeats;
                this.res.locals['error'] = this.req.form.getErrors();
                return this.res.render('purchase/seat');
            }
        });
    }
    reserve() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.purchaseModel.performance)
                throw new Error('performance is undefined');
            if (!this.purchaseModel.transactionMP)
                throw new Error('transactionMP is undefined');
            let performance = this.purchaseModel.performance;
            if (this.purchaseModel.reserveSeats) {
                if (!this.purchaseModel.authorizationCOA)
                    throw new Error('authorizationCOA is undefined');
                let reserveSeats = this.purchaseModel.reserveSeats;
                yield COA.deleteTmpReserveInterface.call({
                    theater_code: performance.attributes.theater._id,
                    date_jouei: performance.attributes.day,
                    title_code: performance.attributes.film.coa_title_code,
                    title_branch_num: performance.attributes.film.coa_title_branch_num,
                    time_begin: performance.attributes.time_start,
                    tmp_reserve_num: reserveSeats.tmp_reserve_num,
                });
                this.logger.debug('COA仮予約削除');
                yield MP.removeCOAAuthorization.call({
                    transactionId: this.purchaseModel.transactionMP._id,
                    coaAuthorizationId: this.purchaseModel.authorizationCOA._id,
                });
                this.logger.debug('MPCOAオーソリ削除');
                if (this.purchaseModel.transactionGMO
                    && this.purchaseModel.authorizationGMO) {
                    yield GMO.CreditService.alterTranInterface.call({
                        shop_id: config.get('gmo_shop_id'),
                        shop_pass: config.get('gmo_shop_password'),
                        access_id: this.purchaseModel.transactionGMO.access_id,
                        access_pass: this.purchaseModel.transactionGMO.access_pass,
                        job_cd: GMO.Util.JOB_CD_VOID
                    });
                    this.logger.debug('GMOオーソリ取消');
                    yield MP.removeGMOAuthorization.call({
                        transactionId: this.purchaseModel.transactionMP._id,
                        gmoAuthorizationId: this.purchaseModel.authorizationGMO._id,
                    });
                    this.logger.debug('GMOオーソリ削除');
                }
            }
            let seats = JSON.parse(this.req.body.seats);
            this.purchaseModel.reserveSeats = yield COA.reserveSeatsTemporarilyInterface.call({
                theater_code: performance.attributes.theater._id,
                date_jouei: performance.attributes.day,
                title_code: performance.attributes.film.coa_title_code,
                title_branch_num: performance.attributes.film.coa_title_branch_num,
                time_begin: performance.attributes.time_start,
                screen_code: performance.attributes.screen.coa_screen_code,
                list_seat: seats,
            });
            this.logger.debug('COA仮予約', this.purchaseModel.reserveSeats);
            this.purchaseModel.reserveTickets = this.purchaseModel.reserveSeats.list_tmp_reserve.map((tmpReserve) => {
                return {
                    section: tmpReserve.seat_section,
                    seat_code: tmpReserve.seat_num,
                    ticket_code: '',
                    ticket_name_ja: '',
                    ticket_name_en: '',
                    ticket_name_kana: '',
                    std_price: 0,
                    add_price: 0,
                    dis_price: 0,
                    sale_price: 0,
                };
            });
            let COAAuthorizationResult = yield MP.addCOAAuthorization.call({
                transaction: this.purchaseModel.transactionMP,
                reserveSeatsTemporarilyResult: this.purchaseModel.reserveSeats,
                salesTicketResults: this.purchaseModel.reserveTickets,
                performance: performance,
                totalPrice: this.purchaseModel.getReserveAmount()
            });
            this.logger.debug('MPCOAオーソリ追加', COAAuthorizationResult);
            this.purchaseModel.authorizationCOA = COAAuthorizationResult;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SeatSelectController;
