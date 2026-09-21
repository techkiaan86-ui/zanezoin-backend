import prisma from '../config/db.js';

const mapItem = (req) => {
  if (!req) return req;
  const { metadata, ...rest } = req;
  const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
  const cleanMetadata = { ...metadataObj };
  delete cleanMetadata.id;
  return {
    ...cleanMetadata,
    ...rest,
    id: rest.id,
    dbId: rest.id,
    itemId: rest.itemId || metadataObj.itemId || metadataObj.id,
    metadata: cleanMetadata
  };
};

export const createItem = async (data) => {
  const validDbKeys = ['itemId', 'name', 'category', 'price', 'status', 'tenantId'];
  const dbData = {};
  const metadataExt = {};
  Object.keys(data).forEach(key => {
    if (validDbKeys.includes(key)) {
      dbData[key] = data[key];
    } else if (key !== 'id' && key !== 'dbId') {
      metadataExt[key] = data[key];
    }
  });
  const item = await prisma.luxuryItem.create({ data: { ...dbData, metadata: metadataExt } });
  return mapItem(item);
};

export const findAllItems = async (tenantId) => {
  const items = await prisma.luxuryItem.findMany({ where: { ...(tenantId !== null && { tenantId }) }, orderBy: { createdAt: 'desc' } });
  return items.map(mapItem);
};

export const findItemById = async (itemId, tenantId) => {
  let item;
  const numId = Number(itemId);
  const isNumeric = !isNaN(numId) && String(numId) === String(itemId);

  if (tenantId === null) {
    if (isNumeric) {
      item = await prisma.luxuryItem.findFirst({ where: { OR: [{ id: numId }, { itemId: String(itemId) }] } });
    } else {
      item = await prisma.luxuryItem.findFirst({ where: { itemId: String(itemId) } });
    }
  } else {
    if (isNumeric) {
      item = await prisma.luxuryItem.findFirst({ where: { OR: [{ id: numId, tenantId }, { itemId: String(itemId), tenantId }] } });
    } else {
      item = await prisma.luxuryItem.findUnique({ where: { itemId_tenantId: { itemId: String(itemId), tenantId } } });
    }
  }
  return mapItem(item);
};

export const updateItem = async (itemId, tenantId, data) => {
  const existing = await findItemById(itemId, tenantId);
  if (!existing) return null;

  const validDbKeys = ['name', 'category', 'price', 'status', 'tenantId'];
  const dbData = {};
  const metadataExt = {};
  Object.keys(data).forEach(key => {
    if (validDbKeys.includes(key)) {
      dbData[key] = data[key];
    } else if (key !== 'id' && key !== 'dbId') {
      metadataExt[key] = data[key];
    }
  });

  const finalMetadata = {
    ...(existing.metadata || {}),
    ...metadataExt
  };
  delete finalMetadata.id;

  const targetTenantId = existing.tenantId || tenantId || 1;
  const targetItemId = existing.itemId || String(itemId);

  const updated = await prisma.luxuryItem.update({
    where: {
      itemId_tenantId: {
        itemId: targetItemId,
        tenantId: targetTenantId
      }
    },
    data: { ...dbData, metadata: finalMetadata }
  });
  return mapItem(updated);
};

export const deleteItem = async (itemId, tenantId) => {
  const existing = await findItemById(itemId, tenantId);
  if (!existing) return null;

  const targetTenantId = existing.tenantId || tenantId || 1;
  const targetItemId = existing.itemId || String(itemId);

  return await prisma.luxuryItem.delete({
    where: {
      itemId_tenantId: {
        itemId: targetItemId,
        tenantId: targetTenantId
      }
    }
  });
};
