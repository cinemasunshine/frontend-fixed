"use strict";
const form = require("express-form");
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 購入者情報入力フォーム
 */
exports.default = (req) => {
    return form(form.field('theater_code', req.__('common.theater_code')).trim()
        .required('', `%s${req.__('common.validation.required')}`)
        .regex(/^[0-9]+$/, `%s${req.__('common.validation.is_number')}`), form.field('reserve_num', req.__('common.purchase_number')).trim()
        .required('', `%s${req.__('common.validation.required')}`)
        .regex(/^[0-9]+$/, `%s${req.__('common.validation.is_number')}`), form.field('tel_num', req.__('common.tel_num')).trim()
        .required('', `%s${req.__('common.validation.required')}`)
        .regex(/^[0-9]+$/, `%s${req.__('common.validation.is_number')}`));
};
