// controllers/Admin/dashboardController.js
const User = require("../../models/User/userModel");

const userCount = async (req, res) => {
  try {
    // Query to find all users where isAdmin is false (i.e., exclude admins)
    const users = await User.find({ isAdmin: false });
    // Return the number of users
    res.json({ count: users.length });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ error: "Failed to fetch user count" });
  }
};

module.exports = { userCount };
