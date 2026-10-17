import express from 'express';
import {
  createChat,
  getChats,
  getChat,
  sendMessage,
  renameChat,
  deleteChat,
} from '../controllers/chatController.js';
import { identifyRequest } from '../middlewares/identityMiddleware.js';

const router = express.Router();

router.use(identifyRequest);

router.post('/', createChat);
router.get('/', getChats);
router.get('/:conversationId', getChat);
router.post('/:conversationId/messages', sendMessage);
router.patch('/:conversationId/rename', renameChat);
router.delete('/:conversationId', deleteChat);

export default router;
