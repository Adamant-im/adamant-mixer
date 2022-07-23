const config = require('./configReader');
const log = require('../helpers/log');
const notify = require('../helpers/notify');
const constants = require('../helpers/const');
const utils = require('../helpers/utils');
const exchangerUtils = require('../helpers/cryptos/exchanger');
const db = require('./DB');
const api = require('./api');
const {
  ADM_MAX_CONFIRMATION_COUNTER,
  ADM_MIN_CONFIRMATIONS,
  PAYMENT_STATUSES,
  SAT,
  TX_CHECKER_INTERVAL,
} = require('../helpers/const');

module.exports = async (pay) => {

  const admTxDescription = `Income ADAMANT Tx: ${constants.ADM_EXPLORER_URL}/tx/${pay ? pay.txId : 'undefined'} from ${pay ? pay.senderId : 'undefined'}`;
  try {

    log.log(`Updating incoming Tx ${pay.txId} confirmations… ${admTxDescription}.`);

    const tx = await exchangerUtils['ADM'].getTransaction(pay.txId);
    if (!tx) {
      log.warn(`Unable to fetch validated Tx ${pay.txId} info. Will try again next time. ${admTxDescription}.`);
      return;
    }

    pay.confirmations = tx.confirmations;
    if (pay.updateCounter > ADM_MAX_CONFIRMATION_COUNTER) {
      pay.status = PAYMENT_STATUSES.FAILED;
      await pay.save();
      const msgNotify = `${config.notifyName} notifies transaction _${pay.txId}_ of _${pay.amount/SAT}_ _ADM_ is Failed. ${admTxDescription}.`;
      const msgSendBack = `Transaction of _${pay.amount/SAT}_ _ADM_ with Tx ID _${pay.txId}_ is Failed and will not be processed. Check _ADM_ blockchain explorer and try again. If you think it’s a mistake, contact my master.`;
      notify(msgNotify, 'error');
      api.sendMessage(config.passPhrase, pay.senderId, msgSendBack).then((response) => {
        if (!response.success) {
          log.warn(`Failed to send ADM message '${msgSendBack}' to ${pay.senderId}. ${response.errorMessage}.`);
        }
      });
      return;
    }

    if (!tx.height && tx.confirmations < ADM_MIN_CONFIRMATIONS) {
      log.warn(`Unable to get Tx ${pay.txId} height or confirmations. Will try again next time. ${admTxDescription}.`);
      return;
    }

    let confirmations = tx.confirmations;
    if (!tx.confirmations && tx.height) {
      const lastBlockHeight = await exchangerUtils['ADM'].getLastBlockHeight();
      if (!lastBlockHeight) {
        log.warn(`Unable to get last block height for ADM to count Tx ${pay.txId} confirmations in ${utils.getModuleName(module.id)} module. Waiting for next try.`);
        return;
      }
      confirmations = lastBlockHeight - tx.height + 1;
    }

    if (confirmations >= ADM_MIN_CONFIRMATIONS) {
      log.log(`Tx ${pay.txId} is confirmed, it reached minimum of 2 network confirmations. ${admTxDescription}.`);
    } else {
      log.log(`Updated Tx ${pay.txId} confirmations: ${pay.confirmations && confirmations >= 2 ? pay.confirmations : 0}. ${admTxDescription}.`);
    }

    pay.status = confirmations >= ADM_MIN_CONFIRMATIONS ? PAYMENT_STATUSES.CONFIRMED : PAYMENT_STATUSES.NOT_CONFIRMED;
    pay.confirmations = confirmations;
    pay.updateCounter++;
    await pay.save();

  } catch (e) {
    log.error(`Failed to get Tx ${pay ? pay.txId : 'undefined'} confirmations: ${e.toString()}. Will try again next time. ${admTxDescription}.`);
  }

};

setInterval(async () => {
  const { paymentsDb } = db;
  (arr = await paymentsDb.find({
    status: PAYMENT_STATUSES.NOT_CONFIRMED,
  }));
  arr.forEach(async (pay) => {
    module.exports(pay);
  });
}, constants.CONFIRMATIONS_INTERVAL);
