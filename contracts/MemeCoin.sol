// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MemeCoin is ERC20, Ownable {

    constructor(address initialOwner)
        ERC20("TechTamizha", "TTZ")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 1000000000 * 10 ** decimals());
    }
    function mintReward(address miner) external onlyOwner {
    _mint(miner, 10 * 10 ** decimals());
}
}