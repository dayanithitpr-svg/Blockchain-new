const { Blockchain, DIFFICULTY, calculateBlockHash, normaliseTransactions } = require("./blockchain");

/**
 * Validates browser-mined proof-of-work and commits a block safely against the
 * current in-memory transaction pool. It deliberately has no token reward logic.
 */
class Miner {
    constructor(transactionPool, blockchain = new Blockchain()) {
        this.transactionPool = transactionPool;
        this.blockchain = blockchain;
    }

    /** Validates a mined candidate, then removes exactly its pool transactions. */
    submitMinedBlock(candidate) {
        const error = this.#validate(candidate);
        if (error) return { success: false, message: error };

        const block = {
            blockNumber: candidate.blockNumber,
            timestamp: candidate.timestamp,
            transactions: normaliseTransactions(candidate.transactions),
            previousHash: candidate.previousHash,
            nonce: candidate.nonce,
            difficulty: DIFFICULTY,
            hash: candidate.hash,
            minerAddress: candidate.minerAddress,
            // Reserved for a later rewards module; no reward is issued here.
            reward: 0
        };
        const committedBlock = this.blockchain.addBlock(block);
        this.transactionPool.removeMinedTransactions(block.transactions.map((transaction) => transaction.id));
        return { success: true, block: committedBlock };
    }

    #validate(candidate) {
        if (!candidate || typeof candidate !== "object") return "Mined block is required";
        if (!Array.isArray(candidate.transactions) || !candidate.transactions.length) return "There are no transactions to mine";
        if (!Number.isSafeInteger(candidate.nonce) || candidate.nonce < 0) return "Nonce must be a non-negative integer";
        if (!Number.isSafeInteger(candidate.blockNumber) || candidate.blockNumber !== this.blockchain.getNextBlockNumber()) return "Block number is no longer current";
        if (typeof candidate.timestamp !== "string" || Number.isNaN(Date.parse(candidate.timestamp))) return "A valid timestamp is required";
        if (candidate.previousHash !== this.blockchain.getLatestHash()) return "Previous hash is no longer current";
        if (typeof candidate.minerAddress !== "string" || !candidate.minerAddress.trim()) return "Miner address is required";

        const current = this.transactionPool.getAll();
        const expected = JSON.stringify(normaliseTransactions(current));
        const submitted = JSON.stringify(normaliseTransactions(candidate.transactions));
        if (submitted !== expected) return "Transaction pool changed while mining; please mine again";

        const calculatedHash = calculateBlockHash(candidate);
        if (candidate.hash !== calculatedHash) return "Block hash verification failed";
        if (!candidate.hash.startsWith("0".repeat(DIFFICULTY))) return `Hash does not satisfy difficulty ${DIFFICULTY}`;
        return null;
    }
}

module.exports = { Miner };
