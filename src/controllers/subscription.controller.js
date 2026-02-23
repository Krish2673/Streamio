import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {APIError} from "../utils/APIError.js"
import {APIResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)) {
        throw new APIError(400, "Invalid Channel id")
    }

    const channel = await User.findById(channelId)
    if(!channel) {
        throw new APIError(404, "Channel not Found")
    }

    if(channelId === req.user._id.toString()) {
        throw new APIError(400, "Cannot Subscribe to your own channel")
    }

    const subscription = await Subscription.findOne({subscriber : req.user._id, channel : channelId})

    if(subscription) {
        await subscription.deleteOne()
        return res.status(200).json(
            new APIResponse(200, null , "Unsubscribed Successfully")
        )
    }

    else {
        await Subscription.create({subscriber : req.user._id, channel : channelId})
        return res.status(200).json(
            new APIResponse(200, null, "Subscribed Successfully")
        )
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)) {
        throw new APIError(400, "Invalid Channel id")
    }

    const channel = await User.findById(channelId)
    if(!channel) {
        throw new APIError(404, "Channel not Found")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "subscriber",
                foreignField : "_id",
                as : "subscriberDetails"
            }
        },
        {
            $unwind : "$subscriberDetails"      // flatten the array to get subscriber details as object
        },
        {
            $project : {
                username : "$subscriberDetails.username",
                email : "$subscriberDetails.email",
                avatar : "$subscriberDetails.avatar"
            }
        }
    ])

    return res.status(200).json(
        new APIResponse(200, subscribers, "Subscribers fetched Successfully")
    )
        
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)) {
        throw new APIError(400, "Invalid Subscriber id")
    }

    const user = await User.findById(subscriberId)
    if(!user) {
        throw new APIError(404, "User not found")
    }

    const subscriptions = await Subscription.find({subscriber : subscriberId}).populate("channel", "username email avatar")

    const channels = subscriptions.map(sub => sub.channel)

    return res.status(200).json(
        new APIResponse(200, channels, "Subscribed Channel fetched Successfully")
    )
})

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels }