const USER_ROLES = {
  ADMIN: 'Admin',
  USER: 'User',
};

const CAR_STATUS = {
  AVAILABLE: 'Available',
  BOOKED: 'Booked',
  MAINTENANCE: 'Maintenance',
};

const BOOKING_STATUS = {
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Active',
  AWAITING_RETURN: 'Awaiting Return',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

const PAYMENT_STATUS = {
  PENDING: 'Pending',
  SUCCESS: 'Success',
  FAILED: 'Failed',
};

const MESSAGE_STATUS = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

module.exports = {
  USER_ROLES,
  CAR_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  MESSAGE_STATUS,
};
