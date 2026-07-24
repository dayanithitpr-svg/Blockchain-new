import json
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

with open("../artifacts/contracts/MemeCoin.sol/MemeCoin.json", "r") as file:
    contract_json = json.load(file)
    abi = contract_json["abi"]

contract = w3.eth.contract(address=contract_address, abi=abi)

receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

balance = contract.functions.balanceOf(receiver).call()

print("Receiver Address :", receiver)
print("Receiver Balance :", balance / (10 ** 18), "WMS")