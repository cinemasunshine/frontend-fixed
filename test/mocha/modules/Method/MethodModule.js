"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Method.MethodModuleテスト
 */
const assert = require("assert");
const sinon = require("sinon");
const MethodModule = require("../../../../app/modules/Method/MethodModule");
describe('Method.MethodModule', () => {
    it('ticketing 正常', () => __awaiter(this, void 0, void 0, function* () {
        const req = {};
        const res = {
            render: sinon.spy()
        };
        yield MethodModule.ticketing(req, res);
        assert(res.render.calledOnce);
    }));
    it('entry 正常', () => __awaiter(this, void 0, void 0, function* () {
        const req = {};
        const res = {
            render: sinon.spy()
        };
        yield MethodModule.entry(req, res);
        assert(res.render.calledOnce);
    }));
    it('bookmark 正常', () => __awaiter(this, void 0, void 0, function* () {
        const req = {};
        const res = {
            render: sinon.spy()
        };
        yield MethodModule.bookmark(req, res);
        assert(res.render.calledOnce);
    }));
});
