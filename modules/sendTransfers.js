const api = require('./api');
const db = require('./DB').dbTransfers;
const config = require('./configReader');
const log = require('./log');
const _ = require('underscore');

async function sendTransfers() {
    try {
        const transfers = await db.syncFind({});
        if (transfers.length < config.count_transfers) {
            return;
        }

        _.shuffle(transfers).forEach(t => {
            console.log('Send ', t);
            const amount = t.amount.pop();
            const trans = api.send(config.passPhrase, t.recipientId, amount);
            if (!trans || !trans.success) {
                console.log({
                    trans
                })
                log.error('Error send transfer!');
                return;
            }
            const trans_id = trans.transactionId;

            api.send(config.passPhrase, t.recipientId, 'Mixer: Transfer from ' + t.senderId + ' ' + amount + ' ADM. TxId: ' + trans_id, 'message');
            api.send(config.passPhrase, t.senderId, 'Mixer: You transfer to ' + t.recipientId + ' ' + amount + ' ADM send. TxId: ' + trans_id, 'message');
            if (trans_id) {
                if (t.amount.length) {
                    db.update({
                        _id: t._id
                    }, {
                        $set: {
                            amount: t.amount
                        }
                    });
                } else { // deleted transaction
                    db.remove({
                        _id: t._id
                    });
                    api.send(config.passPhrase, t.recipientId, 'Mixer: finish transfer from ' + t.senderId + ' ' + t.total_amount + ' ADM. TxId: ' + trans_id, 'message');
                    api.send(config.passPhrase, t.senderId, 'Mixer: You transfer is finished! To ' + t.recipientId + ' ' + t.total_amount + ' ADM send. TxId: ' + trans_id, 'message');
                }

            }
        });
    } catch (e) {
        log.error(' Send: ' + e);
    }

}
setInterval(sendTransfers, 10 * 1000);