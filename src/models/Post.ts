import mongoose, { Schema, Document, Model } from 'mongoose';

export type PostStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'QUEUED' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';

const POST_STATUSES: PostStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED'];

export interface IPostPublishing {
  platform: 'LINKEDIN';
  externalPostId?: string;
  publishedAt?: Date;
  error?: string;
}

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  content: string;
  platform?: string;
  mediaIds: string[];
  status: PostStatus;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  publishing?: IPostPublishing;
  rejectionFeedback?: string | null;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema<IPost> = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true },
      platform: { type: String, default: 'LINKEDIN' },
    mediaIds: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
    status: {
      type: String,
      enum: POST_STATUSES,
      default: 'DRAFT',
      required: true,
      index: true,
    },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    publishing: {
      platform: { type: String, enum: ['LINKEDIN'] },
      externalPostId: { type: String },
      publishedAt: { type: Date },
      error: { type: String },
    },
    rejectionFeedback: { type: String, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PostSchema.index({ workspaceId: 1, status: 1 });
PostSchema.index({ workspaceId: 1, createdBy: 1 });

if (mongoose.models.Post) {
  delete mongoose.models.Post;
}

const Post: Model<IPost> = mongoose.model<IPost>('Post', PostSchema);

export default Post;
