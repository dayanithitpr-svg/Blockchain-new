const { ethers } = require("hardhat");

async function main() {

    const [sender, receiver] = await ethers.getSigners();

    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const MemeCoin = await ethers.getContractFactory("MemeCoin");

    const memeCoin = MemeCoin.attach(contractAddress);

    console.log("Sender:", sender.address);
    console.log("Receiver:", receiver.address);

    const amount = ethers.parseUnits("100", 18);

    const transaction = await memeCoin
        .connect(sender)
        .transfer(receiver.address, amount);

    await transaction.wait();

    console.log("100 WMS transferred successfully!");
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});