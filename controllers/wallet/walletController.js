const Wallet = require('../../models/wallet/walletModel');
const Order = require('../../models/Order/orderModel');
const mongoose = require('mongoose');

const getWalletDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId format:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    console.log('Fetching wallet for userId:', userId);

    let wallet = await Wallet.findOne({ userId })
      .populate({
        path: 'transactions.orderId',
        model: 'Order',
        select: 'orderNumber totalAmount'
      });
    
    console.log('Found wallet:', wallet ? 'Yes' : 'No');

    if (!wallet) {
      console.log('Creating new wallet for user:', userId);
      wallet = new Wallet({ 
        userId, 
        balance: 0,
        transactions: []
      });
      await wallet.save();
      console.log('New wallet created');
    }

    // Calculate monthly spending
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    console.log('Calculating monthly spending from:', startOfMonth);
    
    const monthlyTransactions = wallet.transactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= startOfMonth && t.type === 'debit';
    });

    const monthlySpending = monthlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    console.log('Monthly spending calculated:', monthlySpending);

    const response = {
      success: true,
      data: {
        balance: wallet.balance || 0,
        monthlySpending,
        transactions: wallet.transactions || []
      }
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));

    res.json(response);
  } catch (error) {
    console.error('Wallet fetch error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet details',
      error: error.message
    });
  }
};

const addRefundToWallet = async (req, res) => {
  try {
    const { userId, orderId, amount } = req.body;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    console.log('Processing refund:', { userId, orderId, amount });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let wallet = await Wallet.findOne({ userId }).session(session);
      
      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: 0,
          transactions: []
        });
      }

      wallet.balance += amount;
      wallet.transactions.push({
        type: 'credit',
        amount,
        description: 'Refund from cancelled order',
        orderId,
        status: 'completed',
        createdAt: new Date()
      });

      await wallet.save({ session });
      await session.commitTransaction();

      console.log('Refund processed successfully');

      res.json({
        success: true,
        message: 'Refund added to wallet successfully',
        data: {
          balance: wallet.balance,
          transaction: wallet.transactions[wallet.transactions.length - 1]
        }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Refund error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({
      success: false,
      message: 'Failed to add refund to wallet',
      error: error.message
    });
  }
};

module.exports = {
  getWalletDetails,
  addRefundToWallet
};