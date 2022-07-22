const db = require('./DB');
const notify = require('../helpers/notify');
const config = require('./configReader');
const api = require('./api');
const log = require('../helpers/log');
const utils = require('../helpers/utils');

module.exports = async (itx, tx) => {

  const { paymentsDb } = db;
  const pay = new paymentsDb({
    txId: tx.id,
    senderId: tx.senderId,
    senderType: 1,
    recipientId: tx.recipientId,
    recipientType: 1,
    type: 0,
    actualType: 0,
    status: tx.confirmations > 1 ? 1 : 0,
    confirmations: tx.confirmations,
    updateCounter: 1,
    timestamp: tx.timestamp,
    amount: tx.amount,
    date: tx.date,
  });

  await pay.save();

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
