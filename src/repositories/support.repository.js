import prisma from '../config/db.js';

// Tickets
export const createTicket = async (data) => await prisma.supportTicket.create({ data });
export const findAllTickets = async (tenantId) => await prisma.supportTicket.findMany({ where: { ...(tenantId !== null && { tenantId }) }, orderBy: { createdAt: 'desc' } });
export const findTicketById = async (ticketId, tenantId) => {
  const isNum = !isNaN(Number(ticketId)) && String(ticketId).trim() !== '';
  const numId = isNum ? Number(ticketId) : null;
  const where = {
    OR: [
      { ticketId: String(ticketId) },
      ...(numId !== null ? [{ id: numId }] : [])
    ],
    ...(tenantId !== null && { tenantId })
  };
  return await prisma.supportTicket.findFirst({ where });
};
export const updateTicket = async (ticketId, tenantId, data) => {
  const existing = await findTicketById(ticketId, tenantId);
  if (!existing) return null;
  return await prisma.supportTicket.update({ where: { id: existing.id }, data });
};
export const deleteTicket = async (ticketId, tenantId) => {
  const existing = await findTicketById(ticketId, tenantId);
  if (!existing) return null;
  return await prisma.supportTicket.delete({ where: { id: existing.id } });
};

// Events
export const createEvent = async (data) => await prisma.event.create({ data });
export const findAllEvents = async (tenantId) => await prisma.event.findMany({
  where: { ...(tenantId !== null && { tenantId }) },
  include: {
    client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
    manager: { select: { id: true, name: true, email: true } }
  },
  orderBy: { createdAt: 'desc' }
});
export const findEventById = async (eventId, tenantId) => {
  const isNum = !isNaN(Number(eventId)) && String(eventId).trim() !== '';
  const numId = isNum ? Number(eventId) : null;
  const where = {
    OR: [
      { eventId: String(eventId) },
      ...(numId !== null ? [{ id: numId }] : [])
    ],
    ...(tenantId !== null && { tenantId })
  };
  return await prisma.event.findFirst({
    where,
    include: {
      client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
      manager: { select: { id: true, name: true, email: true } }
    }
  });
};
export const updateEvent = async (eventId, tenantId, data) => {
  const existing = await findEventById(eventId, tenantId);
  if (!existing) return null;
  return await prisma.event.update({ where: { id: existing.id }, data });
};
export const deleteEvent = async (eventId, tenantId) => {
  const existing = await findEventById(eventId, tenantId);
  if (!existing) return null;
  return await prisma.event.delete({ where: { id: existing.id } });
};

// Guest Requests
const mapGuestRequest = (req) => {
  if (!req) return req;
  const { metadata, ...rest } = req;
  const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
  return { ...rest, ...metadataObj, metadata: metadataObj };
};

export const createGuestRequest = async (data) => {
  const validDbKeys = ['requestId', 'guestName', 'room', 'requestType', 'status', 'tenantId'];
  const dbData = {};
  const metadataExt = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      if (validDbKeys.includes(key)) {
        dbData[key] = data[key];
      } else {
        metadataExt[key] = data[key];
      }
    }
  });

  const req = await prisma.guestRequest.create({ data: { ...dbData, metadata: metadataExt } });
  return mapGuestRequest(req);
};

export const findAllGuestRequests = async (tenantId) => {
  const reqs = await prisma.guestRequest.findMany({ where: { ...(tenantId !== null && { tenantId }) }, orderBy: { createdAt: 'desc' } });
  return reqs.map(mapGuestRequest);
};

export const findGuestRequestById = async (requestId, tenantId) => {
  const isNum = !isNaN(Number(requestId)) && String(requestId).trim() !== '';
  const numId = isNum ? Number(requestId) : null;
  const where = {
    OR: [
      { requestId: String(requestId) },
      ...(numId !== null ? [{ id: numId }] : [])
    ],
    ...(tenantId !== null && { tenantId })
  };
  const req = await prisma.guestRequest.findFirst({ where });
  return mapGuestRequest(req);
};

export const updateGuestRequest = async (requestId, tenantId, data) => {
  const existing = await findGuestRequestById(requestId, tenantId);
  if (!existing) return null;

  const validDbKeys = ['guestName', 'room', 'requestType', 'status', 'tenantId'];
  const dbData = {};
  const metadataExt = {};
  Object.keys(data).forEach(key => {
    if (validDbKeys.includes(key)) {
      dbData[key] = data[key];
    } else {
      metadataExt[key] = data[key];
    }
  });

  const finalMetadata = {
    ...(existing.metadata || {}),
    ...metadataExt
  };

  const req = await prisma.guestRequest.update({ where: { id: existing.id }, data: { ...dbData, metadata: finalMetadata } });
  return mapGuestRequest(req);
};

export const deleteGuestRequest = async (requestId, tenantId) => {
  const existing = await findGuestRequestById(requestId, tenantId);
  if (!existing) return null;
  return await prisma.guestRequest.delete({ where: { id: existing.id } });
};
