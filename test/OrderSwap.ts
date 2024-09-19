import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import hre, { ethers } from "hardhat";
  const helpers = require("@nomicfoundation/hardhat-network-helpers");


async function deployGUZToken() {
    const [tokenOwner, addr1] = await ethers.getSigners();

    const guzToken = await ethers.getContractFactory("GUZ");
    const guzTokenDeployed = await guzToken.deploy();
    const guzContractAddr = await guzTokenDeployed.getAddress();
    return { guzContractAddr, guzTokenDeployed, tokenOwner };

}

async function deployW3CToken() {
    const [web3owner] = await ethers.getSigners();

    const web3Token = await ethers.getContractFactory("W3C");
    const w3cDeployed = await web3Token.deploy();
    const web3TokenAddr = await w3cDeployed.getAddress();
    return { web3TokenAddr, w3cDeployed, web3owner };

}

async function deploySwap() {
    // Get the ContractFactory and Signers here.
    const [owner, depositor, fufiller] = await ethers.getSigners();
    const swapContract = await ethers.getContractFactory("OrderSwap");
    const swap = await swapContract.deploy();
    const { guzContractAddr, guzTokenDeployed, tokenOwner } = await loadFixture(deployGUZToken);
    const { web3TokenAddr, w3cDeployed, web3owner } = await loadFixture(deployW3CToken);

    // Transfer some tokens to depositor and fulfiller
    await guzTokenDeployed.connect(tokenOwner).transfer(depositor, ethers.parseUnits("100", 18));
    await w3cDeployed.connect(web3owner).transfer(fufiller, ethers.parseUnits("100", 18));

    return {swap, guzContractAddr, guzTokenDeployed, tokenOwner, web3TokenAddr, w3cDeployed, web3owner, owner, depositor, fufiller }
}

describe("Create Order", function () {
    it("Should check if order was created successfully.", async function () {
        const { swap, guzTokenDeployed, w3cDeployed, depositor, fufiller } = await loadFixture(deploySwap);
        
        // Verify contract addresses
        // console.log("Swap address:", swap.target);
        // console.log("GUZ Token address:", guzTokenDeployed.target);
        // console.log("W3C Token address:", w3cDeployed.target);

        const _depositAmount = ethers.parseUnits("100", 18);
        const _depositorToken = guzTokenDeployed.target;
        const _requestedToken = w3cDeployed.target;
        const _requestedAmount = ethers.parseUnits("20", 18);

        // Approve the swap contract to spend the depositor's tokens
        await guzTokenDeployed.connect(depositor).approve(swap.target, _depositAmount);

        // Create an order using depositor
        await expect(swap.connect(depositor).createOrder(_depositAmount, _depositorToken, _requestedAmount, _requestedToken))
            .to.emit(swap, "OrderCreated")
            .withArgs(1, depositor.address, _requestedToken, _requestedAmount);

        // Check the order is stored correctly
        const order = await swap.getOrder(1);
        expect(order.depositor).to.equal(depositor.address);
        expect(order.depositedAmount).to.equal(_depositAmount);
        expect(order.requestAmount).to.equal(_requestedAmount);
        expect(order.status).to.equal(0); // 0 for Open
    });
});

