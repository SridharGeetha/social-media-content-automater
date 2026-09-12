import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkspace extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema: Schema<IWorkspace> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

export default Workspace;
