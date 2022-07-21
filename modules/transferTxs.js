const db = require('./DB');
const notify = require('../helpers/notify');
const config = require('./configReader');
const api = require('./api');
const log = require('../helpers/log');
const utils = require('../helpers/utils');

module.exports = async (itx, tx) => {

  const { paymentsDb } = db;
  const payment = new paymentsDb({
    txid: tx.id,
    senderId: tx.senderId,
    date: utils.unixTimeStampMs(),
    timestamp: tx.timestamp,
    amount: tx.amount,
    fee: 0,
    type: 0,
    senderPublicKey: tx.senderPublicKey,
    recipientPublicKey: tx.recipientPublicKey,
    // these will be undefined, when we get Tx via socket. Actually we don't need them, store them for a reference
    blockId: tx.blockId,
    height: tx.height,
    block_timestamp: tx.block_timestamp,
    confirmations: tx.confirmations,
    // these will be undefined, when we get Tx via REST
    relays: tx.relays,
    receivedAt: tx.receivedAt,
  });


  const msgSendBack = `I got a transfer from you. Thanks, bro.`;
  const msgNotify = `${config.notifyName} got a transfer transaction. Income ADAMANT Tx: https://explorer.adamant.im/tx/${tx.id}.`;
  const notifyType = 'log';

  await itx.update({ isProcessed: true }, true);

  notify(msgNotify, notifyType);
  api.sendMessage(config.passPhrase, tx.senderId, msgSendBack).then((response) => {
    if (!response.success) {
      log.warn(`Failed to send ADM message '${msgSendBack}' to ${tx.senderId}. ${response.errorMessage}.`);
    }
  });

};
