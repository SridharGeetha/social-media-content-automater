# Media Management API Documentation

This document describes the API specifications for Phase 7 Media Management in the Social Content Automation Scheduler.

---

## Authorization & Workspace Isolation
All media API endpoints require an active user session (`auth()`) and workspace membership (`WorkspaceMember`).
- `workspaceId` and `uploadedBy` are derived exclusively on the server from the authenticated session. Client-provided `workspaceId` or `uploadedBy` fields are ignored to prevent cross-workspace security vulnerabilities.

---

## 1. Upload Media Asset

### `POST /api/media/upload`

Uploads an image or video file to Cloudinary and saves its metadata in MongoDB.

#### Request Header
```
Content-Type: multipart/form-data
```

#### Request Body
- `file`: (File, required) Binary image or video file.

#### Validation Rules
- **Image Formats**: `image/jpeg`, `image/png`, `image/gif`, `image/webp` (Max **10 MB**)
- **Video Formats**: `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo` (Max **50 MB**)

#### Success Response (`201 Created`)
```json
{
  "message": "Media uploaded successfully.",
  "media": {
    "id": "66e2c4f8...",
    "workspaceId": "66e2c3a1...",
    "uploadedBy": {
      "_id": "66e2c109...",
      "name": "Jane Doe",
      "email": "jane@company.com"
    },
    "type": "image",
    "cloudinaryPublicId": "workspaces/66e2c3a1.../sample_img",
    "cloudinaryUrl": "http://res.cloudinary.com/...",
    "secureUrl": "https://res.cloudinary.com/...",
    "format": "png",
    "width": 1200,
    "height": 630,
    "duration": null,
    "fileSize": 1048576,
    "createdAt": "2026-09-12T15:20:00.000Z",
    "updatedAt": "2026-09-12T15:20:00.000Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: File missing, unsupported format, or exceeds file size limit.
- `401 Unauthorized`: User is not authenticated.
- `403 Forbidden`: User does not belong to a workspace.
- `502 Bad Gateway`: Cloudinary service upload failure.

---

## 2. List Workspace Media Assets

### `GET /api/media`

Retrieves all media assets belonging to the user's current workspace.

#### Query Parameters
- `type` (optional): `'image'` | `'video'`

#### Success Response (`200 OK`)
```json
{
  "media": [
    {
      "id": "66e2c4f8...",
      "workspaceId": "66e2c3a1...",
      "uploadedBy": {
        "id": "66e2c109...",
        "name": "Jane Doe",
        "email": "jane@company.com"
      },
      "type": "image",
      "cloudinaryPublicId": "workspaces/66e2c3a1.../sample_img",
      "cloudinaryUrl": "http://res.cloudinary.com/...",
      "secureUrl": "https://res.cloudinary.com/...",
      "format": "png",
      "width": 1200,
      "height": 630,
      "fileSize": 1048576,
      "createdAt": "2026-09-12T15:20:00.000Z",
      "updatedAt": "2026-09-12T15:20:00.000Z"
    }
  ],
  "workspaceId": "66e2c3a1...",
  "currentRole": "ADMIN"
}
```

---

## 3. Delete Media Asset

### `DELETE /api/media/[id]`

Safely deletes a media asset from Cloudinary and deletes the corresponding MongoDB record.

#### Permissions
- `ADMIN` & `MANAGER`: Can delete any media asset in their workspace.
- `CREATOR`: Can only delete media assets they uploaded.

#### Success Response (`200 OK`)
```json
{
  "message": "Media asset deleted successfully from Cloudinary and database.",
  "id": "66e2c4f8..."
}
```

#### Error Responses
- `403 Forbidden`: Creator attempting to delete media uploaded by another user.
- `404 Not Found`: Media item not found or belongs to another workspace.
