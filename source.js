import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    domain: {
      type: String,
      default: "",
      trim: true,
      maxlength: 255,
    },

    snippet: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    position: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

sourceSchema.index({
  conversation: 1,
  message: 1,
  position: 1,
});

const Source =
  mongoose.models.Source ||
  mongoose.model(
    "Source",
    sourceSchema
  );

export default Source;
