/**
 * エラー
 * @namespace ErrorModule
 */
import * as cinerinoService from '@cinerino/sdk';
import * as debug from 'debug';
import { NextFunction, Request, Response } from 'express';
import * as HTTPStatus from 'http-status';
import { getApiOption } from '../../functions';
import logger from '../../middlewares/logger';
import { AppError, ErrorType, PurchaseModel } from '../../models';

const log = debug('SSKTS:Error.ErrorModule');

/**
 * Not Found
 * @memberof ErrorModule
 * @function notFoundRender
 * @param {Request} req
 * @param {Response} res
 * @returns {void}
 */
export function notFoundRender(req: Request, res: Response, _: NextFunction): void {
    const status = HTTPStatus.NOT_FOUND;
    if (req.xhr) {
        res.status(status).send({ error: 'Not Found.' });
    } else {
        res.status(status).render('error/notFound');
    }

    return;
}

/**
 * エラーページ
 * @memberof ErrorModule
 * @function errorRender
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {void}
 */
export async function errorRender(
    err: Error | AppError | cinerinoService.transporters.RequestError,
    req: Request,
    res: Response,
    _: NextFunction
) {
    let status = HTTPStatus.INTERNAL_SERVER_ERROR;
    let msg = err.message;
    if (err.hasOwnProperty('errors')) {
        switch ((<cinerinoService.transporters.RequestError | AppError>err).code) {
            case HTTPStatus.BAD_REQUEST:
                msg = req.__('common.error.badRequest');
                break;
            case HTTPStatus.UNAUTHORIZED:
                msg = req.__('common.error.unauthorized');
                break;
            case HTTPStatus.FORBIDDEN:
                msg = req.__('common.error.forbidden');
                break;
            case HTTPStatus.NOT_FOUND:
                msg = req.__('common.error.notFound');
                break;
            case HTTPStatus.SERVICE_UNAVAILABLE:
                msg = req.__('common.error.serviceUnavailable');
                logger.error('SSKTS-APP:ErrorModule', status, err.message, err);
                break;
            default:
                msg = req.__('common.error.internalServerError');
                logger.error('SSKTS-APP:ErrorModule', status, err.message, err);
        }
        if ((<AppError>err).errorType !== undefined && (<AppError>err).errorType === ErrorType.Expire) {
            msg = req.__('common.error.expire');
        }
        status = (<cinerinoService.transporters.RequestError | AppError>err).code;
    } else {
        log('Error');
        status = HTTPStatus.INTERNAL_SERVER_ERROR;
        msg = req.__('common.error.internalServerError');
        logger.error('SSKTS-APP:ErrorModule', 'Error', status, err.message, err);
    }
    if (req.session !== undefined
        && req.session.purchase !== undefined) {
        const purchaseModel = new PurchaseModel(req.session.purchase);
        if (purchaseModel.transaction !== undefined) {
            const options = getApiOption(req);
            const transactionService = new cinerinoService.service.transaction.PlaceOrder(options);
            await transactionService.cancel({ id: purchaseModel.transaction.id });
        }
    }
    deleteSession(req.session);
    /**
     * エラーメッセージ
     * Property: プロパティが無い
     * Access: 不正なアクセス
     * Validation: 不正な値のPOST
     * Expire: 有効期限切れ
     * ExternalModule: 外部モジュールエラー
     */
    if (req.xhr) {
        res.status(status).send({ error: 'Something failed.' });
    } else {
        res.locals.message = msg;
        res.locals.error = err;
        res.status(status).render('error/error');
    }

    return;
}

/**
 * セッション削除
 * @function deleteSession
 * @param {Express.Session | undefined} session
 */
export function deleteSession(session: Express.Session | undefined): void {
    if (session !== undefined) {
        delete session.purchase;
        delete session.mvtk;
        delete session.complete;
        delete session.auth;
    }
}
