const { ethers } = require("hardhat");

async function main() {

    const [owner] = await ethers.getSigners();

    console.log("Deploying contract...");
    console.log("Owner Address:", owner.address);

    const MemeCoin = await ethers.getContractFactory("MemeCoin");

    const memeCoin = await MemeCoin.deploy(owner.address);

    await memeCoin.waitForDeployment();

    const address = await memeCoin.getAddress();

    console.log("TechTamizha deployed to:", address);
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});