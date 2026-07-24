(() => {
    const apiUrl = "http://localhost:3000";
    const mineButton = document.getElementById("mineBtn");
    const nonceEl = document.getElementById("miningNonce");
    const hashEl = document.getElementById("miningHash");
    const timeEl = document.getElementById("miningTime");
    const checkedEl = document.getElementById("hashesChecked");
    const statusEl = document.getElementById("miningStatus");
    const successEl = document.getElementById("miningSuccess");
    const difficultyEl = document.getElementById("miningDifficulty");
    const attemptsPerFrame = 500;

    difficultyEl.textContent = ProofOfWork.difficulty;
    mineButton.addEventListener("click", mineBlock);

    /** Reads the pool, mines in animation frames, then submits the valid block. */
    async function mineBlock() {
        const minerAddress = document.getElementById("walletAddress").innerText.trim();
        if (!minerAddress || minerAddress === "Not Connected") return showError("Connect a wallet before mining.");

        try {
            mineButton.disabled = true;
            successEl.hidden = true;
            statusEl.textContent = "Reading pending transactions…";
            const [transactions, blocks] = await Promise.all([getJson("/transactions"), getJson("/blocks")]);
            if (!transactions.length) throw new Error("There are no pending transactions to mine.");

            const block = new Block({
                blockNumber: blocks.length + 1,
                timestamp: new Date().toISOString(),
                transactions,
                previousHash: blocks.length ? blocks[blocks.length - 1].hash : "0",
                minerAddress
            });
            const result = await mineInFrames(block);
            statusEl.textContent = "Submitting verified block…";
            const response = await fetch(`${apiUrl}/mine`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(block)
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Unable to submit mined block");
            showSuccess(payload.block, result.elapsed);
            if (typeof window.loadPendingTransactions === "function") await window.loadPendingTransactions();
        } catch (error) {
            showError(error.message || "Mining failed.");
        } finally {
            mineButton.disabled = false;
        }
    }

    /** Mines in small batches so the browser can repaint progress continuously. */
    function mineInFrames(block) {
        const startedAt = performance.now();
        let checks = 0;
        return new Promise((resolve) => {
            const work = () => {
                for (let count = 0; count < attemptsPerFrame; count += 1) {
                    block.nonce += 1;
                    block.hash = ProofOfWork.calculateHash(block);
                    checks += 1;
                    if (ProofOfWork.isValid(block.hash)) {
                        renderProgress(block, checks, startedAt);
                        return resolve({ elapsed: performance.now() - startedAt, checks });
                    }
                }
                renderProgress(block, checks, startedAt);
                requestAnimationFrame(work);
            };
            requestAnimationFrame(work);
        });
    }

    function renderProgress(block, checks, startedAt) {
        nonceEl.textContent = block.nonce.toLocaleString();
        hashEl.textContent = block.hash || "Calculating…";
        checkedEl.textContent = checks.toLocaleString();
        timeEl.textContent = formatDuration(performance.now() - startedAt);
        statusEl.textContent = "Mining in progress…";
    }

    function showSuccess(block, elapsed) {
        statusEl.textContent = "Mining Successful";
        successEl.hidden = false;
        successEl.innerHTML = `<strong>Mining Successful</strong><span>Block Number: ${block.blockNumber}</span><span>Hash: ${escapeHtml(block.hash)}</span><span>Nonce: ${block.nonce.toLocaleString()}</span><span>Mining Time: ${formatDuration(elapsed)}</span><span>Reward: ${block.reward} TTZ (not issued)</span>`;
    }

    function showError(message) { statusEl.textContent = message; }
    async function getJson(path) {
        const response = await fetch(`${apiUrl}${path}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Request failed");
        return payload;
    }
    function formatDuration(milliseconds) { return `${(milliseconds / 1000).toFixed(2)} seconds`; }
    function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
})();
