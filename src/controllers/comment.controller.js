import mongoose, {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {APIError} from "../utils/APIError.js"
import {APIResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)) {                     // mongoose.Types.ObjectId.isValid(videoId)
        throw new APIError(400, "Invalid Video id")
    }
    
    const video = await Video.findById(videoId)     // mongoose.model("Video").findById(videoId) => if not imported video model

    if(!video) {
        throw new APIError(404, "Video not found")
    }

    //await Video.exists({_id : videoId}) => just check existence without fetching the whole document

    const coPipeline = Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "commentOwner",
                pipeline : [
                    {
                        $project : {
                            username : 1,
                            avatar : 1
                        }
                    }
                ]
            }
        },
        {
            $unwind : "$commentOwner"
        }
    ])

    const pageNumber = Math.max(1, parseInt(page) || 1)
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit) || 10))

    const options = {
        page : pageNumber,
        limit : limitNumber
    }

    const comments = await(Comment.aggregatePaginate(coPipeline, options))

    return res.status(200).json(
        new APIResponse(200, comments, "Comments fetched Successfully")
    )

})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if(!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid Video id")
    }

    const videoExists = await Video.exists({_id : videoId})
    
    if(!videoExists) {
        throw new APIError(404, "Video not found")
    }

    if(!content || content.trim() === "") {
        throw new APIError(400, "Comment cannot be empty")
    }

    if(content.trim().length > 500) {
        throw new APIError(400, "Comment cannot exceed 500 characters")
    }

    const comment = await Comment.create({
        content : content.trim(),
        video : videoId,
        owner : req.user._id
    })

    if(!comment) {
        throw new APIError(500, "Failed to add comment")
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc : {
            commentCount : 1
        }
    })

    // For parallel execution, we can use Promise.all to execute them concurrently, which can improve performance.
    // However, in this case, since we need the comment to be created before we can update the video's comment count, we cannot run these two operations in parallel.
    // If we were to run them in parallel, we might end up with a situation where the video comment count is updated before the comment is actually created, leading to inconsistencies in our data. 
    // Therefore, it's important to execute these operations sequentially in this scenario.

    // await Promise.all([
    //     Comment.create({...}),
    //     Video.findByIdAndUpdate(videoId, { $inc : { commentCount : 1 } })
    // ])

    return res.status(201).json(
        new APIResponse(201, comment, "Comment added Successfully")
    )

})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const { content } = req.body
    
    const TrimmedContent = content?.trim()

    if(!isValidObjectId(commentId)) {
        throw new APIError(400, "Invalid Comment id")
    }

    const comment = await Comment.findById(commentId)

    if(!comment) {
        throw new APIError(404, "Comment not found")
    }

    if(comment.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You are not authorized to update this comment")
    }

    if(!content || TrimmedContent === "") {
        throw new APIError(400, "Comment cannot be empty")
    }

    if(TrimmedContent.length > 500) {
        throw new APIError(400, "Comment cannot exceed 500 characters")
    }

    // const updatedComment = await Comment.findByIdAndUpdate(commentId, {
    //     content : content.trim()
    // }, {
    //     new : true      // Return the updated document
    // })

    comment.content = TrimmedContent
    await comment.save()

    return res.status(200).json(
        new APIResponse(200, comment, "Comment Updated Successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!isValidObjectId(commentId)) {
        throw new APIError(400, "Invalid Comment id")
    }

    const comment = await Comment.findById(commentId)

    if(!comment) {
        throw new APIError(404, "Comment not found")
    }

    if(comment.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You are not authorized to delete this comment")
    }

    await comment.deleteOne()               // await comment.remove()

    await Video.findByIdAndUpdate(comment.video, {
        $inc : {
            commentCount : -1
        }
    })

    return res.status(200).json(
    new APIResponse(200, null, "Comment Deleted Successfully")
    )
})

export { getVideoComments, addComment, updateComment, deleteComment }