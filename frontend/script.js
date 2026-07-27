const connectBtn = document.getElementById("connectBtn");
const walletAddress = document.getElementById("walletAddress");
const balance = document.getElementById("balance");
const sendBtn = document.getElementById("sendBtn");
const transactionList = document.getElementById("transactionList");
const copyBtn = document.getElementById("copyBtn");
const totalSupplyEl = document.getElementById("totalSupply");
const tokenNameEl = document.getElementById("tokenName");
const tokenSymbolEl = document.getElementById("tokenSymbol");

let provider;
let signer;
let contract;

const transactionPoolApi = "http://localhost:3000";
const hardhatChainId = "0x7a69"; // 31337 in hexadecimal
const hardhatRpcUrl = "http://127.0.0.1:8545";

// Event Listeners
connectBtn.addEventListener("click", connectWallet);
sendBtn.addEventListener("click", sendToken);

if (copyBtn) {
    copyBtn.addEventListener("click", () => {
        const addr = walletAddress.innerText.trim();
        if (addr && addr !== "Not Connected") {
            navigator.clipboard.writeText(addr);
            alert("Wallet address copied to clipboard!");
        } else {
            alert("No wallet connected to copy.");
        }
    });
}

if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
            connectWallet();
        } else {
            walletAddress.innerText = "Not Connected";
            connectBtn.innerText = "Connect Wallet";
            balance.innerText = "0 TTZ";
        }
    });
}

function getMetaMaskProvider() {
    const providers = window.ethereum && window.ethereum.providers;
    if (Array.isArray(providers)) {
        return providers.find((walletProvider) => walletProvider.isMetaMask) || null;
    }

    return window.ethereum && window.ethereum.isMetaMask ? window.ethereum : null;
}

async function switchToHardhat(metaMaskProvider) {
    try {
        await metaMaskProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: hardhatChainId }]
        });
    } catch (error) {
        if (error.code !== 4902) throw error;

        await metaMaskProvider.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: hardhatChainId,
                chainName: "Hardhat Local",
                rpcUrls: [hardhatRpcUrl],
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
            }]
        });
    }
}

async function loadTokenDetails() {
    try {
        const readProvider = new ethers.providers.JsonRpcProvider(hardhatRpcUrl);
        const readContract = new ethers.Contract(
    contractAddress,
    tokenABI,
    readProvider
);
      

        const [name, symbol, decimals, supply] = await Promise.all([
            readContract.name().catch(() => "TechTamizha"),
            readContract.symbol().catch(() => "TTZ"),
            readContract.decimals().catch(() => 18),
            readContract.totalSupply().catch(() => null)
        ]);

        if (tokenNameEl) tokenNameEl.innerText = name;
        if (tokenSymbolEl) tokenSymbolEl.innerText = symbol;

        if (totalSupplyEl) {
            if (supply !== null) {
                const formattedSupply = ethers.utils.formatUnits(supply, decimals);
                totalSupplyEl.innerText = `${Number(formattedSupply).toLocaleString()} ${symbol}`;
            } else {
                totalSupplyEl.innerText = "Unavailable";
            }
        }
    } catch (err) {
        console.error("Error loading token details:", err);
        if (totalSupplyEl) totalSupplyEl.innerText = "Unavailable";
    }
}

async function updateBalance(address) {
    try {
        if (!contract) return;
        const decimals = await contract.decimals().catch(() => 18);
        const ttzBalance = await contract.balanceOf(address);
        const formatted = ethers.utils.formatUnits(ttzBalance, decimals);
        balance.innerText = `${formatted} TTZ`;
    } catch (error) {
        console.error("Error fetching TTZ balance:", error);
        balance.innerText = "Error loading TTZ balance";
    }
}

