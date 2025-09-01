import express from 'express';
import { authenticate } from '../middlerware/auth.mjs';
import { getChat, sendMessage } from '../controllers/chatController.mjs';

const router = express.Router();


router.get('/:sender', authenticate, getChat);
router.post('/message', authenticate, sendMessage);

export default router;
