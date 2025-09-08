import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    recipients: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user",
      },
    ],
    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation",ConversationSchema)