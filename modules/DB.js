const log = require('../helpers/log');
const MongoClient = require('mongodb').MongoClient;
const mongoClient = new MongoClient('mongodb://localhost:27017/', { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 3000 });
const model = require('../helpers/dbModel');
const config = require('./configReader');

const collections = {};

mongoClient.connect((error, client) => {

  if (error) {
    log.error(`Unable to connect to MongoBD, ` + error);
    process.exit(-1);
  }
  const db = client.db('mixerdb');

  collections.db = db;

  const incomingTxsCollection = db.collection('incomingtxs');
  incomingTxsCollection.createIndex([['date', 1], ['senderId', 1]]);

  const paymentsCollection = db.collection('payments');
  paymentsCollection.createIndex([['txId', 1], ['status', 1]]);
  paymentsCollection.createIndex([['senderId', 1], ['recipientId', 1]]);

  collections.paymentsDb = model(paymentsCollection);
  collections.incomingTxsDb = model(incomingTxsCollection);
  collections.systemDb = model(db.collection('systems'));

  log.log(`${config.notifyName} successfully connected to 'mixerdb' MongoDB.`);

});

module.exports = collections;
