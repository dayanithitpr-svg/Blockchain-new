import json
from web3 import Web3

# Connect to Hardhat
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

if not w3.is_connected():
    print("Connection Failed!")
    exit()

# Contract details
contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

with open("../artifacts/contracts/MemeCoin.sol/MemeCoin.json", "r") as file:
    contract_json = json.load(file)
    abi = contract_json["abi"]

contract = w3.eth.contract(address=contract_address, abi=abi)

# Hardhat Account #0
sender = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Hardhat Account #1
receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

nonce = w3.eth.get_transaction_count(sender)

tx = contract.functions.transfer(
    receiver,
    50 * (10 ** 18)
).build_transaction({
    "from": sender,
    "nonce": nonce,
    "gas": 100000,
    "gasPrice": w3.to_wei("2", "gwei")
})

signed_tx = w3.eth.account.sign_transaction(tx, private_key)

tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

print("Transfer Successful!")
print("Transaction Hash:", receipt.transactionHash.hex())