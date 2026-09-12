import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from './WorkspaceMember';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export interface IInvitation extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  email: string;
  role: Exclude<UserRole, 'ADMIN'>;
  token: string;
  status: InvitationStatus;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

const InvitationSchema: Schema<IInvitation> = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: {
      type: String,
      enum: ['MANAGER', 'CREATOR'],
      required: true,
    },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'EXPIRED'],
      default: 'PENDING',
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const Invitation: Model<IInvitation> =
  mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema);

export default Invitation;
