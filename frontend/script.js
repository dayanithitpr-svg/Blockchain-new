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

// Contract address
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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

async function loadTokenDetails() {
    try {
        let readProvider;
        if (window.ethereum) {
            readProvider = new ethers.providers.Web3Provider(window.ethereum);
        } else {
            readProvider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
        }
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

    if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
    }

    try {
        // MetaMask popup
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        const address = accounts[0];
        console.log("Connected:", address);

        // Ethers provider & signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
console.log("Chain ID:", network.chainId);

const code = await provider.getCode(contractAddress);
console.log("Contract Code:", code);

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
