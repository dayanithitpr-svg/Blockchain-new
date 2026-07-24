/** Represents the data that is proof-of-work mined before being submitted. */
class Block {
    constructor({ blockNumber, timestamp, transactions, previousHash, minerAddress }) {
        this.blockNumber = blockNumber;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.difficulty = ProofOfWork.difficulty;
        this.hash = "";
        this.minerAddress = minerAddress;
        // No reward is issued in this module; the field is retained for the block schema.
        this.reward = 0;
    }
}
