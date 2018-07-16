import { utils } from 'ethers';
import { DAI } from '../../eth/Currency';

export default class OasisOrder {
  constructor() {
    this._fillAmount = null;
    this._hybrid = null;
  }

  fillAmount() {
    return this._fillAmount;
  }

  fees() {
    return this._hybrid.getOriginalTransaction().fees();
  }

  created() {
    return this._hybrid.getOriginalTransaction().timestamp();
  }

  transact(oasisContract, transaction, transactionService) {
    return transactionService.createTransactionHybrid(
      transaction,
      this,
      receiptLogs => {
        const LogTradeEvent = oasisContract.getInterface().events.LogTrade;
        const LogTradeTopic = utils.keccak256(
          transactionService.get('web3')._web3.toHex(LogTradeEvent.signature)
        ); //find a way to convert string to hex without web3
        const receiptEvents = receiptLogs.filter(e => {
          return (
            e.topics[0].toLowerCase() === LogTradeTopic.toLowerCase() &&
            e.address.toLowerCase() === oasisContract.getAddress().toLowerCase()
          );
        });
        let total = utils.bigNumberify('0');
        receiptEvents.forEach(event => {
          const parsedLog = LogTradeEvent.parse(event.data);
          total = total.add(parsedLog[this._logKey]);
        });
        this._fillAmount = DAI.wei(total.toString());
      }
    );
  }
}

export class OasisBuyOrder extends OasisOrder {
  constructor() {
    super();
    this._logKey = 'buy_amt';
  }

  static build(oasisContract, transaction, transactionService) {
    const order = new OasisBuyOrder();
    order._hybrid = order.transact(
      oasisContract,
      transaction,
      transactionService
    );
    return order._hybrid;
  }
}

export class OasisSellOrder extends OasisOrder {
  constructor() {
    super();
    this._logKey = 'pay_amt';
  }

  static build(oasisContract, transaction, transactionService) {
    const order = new OasisSellOrder();
    order._hybrid = order.transact(
      oasisContract,
      transaction,
      transactionService
    );
    return order._hybrid;
  }
}