const db = require('./DB');
const notify = require('../helpers/notify');
const config = require('./configReader');
const api = require('./api');
const log = require('../helpers/log');
const utils = require('../helpers/utils');
const {
  USER_STATUSES,
  ADM_MIN_CONFIRMATIONS,
  PAYMENT_STATUSES,
} = require('../helpers/const');

module.exports = async (itx, tx) => {

  if (tx.type === 8) { // income payment from chat
    const msg = itx.decryptedMessage || '';
    if (msg.includes('_transaction')) { // not ADM income payment
      const currencyMsg = msg.match(/"type":"(.*)_transaction/)[1];
      const txDetailsMsg = utils.tryParseJSON(msg);
      if (txDetailsMsg) {
        const amountMsg = txDetailsMsg.amount; // expected string type

        const msgSendBack = `I’ve got a payment of ${amountMsg} ${currencyMsg}. I work with ADM only. If you want a refund, contact my master.`;
        const msgNotify = `${config.notifyName} got a transfer transaction of ${amountMsg} ${currencyMsg} from ${tx.senderId}.` +
          `It’s not verified, attention needed. Income ADAMANT Tx: https://explorer.adamant.im/tx/${tx.id}.`;
        const notifyType = 'warn';

        notify(msgNotify, notifyType);
        api.sendMessage(config.passPhrase, tx.senderId, msgSendBack).then((response) => {
          if (!response.success) {
            log.warn(`Failed to send ADM message '${msgSendBack}' to ${tx.senderId}. ${response.errorMessage}.`);
          }
        });
      }
    }
  }
  const { paymentsDb } = db;
  const pay = new paymentsDb({
    txId: tx.id,
    senderId: tx.senderId,
    senderType: USER_STATUSES.REAL,
    recipientId: tx.recipientId,
    recipientType: USER_STATUSES.REAL,
    type: tx.type,
    actualType: tx.type,
    status: tx.confirmations >= ADM_MIN_CONFIRMATIONS ? PAYMENT_STATUSES.CONFIRMED : PAYMENT_STATUSES.PENDING,
    confirmations: tx.confirmations,
    updateCounter: 1,
    timestamp: tx.timestamp,
    amount: tx.amount,
    date: tx.date,
  });

  await pay.save();

  const msgSendBack = `You trying to make a deposit. It's verifying now.`;
  const msgNotify = `${config.notifyName} got a deposit. Income ADAMANT Tx: https://explorer.adamant.im/tx/${tx.id}.`;
  const notifyType = 'log';

  await itx.update({ isProcessed: true }, true);

  // ? notify(msgNotify, notifyType);
  // ? api.sendMessage(config.passPhrase, tx.senderId, msgSendBack).then((response) => {
  // ?   if (!response.success) {
  // ?     log.warn(`Failed to send ADM message '${msgSendBack}' to ${tx.senderId}. ${response.errorMessage}.`);
  // ?   }
  // ? });

};
