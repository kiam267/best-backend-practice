import mongoose, { Schema } from "mongoose";

const scubscriptionSchema = new Schema(
     {
          subscriber: {
               type: Schema.Types.ObjectId,
               ref: "User",
          },
          channnel: {
               type: Schema.Types.ObjectId,
               ref: "User",
          },
     },
     {
          timestamps: true,
     }
);

export const Subscription = mongoose.model("Subscription", scubscriptionSchema);
