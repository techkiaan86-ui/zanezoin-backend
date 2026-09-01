import * as itemService from '../services/item.service.js';
import { sendResponse } from '../utils/response.js';
import prisma from '../config/db.js';
import cloudinary from '../config/cloudinary.js';

import { resolveTenantId } from '../utils/tenantResolver.js';

export const uploadItemImage = async (req, res, next) => {
  try {
    console.log('📸 [BACKEND_IMAGE_UPLOAD] Incoming file upload request...');
    if (!req.file) {
      console.warn('⚠️ [BACKEND_IMAGE_UPLOAD] No req.file found in request payload');
      return sendResponse(res, 400, 'No image file uploaded');
    }

    console.log('📁 [BACKEND_IMAGE_UPLOAD_FILE_INFO]', {
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)} KB`
    });

    const baseFolder = process.env.CLOUDINARY_FOLDER || 'zanezion';
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `${baseFolder}/inventory`, resource_type: 'image' },
          (error, result) => {
            if (error) {
              console.error('❌ [CLOUDINARY_UPLOAD_ERROR]', error);
              return reject(error);
            }
            console.log('✅ [CLOUDINARY_UPLOAD_SUCCESS] Cloudinary URL:', result?.secure_url);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const uploadResult = await uploadStream();
    console.log('🎉 [BACKEND_IMAGE_UPLOAD_COMPLETE] Returning URL to client:', uploadResult.secure_url);
    sendResponse(res, 200, 'Image uploaded successfully', { url: uploadResult.secure_url });
  } catch (error) {
    console.error('💥 [BACKEND_IMAGE_UPLOAD_FAILED]', error);
    next(error);
  }
};

export const createItem = async (req, res, next) => {
  try {
    const rawRole = typeof req.user?.role === 'string' ? req.user.role : (req.user?.role?.name || req.user?.roleName || '');
    const roleName = String(rawRole).toUpperCase();
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'SUPERADMIN' || req.user?.roleId === 1;

    let tenantIdToUse = isSuperAdmin ? (req.body.tenantId || req.user.tenantId || 1) : (req.user.tenantId || 1);

    if (req.body.clientId) {
      const targetClient = await prisma.client.findUnique({
        where: { id: Number(req.body.clientId) }
      });
      if (targetClient && targetClient.tenantId) {
        tenantIdToUse = targetClient.tenantId;
      }
    }

    const item = await itemService.createItem(req.body, req.user.id, tenantIdToUse);
    sendResponse(res, 201, 'Item created successfully', item);
  } catch (error) {
    next(error);
  }
};

export const getItems = async (req, res, next) => {
  try {
    const rawRole = typeof req.user?.role === 'string' ? req.user.role : (req.user?.role?.name || req.user?.roleName || '');
    const roleName = String(rawRole).toUpperCase();
    const userTenant = req.user?.tenantId ? Number(req.user.tenantId) : 1;
    const isHQStaff = [
      'SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'OPERATIONS', 'LOGISTICS', 'PROCUREMENT', 'CONCIERGE', 'STAFF', 'SECURITY'
    ].includes(roleName) || req.user?.roleId === 1 || req.user?.roleId === 2 || (userTenant === 1 && !['BUSINESS_CLIENT', 'CUSTOMER', 'SAAS_CLIENT', 'INDIVIDUAL_CLIENT'].includes(roleName));

    if (isHQStaff) {
      const tenantIdToFilter = req.query.tenantId ? Number(req.query.tenantId) : null;
      const result = await itemService.getItems(tenantIdToFilter, req.query);
      return sendResponse(res, 200, 'Items fetched successfully', result);
    }

    // For Business Clients, Customers, SaaS Tenants:
    let resolvedClientId = req.user.clientId;
    if (!resolvedClientId) {
      const clientRec = await prisma.client.findFirst({
        where: {
          OR: [
            { email: req.user.email },
            ...(req.user.tenantId ? [{ tenantId: req.user.tenantId }] : []),
            { companyName: req.user.name || '' }
          ]
        }
      });
      if (clientRec) resolvedClientId = clientRec.id;
    }

    const clientQuery = {
      ...req.query,
      resolvedClientId: resolvedClientId ? Number(resolvedClientId) : undefined,
      userTenantId: req.user.tenantId ? Number(req.user.tenantId) : undefined
    };

    const result = await itemService.getItems(null, clientQuery);
    return sendResponse(res, 200, 'Items fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getItemById = async (req, res, next) => {
  try {
    const item = await itemService.getItemById(Number(req.params.id), null);
    sendResponse(res, 200, 'Item fetched successfully', item);
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req, res, next) => {
  try {
    const tenantIdToFilter = resolveTenantId(req);

    const updatedItem = await itemService.updateItem(Number(req.params.id), req.body, tenantIdToFilter, req.user.id);
    sendResponse(res, 200, 'Item updated successfully', updatedItem);
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const tenantIdToFilter = resolveTenantId(req);

    await itemService.deleteItem(Number(req.params.id), tenantIdToFilter, req.user.id);
    sendResponse(res, 200, 'Item deleted successfully');
  } catch (error) {
    next(error);
  }
};
