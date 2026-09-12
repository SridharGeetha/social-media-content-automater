import mongoose, { Document, Model, Schema } from 'mongoose';

export type SocialPlatform = 'LINKEDIN';
export type SocialAccountStatus = 'CONNECTED' | 'DISCONNECTED';

export interface ISocialAccount extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  encryptedAccessToken: string;
  expiresAt: Date;
  connectedBy: mongoose.Types.ObjectId;
  status: SocialAccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SocialAccountSchema: Schema<ISocialAccount> = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    platform: { type: String, enum: ['LINKEDIN'], required: true },
    accountId: { type: String, required: true },
    accountName: { type: String, required: true },
    encryptedAccessToken: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    connectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['CONNECTED', 'DISCONNECTED'], required: true, default: 'CONNECTED' },
  },
  { timestamps: true }
);

SocialAccountSchema.index({ workspaceId: 1, platform: 1 }, { unique: true });

const SocialAccount: Model<ISocialAccount> =
  mongoose.models.SocialAccount || mongoose.model<ISocialAccount>('SocialAccount', SocialAccountSchema);

export default SocialAccount;