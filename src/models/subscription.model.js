import mongoose, { Schema } from "mongoose";
import { User } from "./user.models";

const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId, // the one who is subscribing
    ref: "User",
  },
  channel: {
    type: Schema.Types.ObjectId, // the one whom subscriber is subscribing
    ref: "User",
  },
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
