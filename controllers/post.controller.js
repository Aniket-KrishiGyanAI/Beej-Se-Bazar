import { Post, Like, Dislike, Share, Comment } from "../models/post.model.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { uploadToS3 } from "../utils/s3Upload.js";

// create post
const createPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { caption } = req.body;

    let uploadedPostImage = null;
    if (req.body.postImage?.startsWith("data:")) {
      try {
        const base64Data = req.body.postImage.split(",")[1];
        const mimeType = req.body.postImage.split(";")[0].split(":")[1];

        const buffer = Buffer.from(base64Data, "base64");

        const mockFile = {
          buffer,
          originalname: `post_${Date.now()}`,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "postImage",
        };

        uploadedPostImage = await uploadToS3(mockFile, userId);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid base64 image data",
        });
      }
    } else if (req.file) {
      uploadedPostImage = await uploadToS3(req.file, userId);
    }

    const newPost = await Post.create({
      userId,
      caption: caption || null,
      postImage: uploadedPostImage,
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while creating post",
    });
  }
};

// update post
const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { caption } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this post",
      });
    }

    if (caption !== undefined) {
      post.caption = caption;
    }

    if (req.body.postImage?.startsWith("data:")) {
      const base64Data = req.body.postImage.split(",")[1];
      const mimeType = req.body.postImage.split(";")[0].split(":")[1];

      const buffer = Buffer.from(base64Data, "base64");

      const mockFile = {
        buffer,
        originalname: `post_${Date.now()}`,
        mimetype: mimeType,
        size: buffer.length,
        fieldname: "postImage",
      };

      const uploaded = await uploadToS3(mockFile, userId);

      // Delete old image from S3
      if (post.postImage?.key) {
        await deleteFromS3(post.postImage.key);
      }

      post.postImage = uploaded;
    } else if (req.file) {
      const uploaded = await uploadToS3(req.file, userId);

      // Delete old image from S3
      if (post.postImage?.key) {
        await deleteFromS3(post.postImage.key);
      }

      post.postImage = uploaded;
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Update Post Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating post",
    });
  }
};

// get posts by user id
const getPostsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ status: "error", message: "User ID is required" });
    }

    // Fetch posts with user's profile_image
    const posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName profileImage");

    res.status(200).json({ status: "success", data: posts });
  } catch (error) {
    console.error("Get Posts Error:", error.message);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

// get all posts
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName profileImage")
      .populate({
        path: "comments",
        populate: { path: "userId", select: "firstName lastName profileImage" },
      });

    // 🟨 Now, get likes, dislikes, and shares for all posts in one go
    const postIds = posts.map((p) => p._id);

    const [likes, dislikes, shares] = await Promise.all([
      Like.find({ postId: { $in: postIds } }).populate(
        "userId",
        "firstName lastName profileImage",
      ),
      Dislike.find({ postId: { $in: postIds } }).populate(
        "userId",
        "firstName lastName profileImage",
      ),
      Share.find({ postId: { $in: postIds } }).populate(
        "userId",
        "firstName lastName profileImage",
      ),
    ]);

    // 🟦 Group likes/dislikes/shares by postId
    const groupByPost = (arr) => {
      return arr.reduce((acc, item) => {
        const id = item.postId.toString();
        if (!acc[id]) acc[id] = [];
        acc[id].push({
          _id: item.userId?._id,
          name: `${item.userId?.firstName} ${item.userId?.lastName}`,
          avatar: item.userId?.profileImage || null,
        });
        return acc;
      }, {});
    };

    const likesMap = groupByPost(likes);
    const dislikesMap = groupByPost(dislikes);
    const sharesMap = groupByPost(shares);

    // 🟧 Format final response
    const formattedPosts = posts.map((post) => {
      const author = post.userId || {};
      return {
        _id: post._id,
        userId: author._id || null,
        user: `${author.firstName} ${author.lastName}`,
        avatar: author.profileImage || null,
        caption: post.caption,
        postImage: post.postImage,
        likes: likesMap[post._id] || [],
        dislikes: dislikesMap[post._id] || [],
        shares: sharesMap[post._id] || [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        comments: (post.comments || []).map((c) => {
          const commentAuthor = c.userId || {};
          return {
            _id: c._id,
            userId: commentAuthor._id || null,
            name: `${commentAuthor.firstName} ${commentAuthor.lastName}`,
            avatar: commentAuthor.profileImage || null,
            comment: c.comment,
            createdAt: c.createdAt,
          };
        }),
      };
    });

    return res.status(200).json({
      status: "success",
      count: formattedPosts.length,
      data: formattedPosts,
    });
  } catch (error) {
    console.error("❌ Get All Posts Error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error while fetching posts",
    });
  }
};

