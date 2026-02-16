import express from "express";
import {
  commentPost,
  createPost,
  deletePost,
  dislikePost,
  getAllPosts,
  getPostsByUserId,
  likePost,
  sharePost,
  updatePost,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/createPost", protect, upload.single("postImage"), createPost);
router.post("/likePost", likePost);
router.post("/dislikePost", dislikePost);
router.post("/commentPost", commentPost);
router.post("/sharePost", sharePost);
router.get("/getPostsByUserId/:userId", getPostsByUserId);
router.get("/getAllPosts", getAllPosts);
router.put("/updatePost/:id", protect, upload.single("postImage"), updatePost);
router.delete("/deletePost/:postId", protect, deletePost);

export default router;
