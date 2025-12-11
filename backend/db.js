const mongoose = require("mongoose");

async function connectDB() {
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log("Connection string:", process.env.MONGO_URI.replace(/:.+@/, ":***@"));

    await mongoose.connect(process.env.MONGO_URI, {
      // Only these 2 are valid for Mongoose 6/7+
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✓ MongoDB connected successfully");
  } catch (err) {
    console.error("✗ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
