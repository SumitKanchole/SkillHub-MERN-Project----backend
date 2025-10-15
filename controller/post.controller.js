import Post from '../models/post.model.js';
import User from '../models/user.model.js';

// Create a new post
export const createPost = async (req, res) => {
    try {
        const { topic, description, category, tags } = req.body;
        const { id: userId } = req.params; // Fix: Extract id from params correctly

        // Validate required fields
        if (!topic || !description) {
            return res.status(400).json({
                success: false,
                message: 'Topic and description are required'
            });
        }

        const newPost = new Post({
            topic,
            description,
            category: category || 'Other',
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()) : []),
            author: userId
        });

        const savedPost = await newPost.save();
        await savedPost.populate('author', 'name profileImage bio');

        // Return response structure that matches frontend expectations
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: savedPost // Frontend expects 'post' property
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(400).json({
            success: false,
            message: 'Error creating post',
            error: error.message
        });
    }
};

// Get all posts with pagination
export const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // Increased default limit
        const category = req.query.category;
        const search = req.query.search;

        const skip = (page - 1) * limit;
        
        let query = { isPublic: true };
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        if (search) {
            query.$or = [
                { topic: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const posts = await Post.find(query)
            .populate('author', 'name profileImage bio')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPosts = await Post.countDocuments(query);

        // Return array directly as frontend expects
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching posts',
            error: error.message
        });
    }
};

// Get single post by ID
export const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const post = await Post.findByIdAndUpdate(
            id, 
            { $inc: { views: 1 } }, 
            { new: true }
        ).populate('author', 'name profileImage bio')
         .populate('comments.user', 'name profileImage');

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        res.status(200).json({
            success: true,
            data: post
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching post',
            error: error.message
        });
    }
};

// Get user's posts
export const getUserPosts = async (req, res) => {
    try {
        const userId = req.params.userId || req.user?._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const posts = await Post.find({ author: userId })
            .populate('author', 'name profileImage bio')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPosts = await Post.countDocuments({ author: userId });

        res.status(200).json({
            success: true,
            data: posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user posts',
            error: error.message
        });
    }
};

// Update post
export const updatePost = async (req, res) => {
    try {
        const { userId } = req.params;
        const { topic, description, category, tags } = req.body;

        const post = await Post.findOne({ author: userId });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or unauthorized'
            });
        }

        // Update fields if provided
        if (topic !== undefined) post.topic = topic;
        if (description !== undefined) post.description = description;
        if (category !== undefined) post.category = category;
        if (tags !== undefined) {
            post.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()) : []);
        }

        await post.save();
        await post.populate('author', 'name profileImage bio');

        res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            data: post
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating post',
            error: error.message
        });
    }
};

// Delete post
export const deletePost = async (req, res) => {
    try {
        const { userId } = req.params;

        const post = await Post.findOneAndDelete({ author: userId });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or unauthorized'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting post',
            error: error.message
        });
    }
};