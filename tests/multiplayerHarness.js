// Test-only RPC helpers; this class is never in the deployable Worker bundle.
import worker, { Gathering } from '../multiplayer-worker/index.js';
export default worker;
export class TestGathering extends Gathering {
  async expireRecords(kind) {
    for (const row of this.ctx.storage.sql.exec('SELECT data FROM records WHERE kind = ?', kind).toArray()) {
      const record = JSON.parse(row.data); record.deadline = Date.now() - 1; this.save(record);
    }
    await this.alarm();
  }
}