// comment post
const commentPost = async (req, res) => {
  const { userId, postId, comment } = req.body;
  if (!userId || !postId || !comment)
    return res
      .status(400)
      .json({ status: "error", message: "Required fields missing" });

  try {
    const newComment = new Comment({ userId, postId, comment });
    await newComment.save();

    await Post.findByIdAndUpdate(postId, {
      $push: { comments: newComment._id },
    });

    res.json({ status: "success", data: newComment });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// like post
const likePost = async (req, res) => {
  const { userId, postId } = req.body;
  if (!userId || !postId)
    return res
      .status(400)
      .json({ status: "error", message: "Required fields missing" });

  try {
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ status: "error", message: "Post not found" });

    // Check if user already liked
    const existingLike = await Like.findOne({ userId, postId });
    if (existingLike) {
      // Remove like
      await Like.findByIdAndDelete(existingLike._id);
      await Post.findByIdAndUpdate(postId, {
        $pull: { likes: existingLike._id },
      });
      return res.json({ status: "success", message: "Like removed" });
    }

    // Remove dislike if exists
    const existingDislike = await Dislike.findOne({ userId, postId });
    if (existingDislike) {
      await Dislike.findByIdAndDelete(existingDislike._id);
      await Post.findByIdAndUpdate(postId, {
        $pull: { dislikes: existingDislike._id },
      });
    }

    // Add like
    const like = new Like({ userId, postId });
    await like.save();
    await Post.findByIdAndUpdate(postId, { $push: { likes: like._id } });

    res.json({ status: "success", message: "Post liked", data: like });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// dislike post
const dislikePost = async (req, res) => {
  const { userId, postId } = req.body;
  if (!userId || !postId)
    return res
      .status(400)
      .json({ status: "error", message: "Required fields missing" });

  try {
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ status: "error", message: "Post not found" });

    // Check if user already disliked
    const existingDislike = await Dislike.findOne({ userId, postId });
    if (existingDislike) {
      // Remove dislike
      await Dislike.findByIdAndDelete(existingDislike._id);
      await Post.findByIdAndUpdate(postId, {
        $pull: { dislikes: existingDislike._id },
      });
      return res.json({ status: "success", message: "Dislike removed" });
    }

    // Remove like if exists
    const existingLike = await Like.findOne({ userId, postId });
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      await Post.findByIdAndUpdate(postId, {
        $pull: { likes: existingLike._id },
      });
    }

    // Add dislike
    const dislike = new Dislike({ userId, postId });
    await dislike.save();
    await Post.findByIdAndUpdate(postId, { $push: { dislikes: dislike._id } });

    res.json({ status: "success", message: "Post disliked", data: dislike });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// share post
const sharePost = async (req, res) => {
  const { userId, postId } = req.body;
  if (!userId || !postId)
    return res
      .status(400)
      .json({ status: "error", message: "Required fields missing" });

  try {
    const share = new Share({ userId, postId });
    await share.save();

    await Post.findByIdAndUpdate(postId, { $push: { shares: share._id } });

    res.json({ status: "success", data: share });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// delete post
const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this post",
      });
    }

    await Promise.all([
      Share.deleteMany({ postId }),
      Comment.deleteMany({ postId }),
      Like.deleteMany({ postId }),
    ]);

    if (post.postImage?.key) {
      console.log("Deleting S3 image:", post.postImage.key);
      await deleteFromS3(post.postImage.key);
    }

    await Post.findByIdAndDelete(postId);

    return res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete Post Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting post",
    });
  }
};

export {
  createPost,
  updatePost,
  getPostsByUserId,
  getAllPosts,
  commentPost,
  likePost,
  dislikePost,
  sharePost,
  deletePost,
};