describe("Fufil Order", function(){
    it("Should check if order was fufilled successfully.", async function(){
        const { swap, guzTokenDeployed, w3cDeployed, depositor, fufiller  } = await loadFixture(deploySwap);

        const _depositAmount = ethers.parseUnits("100", 18);
        const _depositorToken = guzTokenDeployed.target;
        const _requestedToken = w3cDeployed.target;
        const _requestedAmount = ethers.parseUnits("20", 18);

        // Approve the swap contract to spend the depositor's tokens
        await guzTokenDeployed.connect(depositor).approve(swap.target, _depositAmount);

        await expect(swap.connect(depositor).createOrder(_depositAmount, _depositorToken, _requestedAmount, _requestedToken))
            .to.emit(swap, "OrderCreated")
            .withArgs(1, depositor.address, _requestedToken, _requestedAmount);

        //Approve fufiller request
        await w3cDeployed.connect(fufiller).approve(swap.target, _requestedAmount);

        await expect(swap.connect(fufiller).fulfilOrder(1)).to.emit(swap, "OrderFulfilled").withArgs(1, fufiller);

         // Check the order is stored correctly
        const order = await swap.getOrder(1);
        expect(await order.status).to.equal(1); // 1 for closed
        expect(await order.fulfilledBy).to.equal(fufiller);

        expect(await w3cDeployed.balanceOf(depositor)).to.equal(ethers.parseUnits("20", 18))
        expect(await guzTokenDeployed.balanceOf(fufiller)).to.equal(ethers.parseUnits("100", 18));
    });

    it("should revert if trying to fulfill own order", async function () {
        const { swap, guzTokenDeployed, w3cDeployed, depositor, fufiller  } = await loadFixture(deploySwap);

        const _depositAmount = ethers.parseUnits("100", 18);
        const _depositorToken = guzTokenDeployed.target;
        const _requestedToken = w3cDeployed.target;
        const _requestedAmount = ethers.parseUnits("20", 18);

        // Approve the swap contract to spend the depositor's tokens
        await guzTokenDeployed.connect(depositor).approve(swap.target, _depositAmount);

        await expect(swap.connect(depositor).createOrder(_depositAmount, _depositorToken, _requestedAmount, _requestedToken))
            .to.emit(swap, "OrderCreated")
            .withArgs(1, depositor.address, _requestedToken, _requestedAmount);

        //Approve fufiller request
        await expect(swap.connect(depositor).fulfilOrder(1)).to.be.revertedWith("Depositor cannot fulfill their own order.");

    });

    it("should cancel an order", async function () {
        const { swap, guzTokenDeployed, w3cDeployed, depositor, fufiller  } = await loadFixture(deploySwap);

        const _depositAmount = ethers.parseUnits("100", 18);
        const _depositorToken = guzTokenDeployed.target;
        const _requestedToken = w3cDeployed.target;
        const _requestedAmount = ethers.parseUnits("20", 18);

        // Approve the swap contract to spend the depositor's tokens
        await guzTokenDeployed.connect(depositor).approve(swap.target, _depositAmount);

        await expect(swap.connect(depositor).createOrder(_depositAmount, _depositorToken, _requestedAmount, _requestedToken))
            .to.emit(swap, "OrderCreated")
            .withArgs(1, depositor.address, _requestedToken, _requestedAmount);

        await expect(swap.connect(depositor).cancelOrder(1))
            .to.emit(swap, "OrderCancelled")
            .withArgs(1);

        const order = await swap.getOrder(1);
        expect(order.status).to.equal(2); //Cancelled

        //chcek for refund
        expect(await guzTokenDeployed.balanceOf(depositor)).to.equal(ethers.parseEther("100"));

    });

    it("should revert if trying to cancel an order is not open.", async function () {

        const { swap, guzTokenDeployed, w3cDeployed, depositor, fufiller  } = await loadFixture(deploySwap);

        const _depositAmount = ethers.parseUnits("100", 18);
        const _depositorToken = guzTokenDeployed.target;
        const _requestedToken = w3cDeployed.target;
        const _requestedAmount = ethers.parseUnits("20", 18);

        // Approve the swap contract to spend the depositor's tokens
        await guzTokenDeployed.connect(depositor).approve(swap.target, _depositAmount);

        await expect(swap.connect(depositor).createOrder(_depositAmount, _depositorToken, _requestedAmount, _requestedToken))
            .to.emit(swap, "OrderCreated")
            .withArgs(1, depositor.address, _requestedToken, _requestedAmount);

        //Approve fufiller request
        await w3cDeployed.connect(fufiller).approve(swap.target, _requestedAmount);

        await expect(swap.connect(fufiller).fulfilOrder(1)).to.emit(swap, "OrderFulfilled").withArgs(1, fufiller);
  
        await expect(swap.connect(fufiller).cancelOrder(1))
          .to.be.revertedWith("Order Already Fulfiled");
      });
})
