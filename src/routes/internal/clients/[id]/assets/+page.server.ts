import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const { id } = params;

  // Fetch organization
  const organization = await prisma.organization.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true
    }
  });

  if (!organization) {
    throw error(404, 'Client not found');
  }

  // Fetch creative assets for this organization
  const assets = await prisma.creativeAsset.findMany({
    where: {
      organizationId: id
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      assetType: true,
      fileUrl: true,
      thumbnailUrl: true,
      fileSize: true,
      mimeType: true,
      tags: true,
      usageCount: true,
      createdAt: true,
      uploadedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug
    },
    assets: assets.map(asset => ({
      id: asset.id,
      organizationId: asset.organizationId,
      name: asset.name,
      assetType: asset.assetType,
      fileUrl: asset.fileUrl,
      thumbnailUrl: asset.thumbnailUrl,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      tags: asset.tags as string[] | null,
      usageCount: asset.usageCount,
      createdAt: asset.createdAt.toISOString(),
      uploadedBy: asset.uploadedByUser
        ? `${asset.uploadedByUser.firstName} ${asset.uploadedByUser.lastName}`
        : null
    }))
  };
};
