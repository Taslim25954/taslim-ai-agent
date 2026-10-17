import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  title: { type: String, trim: true, default: 'New Chat' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestId: { type: String, trim: true, index: true },
  isDeleted: { type: Boolean, default: false },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date },
}, { timestamps: true });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
export default Conversation;
