import {
  getConversationMessages,
} from "../controllers/conversation.controller.js";


router.get(
  "/:chatId/messages",
  protect,
  getConversationMessages
);
