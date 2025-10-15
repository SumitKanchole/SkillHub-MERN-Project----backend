import express from 'express';
import {
    createPost,
    getAllPosts,
    getPostById,
    getUserPosts,
    updatePost,
    deletePost
} from '../controller/post.controller.js';

const router = express.Router();

import { auth } from '../middleware/auth.js';

// Public routes
router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.get('/user/:userId', getUserPosts);

// Protected routes (require authentication)
router.post('/createpost/:id', createPost); // :id is the user ID
router.put('/update/:userId', updatePost);
router.delete('/delete/:userId', deletePost);

// Get current user's posts
router.get('/my/posts', auth, getUserPosts);

export default router;