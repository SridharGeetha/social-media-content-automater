# Social Content Automation Scheduler

A modern Next.js application for automated social media content creation, workspace team collaboration, role-based approval pipelines, and Cloudinary media management.

---

## Phase 7 — Cloudinary Media Management Architecture

### Overview & Workflow
```
Create Post ──> Add Image / Video ──> Upload to Cloudinary ──> Cloudinary returns URL + Metadata ──> Save Media Metadata in MongoDB ──> Attach Media ──> Post
```

### Key Features
- **Cloudinary SDK Integration**: Server-isolated service (`src/lib/cloudinary.ts`) for secure image and video uploads.
- **Strict Secret Isolation**: `CLOUDINARY_API_SECRET` is never exposed in client bundles or public APIs.
- **Workspace Data Isolation**: Users can only upload, view, attach, and delete media belonging to their current workspace.
- **Validation**:
  - Image MIME types: JPG, PNG, GIF, WEBP (Max 10 MB).
  - Video MIME types: MP4, WebM, MOV, AVI (Max 50 MB).
- **Metadata Reference Storage**: Only Cloudinary metadata (`cloudinaryPublicId`, `secureUrl`, `format`, `dimensions`, `duration`, `fileSize`) is stored in MongoDB (`Media` collection). Raw file binaries are never stored in MongoDB.
- **Media Library UI**: Glassmorphism media browser with tab filtering (All, Images, Videos), video player previews, copy URL, upload progress, asset detail drawer, and deletion confirmation modal.
- **Post Media Attachment**: Interactive media selector & preview cards integrated directly inside Create and Edit post modals.

---

## Data Models

### `Media` Schema (`src/models/Media.ts`)
- `_id`: ObjectId
- `workspaceId`: ObjectId (ref: `Workspace`, indexed)
- `uploadedBy`: ObjectId (ref: `User`, indexed)
- `type`: `'image'` | `'video'`
- `cloudinaryPublicId`: string
- `cloudinaryUrl`: string
- `secureUrl`: string
- `format`: string
- `width`: number (optional)
- `height`: number (optional)
- `duration`: number (optional, for videos)
- `fileSize`: number
- `createdAt` & `updatedAt`: Date

### `Post` Schema (`src/models/Post.ts`)
- `workspaceId`: ObjectId (ref: `Workspace`, indexed)
- `createdBy`: ObjectId (ref: `User`, indexed)
- `content`: string
- `mediaIds`: ObjectId[] (ref: `Media`)
- `status`: `'DRAFT'` | `'SCHEDULED'` | `'QUEUED'` | `'PROCESSING'` | `'PUBLISHED'` | `'FAILED'`
- `scheduledAt`: Date (optional)
- `publishedAt`: Date (optional)

---

## API Endpoints

### Media APIs
- **`POST /api/media/upload`**: Validates MIME type and file size, uploads file stream to Cloudinary, stores metadata reference in MongoDB, and returns 201 Created.
- **`GET /api/media`**: Retrieves workspace-isolated media library assets, populating uploader info. Supports `?type=image|video`.
- **`DELETE /api/media/[id]`**: Removes asset from Cloudinary and deletes corresponding MongoDB `Media` document.

### Posts APIs
- **`POST /api/posts`**: Creates post with attached `mediaIds`. Enforces media workspace isolation.
- **`GET /api/posts`**: Fetches posts for user workspace with populated author and media attachment details.
- **`PATCH /api/posts/[id]`**: Updates post content, status, and attached `mediaIds` (with workspace validation).
- **`DELETE /api/posts/[id]`**: Deletes post.

---

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Configure credentials in `.env.local`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/social_media_automater
   AUTH_SECRET=your_auth_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

---

## Running the Application & Tests

- **Development Server**:
  ```bash
  npm run dev
  ```
- **Run Unit & Integration Tests**:
  ```bash
  npm test
  ```
