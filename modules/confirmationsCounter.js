const config = require('./configReader');
const log = require('../helpers/log');
const notify = require('../helpers/notify');
const utils = require('../helpers/utils');
const exchangerUtils = require('../helpers/cryptos/exchanger');
const db = require('./DB');
const commandTxs = require('./commandTxs');
const api = require('./api');
const {
  ADM_EXPLORER_URL,
  ADM_MAX_CONFIRMATION_COUNTER,
  ADM_MIN_CONFIRMATIONS,
  PAYMENT_STATUSES,
  SAT,
  CONFIRMATIONS_INTERVAL,
} = require('../helpers/const');

module.exports = async (pay) => {

  const admTxDescription = `Income ADAMANT Tx: ${ADM_EXPLORER_URL}/tx/${pay ? pay.txId : 'undefined'} from ${pay ? pay.senderId : 'undefined'}`;
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
      log.log(`Tx ${pay.txId} is failed after ${ADM_MAX_CONFIRMATION_COUNTER} verification attempts. ${admTxDescription}.`);

      let output = `I’m unable to verify deposit of ${utils.satsToADM(pay.amount)} ADM.` + '\n\n';

      let commandResult = await commandTxs('/balances ' + pay.senderId, tx, null, false);
      output += `${commandResult.msgSendBack}` + '\n\n';
      balance = utils.satsToADM(commandResult.balancesArray[0].amount);

      commandResult = await commandTxs('/help', tx);
      output += `${commandResult.msgSendBack}`;

      const msgSendBack = output;
      const msgNotify = `Deposit to ${config.notifyName} of ${utils.satsToADM(pay.amount)} from ${pay.senderId} failed.` +
        `Total user balance is ${balance} ADM (0 ADM frozen)` +
        `Income ADAMANT Tx: https://explorer.adamant.im/tx/${pay.txId}.`;
      const notifyType = 'error';

      notify(msgNotify, notifyType);
      api.sendMessage(config.passPhrase, tx.senderId, msgSendBack).then((response) => {
        if (!response.success) {
          log.warn(`Failed to send ADM message '${msgSendBack}' to ${tx.senderId}. ${response.errorMessage}.`);
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

    pay.status = confirmations >= ADM_MIN_CONFIRMATIONS ? PAYMENT_STATUSES.CONFIRMED : PAYMENT_STATUSES.PENDING;
    pay.confirmations = confirmations;
    pay.updateCounter++;
    await pay.save();

    if (confirmations >= ADM_MIN_CONFIRMATIONS) {
      log.log(`Tx ${pay.txId} is confirmed, it reached minimum of 2 network confirmations. ${admTxDescription}.`);

      let output = `I’ve got your deposit of ${utils.satsToADM(pay.amount)} ADM.` + '\n\n';

      let commandResult = await commandTxs('/balances ' + pay.senderId, tx, null, false);
      output += `${commandResult.msgSendBack}` + '\n\n';
      balance = utils.satsToADM(commandResult.balancesArray[0].amount);

      commandResult = await commandTxs('/help', tx);
      output += `${commandResult.msgSendBack}`;

      const msgSendBack = output;
      const msgNotify = `${config.notifyName} got a deposit of ${utils.satsToADM(pay.amount)} from ${pay.senderId}.` +
        `Total user balance is ${balance} ADM (0 ADM frozen)` +
        `Income ADAMANT Tx: https://explorer.adamant.im/tx/${pay.txId}.`;
      const notifyType = 'log';

      notify(msgNotify, notifyType);
      api.sendMessage(config.passPhrase, tx.senderId, msgSendBack).then((response) => {
        if (!response.success) {
          log.warn(`Failed to send ADM message '${msgSendBack}' to ${tx.senderId}. ${response.errorMessage}.`);
        }
      });

    } else {
      log.log(`Updated Tx ${pay.txId} confirmations: ${pay.confirmations && confirmations >= 2 ? pay.confirmations : 0}. ${admTxDescription}.`);
    }

  } catch (e) {
    log.error(`Failed to get Tx ${pay ? pay.txId : 'undefined'} confirmations: ${e.toString()}. Will try again next time. ${admTxDescription}.`);
  }

};

setInterval(async () => {
  const { paymentsDb } = db;
  (arr = await paymentsDb.find({
    status: PAYMENT_STATUSES.PENDING,
  }));
  arr.forEach(async (pay) => {
    module.exports(pay);
  });
}, CONFIRMATIONS_INTERVAL);
