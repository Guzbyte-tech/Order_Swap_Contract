OrderSwap Smart Contract
========================

Overview
--------

This project mimics users to create and fulfill token swap orders in a secure and transparent manner. It implements functionalities for creating, fulfilling, and canceling orders, while keeping a transaction history for both depositors and fulfillers.

Features
--------

-   Create orders for token swaps.
-   Fulfill orders by exchanging tokens.
-   Cancel open orders and receive refunds.
-   Track transaction history for depositors and fulfillers.

Technologies Used
-----------------

-   **Ethereum**: The blockchain platform on which the smart contract operates.
-   **Solidity**: The programming language used to write the smart contract.
-   **Hardhat**: A development environment for compiling, deploying, testing, and debugging Ethereum software.
-   **Chai**: An assertion library for testing the smart contracts.

Installation
------------

### Prerequisites

Make sure you have the following installed:

-   Node.js (>= 12.x)
-   npm (Node package manager)

### Clone the Repository

`git clone git@github.com:Guzbyte-tech/Order_Swap_Contract.git
cd OrderSwap`

### Install Dependencies


`npm install`

Development
-----------

### Running Hardhat

You can run Hardhat commands to compile, test, and deploy your contracts:

-   **Compile the contracts**:



    `npx hardhat compile`

-   **Run Tests**:



    `npx hardhat test`


### Testing

The project includes unit tests for all functionalities of the `OrderSwap` contract. To run the tests, use:


`npx hardhat test`

Usage
-----

1.  **Create an Order**: Users can create a token swap order by specifying the deposited amount and requested token.
2.  **Fulfill an Order**: Other users can fulfill open orders by sending the requested amount of tokens to the depositor.
3.  **Cancel an Order**: Depositors can cancel their open orders and receive a refund.

Contributing
------------

Contributions are welcome! If you would like to contribute, please fork the repository and submit a pull request.

License
-------

This project is licensed under the MIT License 
-------