async function connectWallet() {
    console.log("Connect button clicked");

    const metaMaskProvider = getMetaMaskProvider();
    if (!metaMaskProvider) {
        alert("Please install MetaMask");
        return;
    }

    try {
        await switchToHardhat(metaMaskProvider);

        // MetaMask popup
        const accounts = await metaMaskProvider.request({
            method: "eth_requestAccounts"
        });

        const address = accounts[0];
        console.log("Connected:", address);

        // Ethers provider & signer
        provider = new ethers.providers.Web3Provider(metaMaskProvider);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        if (network.chainId !== 31337) {
            throw new Error(`Expected Hardhat chain 31337, received ${network.chainId}`);
        }
        console.log("Chain ID:", network.chainId);

        const code = await provider.getCode(contractAddress);
        console.log("Contract Code:", code);
        if (code === "0x") {
            throw new Error("TTZ contract is not deployed on Hardhat Local at the configured address");
        }

        contract = new ethers.Contract(
            contractAddress,
            tokenABI,
            signer
        );

        console.log("Contract connected:", contract);

        // Show wallet address
        walletAddress.innerText = address;

        // Change button text
        connectBtn.innerText = "Wallet Connected ✅";

        // Fetch actual TTZ Token balance and Token Details
        await updateBalance(address);
        await loadTokenDetails();

        alert("Wallet Connected Successfully");

        await loadPendingTransactions();
    } catch (error) {
        console.error("Connection error:", error);
        alert("Connection Failed: " + (error.message || error));
    }
}

async function sendToken() {
    const receiver = document.getElementById("receiver").value;
    const amount = document.getElementById("amount").value;

    if (!receiver || !amount) {
        alert("Enter receiver and amount");
        return;
    }

    if (!contract) {
        alert("Connect wallet first");
        return;
    }

    if (!ethers.utils.isAddress(receiver) || Number(amount) <= 0) {
        alert("Enter a valid receiver address and positive amount");
        return;
    }

    try {
        console.log("Sending transaction...");
        const sender = await signer.getAddress();
        const response = await fetch(`${transactionPoolApi}/transaction`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ sender, receiver, amount })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to add transaction");
        }

        alert("Transaction added to Transaction Pool");
        document.getElementById("receiver").value = "";
        document.getElementById("amount").value = "";
        await loadPendingTransactions();
    } catch (error) {
        console.error(error);
        alert(`Transaction Pool Error: ${error.message}`);
    }
}

async function loadPendingTransactions() {
    try {
        const response = await fetch(`${transactionPoolApi}/transactions`);
        const transactions = await response.json();

        if (!response.ok) {
            throw new Error("Unable to load pending transactions");
        }

        renderPendingTransactions(transactions);
    } catch (error) {
        console.log(error);
        transactionList.innerHTML = '<p class="empty-state">Transaction Pool API unavailable</p>';
    }
}

// Exposed only for the mining module to refresh the unchanged pool UI after a block commits.
window.loadPendingTransactions = loadPendingTransactions;

function renderPendingTransactions(transactions) {
    if (!transactions.length) {
        transactionList.innerHTML = '<p class="empty-state">No Pending Transactions</p>';
        return;
    }

    transactionList.innerHTML = transactions.map((transaction) => `
        <div class="transaction-item">
            <div class="transaction-details">
                <strong>${escapeHtml(transaction.amount)} TTZ</strong>
                <small><span>Sender:</span> ${escapeHtml(transaction.sender)}</small>
                <small><span>Receiver:</span> ${escapeHtml(transaction.receiver)}</small>
                <small><span>Status:</span> ${escapeHtml(transaction.status)}</small>
                <small><span>Created Time:</span> ${escapeHtml(formatCreatedTime(transaction.createdAt))}</small>
            </div>
            <button class="remove-transaction" data-id="${escapeHtml(transaction.id)}" title="Remove transaction">Remove</button>
        </div>
    `).join("");

    document.querySelectorAll(".remove-transaction").forEach((button) => {
        button.addEventListener("click", () => removeTransaction(button.dataset.id));
    });
}

async function removeTransaction(id) {
    try {
        const response = await fetch(`${transactionPoolApi}/transaction/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Unable to remove transaction");
        }

        await loadPendingTransactions();
    } catch (error) {
        console.log(error);
        alert(`Transaction Pool Error: ${error.message}`);
    }
}

function formatCreatedTime(createdAt) {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString();
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        "\"": "&quot;"
    }[character]));
}

// Initial loads
loadTokenDetails();
loadPendingTransactions();
setInterval(loadPendingTransactions, 5000);
