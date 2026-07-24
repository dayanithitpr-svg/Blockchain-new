const { ethers } = require("hardhat");

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    try {
        const block = await provider.getBlockNumber();
        console.log("Current Block Number:", block);
        
        const signers = await ethers.getSigners();
        console.log("Signer 0 address:", signers[0].address);
        const ethBalance = await provider.getBalance(signers[0].address);
        console.log("Signer 0 ETH Balance:", ethers.formatEther(ethBalance));
        
        const addressesToCheck = [
            "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
        ];
        
        for (const addr of addressesToCheck) {
            const code = await provider.getCode(addr);
            console.log(`Code at ${addr}:`, code === "0x" ? "Empty (No Contract)" : `Found (${code.length} bytes)`);
        }
    } catch (e) {
        console.error("Diagnosis failed:", e);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
