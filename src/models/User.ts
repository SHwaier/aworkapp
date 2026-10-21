import mongoose, { Schema, type Document, type Model } from "mongoose";

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  googleId?: string;
  role: UserRole;
  mustChangePassword: boolean;
  sessionVersion: number;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      // Never expose password hash in queries by default
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
      index: true,
    },
    // Set when an admin creates the account or resets the password;
    // the user must pick their own password before using the app.
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    // Embedded in every token; bumping it invalidates all existing sessions at once
    sessionVersion: {
      type: Number,
      default: 0,
    },
    // Set when an admin disables the account; disabled users cannot sign in
    disabledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // Security: strip __v and transform _id for JSON responses
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
