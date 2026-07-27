const crypto = require("crypto");

const DEFAULT_MAX_POOL_SIZE = 1000;
const TRANSACTION_STATUSES = Object.freeze({
    PENDING: "pending",
    MINING: "mining",
    CONFIRMED: "confirmed",
    REJECTED: "rejected"
});

/**
 * In-memory transaction pool used by the API and the future mining module.
 *
 * A balance provider is injected instead of importing a particular chain client,
 * so the pool remains usable with the project's wallet/blockchain implementation.
 */
class TransactionPool {
    /**
     * @param {{ maxPoolSize?: number, getBalance?: (address: string) => number }} [options]
     */
    constructor(options = {}) {
        this.pendingTransactions = new Map();
        this.maxPoolSize = this.#normalisePoolSize(options.maxPoolSize);
        this.balanceProvider = typeof options.getBalance === "function" ? options.getBalance : null;
    }

    /**
     * Adds a validated transaction to the pool.
     * @param {{ sender: string, receiver: string, amount: number }} transaction
     * @returns {object} The created transaction, or a structured error.
     */
    add(transaction) {
        try {
            const validationError = this.#validateTransaction(transaction);
            if (validationError) {
                return this.#fail(validationError, "validation failed");
            }

            const normalised = {
                sender: transaction.sender.trim(),
                receiver: transaction.receiver.trim(),
                amount: transaction.amount
            };

            if (this.pendingTransactions.size >= this.maxPoolSize) {
                return this.#fail(`Transaction pool is full (maximum ${this.maxPoolSize})`, "pool limit reached");
            }

            if (this.#isDuplicate(normalised)) {
                return this.#fail("Duplicate pending transaction", "duplicate rejected");
            }

            const pendingTransaction = {
                id: crypto.randomUUID(),
                ...normalised,
                createdAt: new Date().toISOString(),
                status: TRANSACTION_STATUSES.PENDING
            };

            this.pendingTransactions.set(pendingTransaction.id, pendingTransaction);
            this.#log("transaction added", pendingTransaction.id);
            return pendingTransaction;
        } catch (error) {
            return this.#fail("Unable to add transaction", error.message);
        }
    }

    /**
     * Returns transactions ordered oldest first. By default, only pending items
     * are returned so miners cannot pick already assigned transactions.
     * @param {{ includeNonPending?: boolean }} [options]
     * @returns {object[]}
     */
    getAll(options = {}) {
        const transactions = Array.from(this.pendingTransactions.values());
        return transactions
            .filter((transaction) => options.includeNonPending || transaction.status === TRANSACTION_STATUSES.PENDING)
            .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    }

    /**
     * Removes one transaction by ID.
     * @param {string} id
     * @returns {object|null}
     */
    remove(id) {
        try {
            const transaction = this.pendingTransactions.get(id);
            if (!transaction) return null;

            this.pendingTransactions.delete(id);
            return transaction;
        } catch (error) {
            this.#log("remove failed", error.message);
            return null;
        }
    }

    /**
     * Removes mined transactions; unknown IDs are ignored.
     * @param {string[]} transactionIds
     * @returns {number} Number of transactions removed.
     */
    removeMinedTransactions(transactionIds) {
        if (!Array.isArray(transactionIds)) {
            this.#log("remove mined failed", "transaction IDs must be an array");
            return 0;
        }

        let removedCount = 0;
        for (const id of new Set(transactionIds)) {
            if (this.pendingTransactions.delete(id)) removedCount += 1;
        }
        this.#log("removed after mining", `${removedCount} transaction(s)`);
        return removedCount;
    }

    /** @returns {number} Number of transactions ready to be mined. */
    getPendingCount() {
        return Array.from(this.pendingTransactions.values())
            .filter((transaction) => transaction.status === TRANSACTION_STATUSES.PENDING).length;
    }

    /** @param {string} id @returns {boolean} */
    hasTransaction(id) {
        return this.pendingTransactions.has(id);
    }

    /** @param {string} id @returns {object|null} */
    getTransaction(id) {
        return this.pendingTransactions.get(id) || null;
    }

