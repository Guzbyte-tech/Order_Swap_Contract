// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Interfaces/IERC20.sol";

contract OrderSwap {
    enum OrderType {
        OrderCreated,
        OrderFulfiled
    }

    enum OrderStatus {
        Open,
        Closed,
        Cancelled
    }

    uint public totalOrders;

    struct Order {
        uint orderId;
        address depositor;
        address depositorToken;
        uint depositedAmount;
        address requestedToken;
        uint requestAmount;
        address fulfilledBy;
        OrderType _orderType;
        OrderStatus status;
    }

    struct TransactionHistory {
        uint orderId;
        address token;
        uint amount;
        OrderType orderType;
        OrderStatus status;
    }

    mapping(uint => Order) OrderIdToOrders; //Order => Order
    mapping(address => TransactionHistory[]) public depositorHistory; // Depositor's order history
    mapping(address => TransactionHistory[]) public fulfillerHistory; // Fulfiller's fulfilled order history
    

    event OrderCreated(
        uint orderId,
        address depositor,
        address requestedToken,
        uint requestedAmount
    );
    event OrderFulfilled(uint orderId, address fulfiller);
    event OrderCancelled(uint orderId);

    constructor() {}

    function createOrder(
        uint _depositedAmount,
        address _depositorToken,
        uint _requestedAmount,
        address _requestedToken
    ) external {
        require(msg.sender != address(0), "Address zero detected.");
        require(_depositorToken != address(0), "Address zero detected.");
        require(_requestedToken != address(0), "Address zero detected.");
        require(_depositedAmount > 0, "Invalid Deposit Amount");
        require(_requestedAmount > 0, "Invalid Requested Amount");

        require(
            IERC20(_depositorToken).transferFrom(
                msg.sender,
                address(this),
                _depositedAmount
            ),
            "Transfer Failed"
        );

        uint orderId = totalOrders + 1;
        Order storage ord = OrderIdToOrders[orderId];
        ord.orderId = orderId;
        ord.depositor = msg.sender;
        ord.depositorToken = _depositorToken;
        ord.depositedAmount = _depositedAmount;
        ord.requestedToken = _requestedToken;
        ord.requestAmount = _requestedAmount;
        ord._orderType = OrderType.OrderCreated;
        ord.status = OrderStatus.Open;

        // Log the transaction for the depositor
        depositorHistory[msg.sender].push(
            TransactionHistory({
                orderId: orderId,
                token: _depositorToken,
                amount: _depositedAmount,
                orderType: OrderType.OrderCreated,
                status: OrderStatus.Open
            })
        );

        totalOrders = orderId;

        emit OrderCreated(
            orderId,
            msg.sender,
            _requestedToken,
            _requestedAmount
        );
    }

    function fulfilOrder(uint _orderId) external {
        require(OrderIdToOrders[_orderId].orderId > 0, "Invalid Order Id");
        require(
            OrderIdToOrders[_orderId].depositor != msg.sender,
            "Depositor cannot fulfill their own order."
        );

        require(
            OrderIdToOrders[_orderId].status == OrderStatus.Open,
            "Order Already Fulfiled"
        );
        require(
            OrderIdToOrders[_orderId].status != OrderStatus.Cancelled,
            "Order is Cancelled"
        );
        OrderIdToOrders[_orderId].status = OrderStatus.Closed;
        OrderIdToOrders[_orderId].fulfilledBy = msg.sender;

        require(
            IERC20(OrderIdToOrders[_orderId].requestedToken).transferFrom(
                msg.sender,
                OrderIdToOrders[_orderId].depositor,
                OrderIdToOrders[_orderId].requestAmount
            ),
            "Transfer requested token failed."
        );
        require(
            IERC20(OrderIdToOrders[_orderId].depositorToken).transfer(
                msg.sender,
                OrderIdToOrders[_orderId].depositedAmount
            ),
            "Transfer to fulfiller failed"
        );

        fulfillerHistory[msg.sender].push(
            TransactionHistory({
                orderId: _orderId,
                token: OrderIdToOrders[_orderId].depositorToken,
                amount: OrderIdToOrders[_orderId].depositedAmount,
                orderType: OrderType.OrderFulfiled,
                status: OrderStatus.Closed
            })
        );
        emit OrderFulfilled(_orderId, msg.sender);
    }

    function cancelOrder(uint _orderId) external {
        require(OrderIdToOrders[_orderId].orderId > 0, "Invalid Order Id");
        require(
            OrderIdToOrders[_orderId].status == OrderStatus.Open,
            "Order Already Fulfiled"
        );
        require(
            OrderIdToOrders[_orderId].status != OrderStatus.Cancelled,
            "Order is Cancelled"
        );

        require(
            OrderIdToOrders[_orderId].depositor == msg.sender,
            "Not Order Owner."
        );

        OrderIdToOrders[_orderId].status = OrderStatus.Cancelled;

        // Refund the depositor their tokens
        require(
            IERC20(OrderIdToOrders[_orderId].depositorToken).transfer(
                OrderIdToOrders[_orderId].depositor,
                OrderIdToOrders[_orderId].depositedAmount
            ),
            "Refund failed"
        );

        // Update depositor's transaction history directly
        depositorHistory[msg.sender].push(
            TransactionHistory({
                orderId: _orderId,
                token: OrderIdToOrders[_orderId].depositorToken,
                amount: OrderIdToOrders[_orderId].depositedAmount,
                orderType: OrderType.OrderCreated,
                status: OrderStatus.Cancelled
            })
        );

        emit OrderCancelled(_orderId);
    }
}
