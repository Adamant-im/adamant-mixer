module.exports = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  SAT: 100000000, // 1 ADM = 100000000
  ADM_EXPLORER_URL: 'https://explorer.adamant.im',
  EPOCH: Date.UTC(2017, 8, 2, 17, 0, 0, 0), // ADAMANT's epoch time
  TX_CHECKER_INTERVAL: 4 * 1000, // Check for new Txs every 4 seconds; additionally Exchanger receives new Txs instantly via socket
  UPDATE_CRYPTO_RATES_INTERVAL: 60 * 1000, // Update crypto rates every minute
  PRECISION_DECIMALS: 8, // Accuracy for converting cryptos, 9.12345678 ETH
  PRINT_DECIMALS: 8, // For pretty print, 9.12345678 ETH
  MAX_ADM_MESSAGE_LENGTH: 10000,
  DEFAULT_ORDERBOOK_ORDERS_COUNT: 15,
  CONFIRMATIONS_INTERVAL: 3 * 1000, // Check for payment confirmations every 3 sec

  ERRORS: {
    UNABLE_TO_FETCH_TX: 10,
    WRONG_SENDER: 11,
    WRONG_RECIPIENT: 12,
    WRONG_AMOUNT: 13,
    WRONG_TIMESTAMP: 34,
    NO_IN_KVS_ADDRESS: 8,
    NO_OUT_KVS_ADDRESS: 9,
    TX_FAILED: 14,
    UNABLE_TO_FETCH_SENT_TX: 14,
    SENT_TX_FAILED: 21,

  },
};
