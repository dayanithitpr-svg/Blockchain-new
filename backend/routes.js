const express = require("express");
const { ethers } = require("ethers");
const transactionPool = require("./transactionPool");
const { Miner } = require("./miner");
const { abi: tokenABI } = require("../artifacts/contracts/MemeCoin.sol/MemeCoin.json");

const router = express.Router();
const miner = new Miner(transactionPool);
const rewardProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

router.post("/transaction", (req, res) => {
    const { sender, receiver, amount } = req.body || {};

    if (!sender || !receiver || amount === undefined || amount === null) {
        return res.status(400).json({
            error: "sender, receiver, and amount are required"
        });
    }

    if (typeof sender !== "string" || typeof receiver !== "string") {
        return res.status(400).json({
            error: "sender and receiver must be strings"
        });
    }

    if (typeof amount !== "number" && typeof amount !== "string") {
        return res.status(400).json({ error: "amount must be a number" });
    }

    const numericAmount = typeof amount === "number" ? amount : Number(amount.trim());
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            error: "amount must be a positive number"
        });
    }

    const transaction = transactionPool.add({
        sender: sender.trim(),
        receiver: receiver.trim(),
        amount: numericAmount
    });

    if (transaction.success === false) {
        return res.status(400).json({ error: transaction.message });
    }

    return res.status(201).json(transaction);
});

router.get("/transactions", (req, res) => {
    return res.json(transactionPool.getAll());
});

router.delete("/transaction/:id", (req, res) => {
    const transaction = transactionPool.remove(req.params.id);

    if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
    }

    return res.json({
        message: "Transaction removed from the pool",
        transaction
    });
});

/** Accepts a client-mined proof-of-work block after independently validating it. */
router.post("/mine", async (req, res) => {
    const result = miner.submitMinedBlock(req.body);
    if (!result.success) return res.status(400).json({ error: result.message });

    try {
        const ownerSigner = await rewardProvider.getSigner(0);
        const tokenContract = new ethers.Contract(contractAddress, tokenABI, ownerSigner);
        const rewardTransaction = await tokenContract.mintReward(result.block.minerAddress);
        await rewardTransaction.wait();
        const rewardedBlock = miner.blockchain.updateBlockReward(result.block.blockNumber, 10);

        return res.status(201).json({
            ...result,
            block: rewardedBlock,
            rewardTransactionHash: rewardTransaction.hash
        });
    } catch (error) {
        console.error("Mining reward error:", error);
        return res.status(500).json({ error: "Block was accepted but the mining reward could not be issued" });
    }
});

/** Exposes the in-memory chain for block inspection. */
router.get("/blocks", (req, res) => res.json(miner.blockchain.getAll()));

module.exports = router;
