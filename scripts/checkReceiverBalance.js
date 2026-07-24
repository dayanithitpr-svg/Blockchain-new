const { ethers } = require("hardhat");

async function main() {

    const [, receiver] = await ethers.getSigners();

    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const MemeCoin = await ethers.getContractFactory("MemeCoin");

    const memeCoin = MemeCoin.attach(contractAddress);

    const balance = await memeCoin.balanceOf(receiver.address);

    console.log("Receiver Address:", receiver.address);

    console.log(
        "Receiver Balance:",
        ethers.formatUnits(balance, 18),
        "TTZ"
    );
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});