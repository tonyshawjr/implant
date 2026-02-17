/**
 * Asset Upload API Endpoint
 *
 * POST /api/assets/upload - Upload creative assets (images/videos)
 *
 * Request: multipart/form-data
 * - file: The file to upload
 * - organization_id: Organization ID
 * - tags: Optional comma-separated tags
 *
 * Response:
 * - asset: Created CreativeAsset record
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Constants
// =============================================================================

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// =============================================================================
// POST Handler - Upload Asset
// =============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
  // Check authentication
  if (!locals.user) {
    return json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      },
      { status: 401 }
    );
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const organizationId = formData.get('organization_id') as string | null;
    const tagsString = formData.get('tags') as string | null;

    // Validate required fields
    if (!file) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'No file provided'
          }
        },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_ORGANIZATION',
            message: 'Organization ID is required'
          }
        },
        { status: 400 }
      );
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null }
    });

    if (!organization) {
      return json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found'
          }
        },
        { status: 404 }
      );
    }

    // Validate file type
    const mimeType = file.type;
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `Invalid file type: ${mimeType}. Allowed types: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`
          }
        },
        { status: 400 }
      );
    }

    // Validate file size
    const fileSize = file.size;
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    if (fileSize > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size (${(fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
          }
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'bin';
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;

    // Store file locally (for development/production without @vercel/blob)
    // In production, consider using @vercel/blob, S3, or Cloudflare R2
    const uploadDir = join(process.cwd(), 'static', 'uploads', organizationId);
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, uniqueFilename);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    // Generate URL for the file
    const fileUrl = `/uploads/${organizationId}/${uniqueFilename}`;

    // Parse tags
    const tags = tagsString
      ? tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    // Determine asset type
    const assetType = isImage ? 'image' : 'video';

    // Create database record
    const asset = await prisma.creativeAsset.create({
      data: {
        organizationId,
        name: file.name,
        assetType,
        fileUrl,
        fileSize,
        mimeType,
        tags: tags.length > 0 ? tags : undefined,
        uploadedBy: locals.user.id
      }
    });

    // Log the upload
    await prisma.auditLog.create({
      data: {
        userId: locals.user.id,
        organizationId,
        action: 'asset_upload',
        entityType: 'creative_asset',
        entityId: asset.id,
        newValues: {
          fileName: file.name,
          fileSize,
          mimeType,
          assetType
        }
      }
    });

    return json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          organizationId: asset.organizationId,
          name: asset.name,
          type: asset.assetType,
          url: asset.fileUrl,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
          tags: asset.tags,
          uploadedBy: asset.uploadedBy,
          createdAt: asset.createdAt.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error uploading asset:', error);

    return json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
};

// =============================================================================
// Production Storage Notes
// =============================================================================
/**
 * For production deployment, consider using one of these storage solutions:
 *
 * 1. @vercel/blob (Vercel Blob Storage)
 *    npm install @vercel/blob
 *    import { put } from '@vercel/blob';
 *    const blob = await put(uniqueFilename, file, { access: 'public' });
 *    const fileUrl = blob.url;
 *
 * 2. AWS S3
 *    npm install @aws-sdk/client-s3
 *    Configure AWS credentials and use PutObjectCommand
 *
 * 3. Cloudflare R2
 *    Similar to S3 API, use @aws-sdk/client-s3 with R2 endpoint
 *
 * The local storage solution above works for development and small deployments
 * but is not recommended for production at scale.
 */
