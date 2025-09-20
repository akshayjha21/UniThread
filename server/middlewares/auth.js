import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config({
    path:'./.env'
})
export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers["x-access-token"];
    if (!token) {
      throw new Error("No token provided");
    }
    const { userId, isAdmin } = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.body = {
      ...req.body,
      userId,
      isAdmin,
    };
    return next();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const optionallyVerifyToken = (req, res, next) => {
  try {
    const token = req.headers["x-access-token"];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.body.userId = decoded.userId;
    next();
  } catch (err) {
    return next();
  }
};
