import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber : {                          // user who is subscribing
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    channel : {                             // user who is being subscribed to
        type : Schema.Types.ObjectId,
        ref : "User"
    }
}, {timestamps : true});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);