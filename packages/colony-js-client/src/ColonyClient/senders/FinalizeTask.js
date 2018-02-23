/* @flow */

import ColonyClient from '../index';
import { TASK_ID } from '../../schemaDefinitions';

type Params = { taskId: number };
type EventData = {};

export default class FinalizeTask extends ColonyClient.Sender<
  Params,
  EventData,
  ColonyClient,
> {
  static get schema(): {} {
    return TASK_ID;
  }
  static parseParams({ taskId }: Params) {
    return [taskId];
  }
  get _send(): number => * {
    return this.client.contract.functions.finalizeTask;
  }
  get _estimate(): number => * {
    return this.client.contract.estimate.finalizeTask;
  }
}
