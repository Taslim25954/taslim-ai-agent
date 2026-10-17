import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { askGemini } from '../services/aiService.js';

const ownerFilter = (req) => (
  req.user
    ? { participants: req.user._id }
    : { guestId: req.guestId }
);

const senderIdentity = (req) => (
  req.user
    ? { sender: req.user._id }
    : { guestId: req.guestId }
);

export const createChat = async (req, res, next) => {
  try {
    const { title } = req.body;

    const conversation = await Conversation.create({
      title: title?.trim() || 'New Chat',
      ...(req.user
        ? { participants: [req.user._id], createdBy: req.user._id }
        : { guestId: req.guestId }),
      lastMessage: '',
    });

    return res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
};

export const getChats = async (req, res, next) => {
  try {
    const chats = await Conversation.find({
      ...ownerFilter(req),
      isDeleted: false,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (err) {
    next(err);
  }
};

export const getChat = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...ownerFilter(req),
      isDeleted: false,
    }).populate('participants', 'name email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const messages = await Message.find({
      conversation: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email');

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text, useAI } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required',
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...ownerFilter(req),
      isDeleted: false,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    const userMessage = await Message.create({
      conversation: conversation._id,
      ...senderIdentity(req),
      text: text.trim(),
      role: 'user',
    });

    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = new Date();
    await conversation.save();

    let aiMessage = null;
    if (useAI) {
      const aiReply = await askGemini(text.trim());
      aiMessage = await Message.create({
        conversation: conversation._id,
        ...senderIdentity(req),
        text: aiReply,
        role: 'assistant',
        meta: {
          ai: true,
        },
      });
      conversation.lastMessage = aiReply;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        conversation,
        userMessage,
        aiMessage,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const renameChat = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New title is required',
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...ownerFilter(req),
      isDeleted: false,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    conversation.title = title.trim();
    await conversation.save();

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteChat = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...ownerFilter(req),
      isDeleted: false,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    conversation.isDeleted = true;
    await conversation.save();
    await Message.deleteMany({ conversation: conversation._id });

    return res.status(200).json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
