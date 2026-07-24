from web3 import Web3

hardhat_url = "http://127.0.0.1:8545"

w3 = Web3(Web3.HTTPProvider(hardhat_url))

if w3.is_connected():
    print("✅ Connected to Hardhat!")
    print("Current Block:", w3.eth.block_number)
else:
    print("❌ Connection Failed!")