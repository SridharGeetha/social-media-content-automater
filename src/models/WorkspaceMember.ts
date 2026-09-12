import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'ADMIN' | 'MANAGER' | 'CREATOR';

export interface IWorkspaceMember extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMemberSchema: Schema<IWorkspaceMember> = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'CREATOR'],
      required: true,
      default: 'CREATOR',
    },
  },
  { timestamps: true }
);

// Prevent duplicate membership for the same user in a workspace
WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

const WorkspaceMember: Model<IWorkspaceMember> =
  mongoose.models.WorkspaceMember ||
  mongoose.model<IWorkspaceMember>('WorkspaceMember', WorkspaceMemberSchema);

export default WorkspaceMember;