    /** @returns {number} Number of transactions removed. */
    clear() {
        const removedCount = this.pendingTransactions.size;
        this.pendingTransactions.clear();
        this.#log("pool cleared", `${removedCount} transaction(s)`);
        return removedCount;
    }

    /**
     * Updates a transaction status.
     * @param {string} id
     * @param {"pending"|"mining"|"confirmed"|"rejected"} status
     * @returns {object} The updated transaction, or a structured error.
     */
    updateStatus(id, status) {
        const transaction = this.getTransaction(id);
        if (!transaction) return this.#error("Transaction not found");
        if (!Object.values(TRANSACTION_STATUSES).includes(status)) {
            return this.#error("Invalid transaction status");
        }
        transaction.status = status;
        return transaction;
    }

    /** @param {string} id @returns {object} */
    markMining(id) { return this.updateStatus(id, TRANSACTION_STATUSES.MINING); }

    /** @param {string} id @returns {object} */
    markConfirmed(id) { return this.updateStatus(id, TRANSACTION_STATUSES.CONFIRMED); }

    /** @param {string} id @returns {object} */
    markRejected(id) { return this.updateStatus(id, TRANSACTION_STATUSES.REJECTED); }

    /**
     * Registers the synchronous balance lookup supplied by wallet/blockchain code.
     * @param {(address: string) => number} getBalance
     * @returns {{ success: boolean, message?: string }}
     */
    setBalanceProvider(getBalance) {
        if (typeof getBalance !== "function") return this.#error("Balance provider must be a function");
        this.balanceProvider = getBalance;
        return { success: true };
    }

    #validateTransaction(transaction) {
        if (!transaction || typeof transaction !== "object") return "Transaction is required";
        if (typeof transaction.sender !== "string" || !transaction.sender.trim()) return "Sender is required";
        if (typeof transaction.receiver !== "string" || !transaction.receiver.trim()) return "Receiver is required";
        if (transaction.sender.trim() === transaction.receiver.trim()) return "Sender and receiver must be different";
        if (typeof transaction.amount !== "number") return "Amount must be a number";
        if (!Number.isFinite(transaction.amount)) return "Amount must be finite";
        if (transaction.amount <= 0) return "Amount must be greater than zero";
        return null;
    }

    #verifyBalance(transaction) {
        if (!this.balanceProvider) return "Balance verification is not configured";

        const balance = this.balanceProvider(transaction.sender);
        if (typeof balance !== "number" || !Number.isFinite(balance) || balance < 0) {
            return "Unable to verify sender balance";
        }

        const reservedAmount = Array.from(this.pendingTransactions.values())
            .filter((item) => item.sender === transaction.sender && [TRANSACTION_STATUSES.PENDING, TRANSACTION_STATUSES.MINING].includes(item.status))
            .reduce((total, item) => total + item.amount, 0);
        return balance - reservedAmount < transaction.amount ? "Insufficient balance" : null;
    }

    #isDuplicate(transaction) {
        return Array.from(this.pendingTransactions.values()).some((item) =>
            item.status === TRANSACTION_STATUSES.PENDING &&
            item.sender === transaction.sender &&
            item.receiver === transaction.receiver &&
            item.amount === transaction.amount
        );
    }

    #normalisePoolSize(maxPoolSize) {
        const value = maxPoolSize === undefined ? DEFAULT_MAX_POOL_SIZE : maxPoolSize;
        return Number.isSafeInteger(value) && value > 0 ? value : DEFAULT_MAX_POOL_SIZE;
    }

    #error(message) { return { success: false, message }; }

    #fail(message, detail) {
        this.#log(detail, message);
        return this.#error(message);
    }

    #log(event, detail) {
        console.log(`[TransactionPool] ${event}: ${detail}`);
    }
}

const transactionPool = new TransactionPool({
    maxPoolSize: Number(process.env.MAX_POOL_SIZE) || DEFAULT_MAX_POOL_SIZE
});

// Retain the default singleton export used by routes.js while making the class
// and constants available to the mining module and focused unit tests.
module.exports = transactionPool;
module.exports.TransactionPool = TransactionPool;
module.exports.TRANSACTION_STATUSES = TRANSACTION_STATUSES;
module.exports.DEFAULT_MAX_POOL_SIZE = DEFAULT_MAX_POOL_SIZE;
