import { mongoose } from "mongoose";
import { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //this is user(A) who is subscribing to user(B)
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // this is user(B) who is subscribed by user(A)
      ref: "User",
    },
  },
  { timestamps: true }
);
export const subscription = mongoose.model("subscription ", subscriptionSchema);
