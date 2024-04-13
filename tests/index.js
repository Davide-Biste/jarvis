import { actions } from '../src/api/algorithm/controller.js';
import { Algorithm } from '../src/api/algorithm/model.js';
import { Scheduler } from '../src/api/scheduler/model.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Algorithm Controller', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('getAllAlgos returns all algorithms', async () => {
        const req = { params: {}, body: {} };
        const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
        const stubValue = [{ name: 'algo1' }, { name: 'algo2' }];
        sinon.stub(Algorithm, 'find').returns(stubValue);

        await actions.getAllAlgos(req, res);

        expect(res.status.calledWith(200)).to.be.true;
        expect(res.send.calledWith(stubValue)).to.be.true;
    });

    it('createAlgo creates an algorithm', async () => {
        const req = { params: {}, body: { name: 'newAlgo' } };
        const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
        const stubValue = { name: 'newAlgo' };
        sinon.stub(Algorithm, 'create').returns(stubValue);

        await actions.createAlgo(req, res);

        expect(res.status.calledWith(201)).to.be.true;
        expect(res.send.calledWith(stubValue)).to.be.true;
    });

    it('findAlgoById returns algorithm if found', async () => {
        const req = { params: { id: '123' }, body: {} };
        const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
        const stubValue = { name: 'foundAlgo' };
        sinon.stub(Algorithm, 'findById').returns(stubValue);

        await actions.findAlgoById(req, res);

        expect(res.status.calledWith(200)).to.be.true;
        expect(res.send.calledWith(stubValue)).to.be.true;
    });

    it('findAlgoById returns 404 if algorithm not found', async () => {
        const req = { params: { id: '123' }, body: {} };
        const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
        sinon.stub(Algorithm, 'findById').returns(null);

        await actions.findAlgoById(req, res);

        expect(res.status.calledWith(404)).to.be.true;
        expect(res.send.calledWith({ message: 'Algorithm not found' })).to.be.true;
    });

    it('connectAlgoToScheduler connects algorithm to scheduler', async () => {
        const req = { params: { algoId: '123', scheduleId: '456' }, body: {} };
        const res = { status: sinon.stub().returnsThis(), send: sinon.stub() };
        const stubAlgo = { _id: '123' };
        const stubScheduler = { algorithms: [], save: sinon.stub() };
        sinon.stub(Algorithm, 'findById').returns(stubAlgo);
        sinon.stub(Scheduler, 'findById').returns(stubScheduler);

        await actions.connectAlgoToScheduler(req, res);

        expect(res.status.calledWith(200)).to.be.true;
        expect(res.send.calledWith({ 'message': 'Algorithm connected to scheduler successfully' })).to.be.true;
    });
});