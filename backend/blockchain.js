const { SHA256 } = require("crypto-js");

const DIFFICULTY = 4;
const EMPTY_PREVIOUS_HASH = "0";

/**
 * Keeps the application's mined blocks in memory. Persistence can be added
 * later without changing the proof-of-work API.
 */
class Blockchain {
    constructor() {
        this.blocks = [];
    }

    /** Returns the hash that a new block must reference. */
    getLatestHash() {
        return this.blocks.length ? this.blocks[this.blocks.length - 1].hash : EMPTY_PREVIOUS_HASH;
    }

    /** Returns the next sequential block number. */
    getNextBlockNumber() {
        return this.blocks.length + 1;
    }

    /** Adds an already verified block to this chain. */
    addBlock(block) {
        this.blocks.push(Object.freeze({ ...block, transactions: Object.freeze([...block.transactions]) }));
        return this.blocks[this.blocks.length - 1];
    }

    /** Updates the reward on an already committed block. */
    updateBlockReward(blockNumber, reward) {
        const index = this.blocks.findIndex((block) => block.blockNumber === blockNumber);
        if (index === -1) return null;

        this.blocks[index] = Object.freeze({ ...this.blocks[index], reward });
        return this.blocks[index];
    }

    /** Returns copies so API consumers cannot mutate the chain. */
    getAll() {
        return this.blocks.map((block) => ({ ...block, transactions: [...block.transactions] }));
    }
}

/** Produces the fixed transaction representation used in a block hash. */
function normaliseTransactions(transactions) {
    return transactions.map(({ id, sender, receiver, amount, createdAt }) => ({
        id, sender, receiver, amount, createdAt
    }));
}

/** Calculates the SHA-256 hash from the fields defined by the mining protocol. */
function calculateBlockHash(block) {
    const input = `${block.blockNumber}${block.timestamp}${JSON.stringify(normaliseTransactions(block.transactions))}${block.previousHash}${block.nonce}`;
    return SHA256(input).toString();
}

module.exports = { Blockchain, DIFFICULTY, calculateBlockHash, normaliseTransactions };
