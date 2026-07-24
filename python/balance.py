import json
from web3 import Web3

# Connect to Hardhat
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

if not w3.is_connected():
    print("Connection Failed!")
    exit()

print("Connected to Hardhat!")

# Contract Address
contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Read ABI
with open("../artifacts/contracts/MemeCoin.sol/MemeCoin.json", "r") as file:
    contract_json = json.load(file)
    abi = contract_json["abi"]

# Connect Contract
contract = w3.eth.contract(address=contract_address, abi=abi)

# Owner Wallet
owner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Read Balance
balance = contract.functions.balanceOf(owner).call()

print("Owner Address :", owner)
print("Balance :", balance / (10 ** 18), "WMS")