import mongoose, { Schema, Document, Model } from 'mongoose';

export type MediaType = 'image' | 'video';

export interface IMedia extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  type: MediaType;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  secureUrl: string;
  format?: string;
  width?: number;
  height?: number;
  duration?: number | null;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema: Schema<IMedia> = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    secureUrl: { type: String, required: true },
    format: { type: String },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number, default: null },
    fileSize: { type: Number, required: true },
  },
  { timestamps: true }
);

MediaSchema.index({ workspaceId: 1, createdAt: -1 });
MediaSchema.index({ workspaceId: 1, type: 1 });

const Media: Model<IMedia> = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);

export default Media;
