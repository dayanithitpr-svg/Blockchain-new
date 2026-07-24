/** Browser proof-of-work implementation using crypto-js SHA-256. */
class ProofOfWork {
    static difficulty = 4;

    /** Returns true only when a hash has the required leading zeroes. */
    static isValid(hash) {
        return hash.startsWith("0".repeat(ProofOfWork.difficulty));
    }

    /** Calculates the canonical SHA-256 block hash. */
    static calculateHash(block) {
        const transactions = block.transactions.map(({ id, sender, receiver, amount, createdAt }) => ({
            id, sender, receiver, amount, createdAt
        }));
        const input = `${block.blockNumber}${block.timestamp}${JSON.stringify(transactions)}${block.previousHash}${block.nonce}`;
        return CryptoJS.SHA256(input).toString();
    }
}
