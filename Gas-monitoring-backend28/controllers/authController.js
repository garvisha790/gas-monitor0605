const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
 
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      name: user.name
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '30d' }
  );
};
 
// Register Controller
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;
 
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }
 
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
 
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
 
    const token = generateToken(user);
 
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Register Error:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
};
 
// Login Controller
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill in both email and password' });
  }
 
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });
 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });
 
    const token = generateToken(user);
 
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};