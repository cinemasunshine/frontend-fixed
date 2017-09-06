/**
 * ルーティング
 */

import * as express from 'express';
import * as ErrorModule from '../modules/Error/ErrorModule';
import * as UtilModule from '../modules/Util/UtilModule';
import fixedRouter from './fixed';
import inquiryRouter from './inquiry';
import methodRouter from './method';
import purchaseRouter from './purchase';
import rootRouter from './root';

const router = express.Router();

export default (app: express.Application) => {
    app.use('', rootRouter); // ROOT
    app.use('/purchase', purchaseRouter); // 購入
    app.use('/inquiry', inquiryRouter); // 照会
    app.use('/method', methodRouter); // 方法

    if (process.env.VIEW_TYPE === UtilModule.VIEW.Fixed) {
        app.use('', fixedRouter); // 券売機
    }

    //エラー
    router.get('/error', (req, res) => {
        ErrorModule.errorRender(new Error(), req, res);
    });
    app.use(ErrorModule.errorRender); // error handlers
    app.use(ErrorModule.notFoundRender); // 404
};
