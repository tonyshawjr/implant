/**
 * Asset Management API Endpoint
 *
 * DELETE /api/assets/[id] - Delete a creative asset
 * GET /api/assets/[id] - Get asset details
 *
 * Response:
 * - success: boolean
 * - data/error: Result data or error details
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { unlink } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// DELETE Handler - Delete Asset
// =============================================================================

export const DELETE: RequestHandler = async ({ params, locals }) => {
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

  const { id } = params;

  if (!id) {
    return json(
      {
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Asset ID is required'
        }
      },
      { status: 400 }
    );
  }

  try {
    // Find the asset
    const asset = await prisma.creativeAsset.findUnique({
      where: { id }
    });

    if (!asset) {
      return json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Asset not found'
          }
        },
        { status: 404 }
      );
    }

    // Try to delete the physical file (if stored locally)
    if (asset.fileUrl && asset.fileUrl.startsWith('/uploads/')) {
      try {
        const filePath = join(process.cwd(), 'static', asset.fileUrl);
        await unlink(filePath);
      } catch (fileError) {
        // Log but don't fail - file might already be deleted or stored externally
        console.warn('Could not delete physical file:', fileError);
      }
    }

    // Delete the database record (hard delete)
    await prisma.creativeAsset.delete({
      where: { id }
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: locals.user.id,
        organizationId: asset.organizationId,
        action: 'asset_delete',
        entityType: 'creative_asset',
        entityId: id,
        oldValues: {
          name: asset.name,
          fileUrl: asset.fileUrl,
          assetType: asset.assetType
        }
      }
    });

    return json({
      success: true,
      data: {
        message: 'Asset deleted successfully',
        deletedId: id
      }
    });
  } catch (error) {
    console.error('Error deleting asset:', error);

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
// GET Handler - Get Asset Details
// =============================================================================

export const GET: RequestHandler = async ({ params, locals }) => {
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

  const { id } = params;

  if (!id) {
    return json(
      {
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Asset ID is required'
        }
      },
      { status: 400 }
    );
  }

  try {
    const asset = await prisma.creativeAsset.findUnique({
      where: { id },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!asset) {
      return json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Asset not found'
          }
        },
        { status: 404 }
      );
    }

    return json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          organizationId: asset.organizationId,
          organization: asset.organization,
          name: asset.name,
          assetType: asset.assetType,
          fileUrl: asset.fileUrl,
          thumbnailUrl: asset.thumbnailUrl,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
          dimensions: asset.dimensions,
          durationSeconds: asset.durationSeconds,
          altText: asset.altText,
          tags: asset.tags,
          usageCount: asset.usageCount,
          isTemplate: asset.isTemplate,
          uploadedBy: asset.uploadedByUser
            ? {
                id: asset.uploadedByUser.id,
                name: `${asset.uploadedByUser.firstName} ${asset.uploadedByUser.lastName}`,
                email: asset.uploadedByUser.email
              }
            : null,
          createdAt: asset.createdAt.toISOString(),
          updatedAt: asset.updatedAt.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching asset:', error);

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
// PATCH Handler - Update Asset
// =============================================================================

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
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

  const { id } = params;

  if (!id) {
    return json(
      {
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Asset ID is required'
        }
      },
      { status: 400 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const { name, altText, tags } = body;

    // Find the asset
    const existingAsset = await prisma.creativeAsset.findUnique({
      where: { id }
    });

    if (!existingAsset) {
      return json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Asset not found'
          }
        },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (altText !== undefined) updateData.altText = altText;
    if (tags !== undefined) updateData.tags = tags;

    if (Object.keys(updateData).length === 0) {
      return json(
        {
          success: false,
          error: {
            code: 'NO_UPDATES',
            message: 'No update fields provided'
          }
        },
        { status: 400 }
      );
    }

    // Update the asset
    const updatedAsset = await prisma.creativeAsset.update({
      where: { id },
      data: updateData
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        userId: locals.user.id,
        organizationId: existingAsset.organizationId,
        action: 'asset_update',
        entityType: 'creative_asset',
        entityId: id,
        oldValues: {
          name: existingAsset.name,
          altText: existingAsset.altText,
          tags: existingAsset.tags
        },
        newValues: updateData as Record<string, string | string[] | undefined>
      }
    });

    return json({
      success: true,
      data: {
        asset: {
          id: updatedAsset.id,
          name: updatedAsset.name,
          altText: updatedAsset.altText,
          tags: updatedAsset.tags,
          updatedAt: updatedAsset.updatedAt.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error updating asset:', error);

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
