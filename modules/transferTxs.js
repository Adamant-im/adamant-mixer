const db = require('./DB');
const notify = require('../helpers/notify');
const config = require('./configReader');
const api = require('./api');
const log = require('../helpers/log');
const utils = require('../helpers/utils');
const { USER_STATUSES, ADM_MIN_CONFIRMATIONS, PAYMENT_STATUSES } = require('../helpers/const');

module.exports = async (itx, tx) => {

  const { paymentsDb } = db;
  const pay = new paymentsDb({
    txId: tx.id,
    senderId: tx.senderId,
    senderType: USER_STATUSES.REAL,
    recipientId: tx.recipientId,
    recipientType: USER_STATUSES.REAL,
    type: 0,
    actualType: 0,
    status: tx.confirmations >= ADM_MIN_CONFIRMATIONS ? PAYMENT_STATUSES.CONFIRMED : PAYMENT_STATUSES.NOT_CONFIRMED,
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
