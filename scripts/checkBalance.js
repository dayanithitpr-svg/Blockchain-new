const { ethers } = require("hardhat");

async function main() {

    const [owner] = await ethers.getSigners();

    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const MemeCoin = await ethers.getContractFactory("MemeCoin");

    const memeCoin = MemeCoin.attach(contractAddress);

    const balance = await memeCoin.balanceOf(owner.address);

    console.log("Wallet Address:", owner.address);

    console.log(
        "WatermelonStar Balance:",
        ethers.formatUnits(balance, 18),
        "WMS"
    );
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});